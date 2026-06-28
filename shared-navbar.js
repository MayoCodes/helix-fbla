/**
 * HELIX Shared Navbar Component
 * -------------------------------
 * Drop-in bottom nav + professional pet-switcher modal.
 * Include on any page after Firebase scripts.
 *
 * Usage:
 *   <script src="shared-navbar.js"></script>
 *   <script>
 *     helixNav.init({
 *       onPetSelect: (pid) => { … },   // optional override
 *       page: 'vet'                    // 'yeap' | 'vet' | etc.
 *     });
 *   </script>
 */
(function () {
  "use strict";

  /* ── CONFIG ── */
  const PET_TRAITS = {
    a: { name: "Cat", icon: catIcon(), color: "#ff9e80" },
    b: { name: "Dog", icon: dogIcon(), color: "#81d4fa" },
    c: { name: "Bird", icon: birdIcon(), color: "#a5d6a7" },
  };

  const NAV_PAGES = [
    {
      key: "home",
      label: "Home",
      href: "home.html",
      icon: homeIcon(),
    },
    {
      key: "dash",
      label: "Dashboard",
      href: "dash.html",
      icon: tasksIcon(),
    },
    {
      key: "shop",
      label: "Store",
      href: "shop.html",
      icon: chatIcon(),
    },
  ];

  const NAV_ORDER = ["home", "dash", "shop"];

  function openPageTutorial() {
    const tour =
      window.dashboardTour ||
      window.kitchenTour ||
      window.vetTour ||
      window.parkTour ||
      window.yeapTour;
    if (tour) {
      if (typeof tour.forceStart === "function") tour.forceStart();
      else if (typeof tour.forceOpen === "function") tour.forceOpen();
    }
  }

  /* ── STATE ── */
  let db = null,
    auth = null,
    currentUser = null;
  let userPets = {},
    currentPetId = null;
  let pageKey = "other";
  let onPetSelectCb = null;
  let modalOpen = false;
  let newPetType = null;

  /* ═══════════════════════════════════════
     ICONS (SVG strings)
     ═══════════════════════════════════════ */
  function homeIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  }
  function chatIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  }
  function tasksIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
  }
  function infoIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }
  function addIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  }
  function chevronRight() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  }
  function closeX() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  }

  /* ── Pet type icons: Font Awesome 6 (pro, guaranteed CDN) ── */
  function loadIcons() {
    if (document.getElementById("fa-css")) return;
    const link = document.createElement("link");
    link.id = "fa-css";
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    document.head.appendChild(link);
  }

  function catIcon() {
    return `<i class="fa-solid fa-cat" style="font-size:22px;color:#00acc1;"></i>`;
  }
  function dogIcon() {
    return `<i class="fa-solid fa-paw" style="font-size:22px;color:#00acc1;"></i>`;
  }
  function birdIcon() {
    return `<i class="fa-solid fa-crow" style="font-size:22px;color:#00acc1;"></i>`;
  }

  /* ═══════════════════════════════════════
     STYLES
     ═══════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById("helix-shared-nav-styles")) return;
    const s = document.createElement("style");
    s.id = "helix-shared-nav-styles";
    s.textContent = `
      /* ── Bottom Nav ── */
      #helix-bottom-nav {
        position: fixed;
        bottom: 22px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 900;
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(255,255,255,0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 26px;
        padding: 8px 14px;
        border: 1px solid rgba(0,210,255,0.15);
        box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.4) inset;
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        transition: transform .3s cubic-bezier(.23,1,.32,1), box-shadow .3s;
      }
      #helix-bottom-nav.hidden { transform: translateX(-50%) translateY(120px); }

      .hn-btn {
        display: flex; flex-direction: column; align-items: center; gap: 3px;
        padding: 8px 14px; border-radius: 16px; cursor: pointer;
        transition: all .2s ease; color: #94a3b8; background: transparent; border: none;
        text-decoration: none; position: relative;
      }
      .hn-btn:hover { background: rgba(0,210,255,0.08); color: #00bcd4; }
      .hn-btn.active { background: rgba(0,210,255,0.12); color: #00acc1; }
      .hn-btn svg { width: 20px; height: 20px; }
      .hn-btn span { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }

      .hn-hub {
        position: relative; width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, #e0f7fa, #b2ebf2); border: 2px solid #00bcd4;
        display: flex; align-items: center; justify-content: center; margin: 0 8px;
        box-shadow: 0 0 20px rgba(0,188,212,0.25); cursor: pointer; overflow: hidden;
        transition: transform .3s ease, box-shadow .3s ease; z-index: 901;
      }
      .hn-hub:hover { transform: scale(1.08); box-shadow: 0 0 30px rgba(0,188,212,0.4); }
      .hn-hub .hn-hub-avatar {
        width: 44px; height: 44px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.6rem; background: #fff; color: #00acc1;
      }
      .hn-hub .hn-hub-avatar svg { width: 26px; height: 26px; }
      .hn-hub .hn-hub-ring {
        position: absolute; inset: -5px; border-radius: 50%;
        border: 1.5px solid transparent; transition: border-color .3s;
        pointer-events: none;
      }
      .hn-hub.active .hn-hub-ring {
        border-color: rgba(0,188,212,0.5);
        animation: hnHubPulse 2s ease-in-out infinite;
      }
      @keyframes hnHubPulse {
        0%,100%{ box-shadow: 0 0 0 0 rgba(0,188,212,0.3); }
        50%{ box-shadow: 0 0 0 8px rgba(0,188,212,0); }
      }

      /* ── Pet Switcher Modal ── */
      #hn-pet-modal {
        position: fixed; inset: 0; z-index: 1000;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none;
        transition: opacity .35s cubic-bezier(.23,1,.32,1);
      }
      #hn-pet-modal.open { opacity: 1; pointer-events: auto; }
      #hn-pet-modal .hn-backdrop {
        position: absolute; inset: 0; background: rgba(5,11,11,0.72);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      }
      #hn-pet-modal .hn-modal-card {
        position: relative; z-index: 2;
        background: rgba(255,255,255,0.97);
        border-radius: 28px; padding: 32px;
        width: min(520px, calc(100vw - 40px));
        max-height: calc(100vh - 80px); overflow-y: auto;
        box-shadow: 0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.6) inset;
        transform: translateY(20px) scale(.96);
        transition: transform .4s cubic-bezier(.23,1,.32,1);
        scrollbar-width: thin;
      }
      #hn-pet-modal.open .hn-modal-card { transform: translateY(0) scale(1); }

      .hn-modal-header {
        display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;
      }
      .hn-modal-header h2 { font-size: 1.35rem; font-weight: 800; color: #0d2a2a; margin: 0; letter-spacing: -0.02em; }
      .hn-modal-header p { font-size: 0.82rem; color: #94a3b8; margin: 4px 0 0; font-weight: 500; }
      .hn-modal-close {
        width: 36px; height: 36px; border-radius: 50%; border: none;
        background: rgba(0,0,0,0.05); color: #64748b; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all .2s; flex-shrink: 0; margin-left: 12px;
      }
      .hn-modal-close:hover { background: rgba(0,0,0,0.1); color: #334155; transform: rotate(90deg); }

      .hn-pet-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 14px;
      }
      .hn-pet-card {
        position: relative; cursor: pointer;
        background: #fff; border: 2px solid #e2e8f0; border-radius: 20px;
        padding: 18px 12px 14px; text-align: center;
        transition: all .25s cubic-bezier(.23,1,.32,1);
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }
      .hn-pet-card:hover {
        transform: translateY(-4px);
        border-color: rgba(0,210,255,0.4);
        box-shadow: 0 12px 28px rgba(0,0,0,0.1);
      }
      .hn-pet-card.active {
        border-color: #00bcd4;
        box-shadow: 0 0 0 3px rgba(0,188,212,0.12), 0 12px 28px rgba(0,0,0,0.1);
      }
      .hn-pet-card .hn-pet-emoji {
        width: 56px; height: 56px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 10px;
        background: linear-gradient(135deg, #e0f7fa, #b2ebf2);
        border: 2px solid rgba(0,188,212,0.15);
        transition: all .25s;
      }
      .hn-pet-card .hn-pet-emoji svg,
      .hn-pet-card .hn-pet-emoji i {
        font-size: 26px;
        color: #00acc1;
      }
      .hn-pet-card.active .hn-pet-emoji {
        border-color: #00bcd4;
        box-shadow: 0 0 16px rgba(0,188,212,0.25);
        transform: scale(1.05);
      }
      .hn-pet-card .hn-pet-name { font-size: 0.92rem; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
      .hn-pet-card .hn-pet-meta { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
      .hn-pet-card .hn-pet-badge {
        position: absolute; top: 10px; right: 10px;
        width: 20px; height: 20px; border-radius: 50%;
        background: #00bcd4; color: #fff; font-size: 11px; font-weight: 800;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transform: scale(0); transition: all .3s cubic-bezier(.34,1.56,.64,1);
      }
      .hn-pet-card.active .hn-pet-badge { opacity: 1; transform: scale(1); }

      .hn-empty-state {
        text-align: center; padding: 40px 20px; color: #94a3b8;
      }
      .hn-empty-state .hn-empty-emoji { font-size: 3rem; margin-bottom: 12px; display: block; }
      .hn-empty-state h3 { font-size: 1.1rem; color: #475569; margin-bottom: 6px; }
      .hn-empty-state p { font-size: 0.85rem; margin-bottom: 18px; }
      .hn-empty-state .hn-add-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 10px 20px; border-radius: 12px; border: none;
        background: #00bcd4; color: #fff; font-size: 0.85rem; font-weight: 700;
        cursor: pointer; transition: all .2s; text-decoration: none;
      }
      .hn-empty-state .hn-add-btn:hover { background: #00acc1; transform: translateY(-1px); }

      .hn-add-view { display: none; }
      .hn-add-view.open { display: block; }
      .hn-pet-view.hidden { display: none; }
      .hn-type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
      .hn-type-option {
        border: 2px solid #e2e8f0; border-radius: 18px; background: #fff;
        padding: 18px 8px; cursor: pointer; text-align: center; color: #64748b;
        font: 700 .78rem "Inter", system-ui, sans-serif; transition: all .2s;
      }
      .hn-type-option i { display: block; margin-bottom: 9px; font-size: 28px !important; }
      .hn-type-option:hover, .hn-type-option.selected {
        border-color: #00bcd4; color: #008fa5; background: rgba(0,188,212,.06);
        box-shadow: 0 0 0 3px rgba(0,188,212,.1);
      }
      .hn-pet-name-input {
        width: 100%; border: 2px solid #e2e8f0; border-radius: 14px; padding: 13px 15px;
        outline: none; font: 600 .9rem "Inter", system-ui, sans-serif; color: #1e293b;
      }
      .hn-pet-name-input:focus { border-color: #00bcd4; box-shadow: 0 0 0 3px rgba(0,188,212,.1); }
      .hn-create-error { min-height: 18px; margin: 7px 2px 4px; color: #e04f5f; font: 600 .72rem "Inter", sans-serif; }
      .hn-create-pet-btn {
        width: 100%; border: 0; border-radius: 14px; padding: 13px; cursor: pointer;
        background: #00bcd4; color: #fff; font: 800 .85rem "Inter", sans-serif; transition: all .2s;
      }
      .hn-create-pet-btn:hover { background: #00acc1; transform: translateY(-1px); }
      .hn-create-pet-btn:disabled { opacity: .55; cursor: wait; transform: none; }
      .hn-back-link {
        border: 0; background: none; color: #00acc1; cursor: pointer; padding: 0 0 16px;
        font: 700 .78rem "Inter", sans-serif;
      }

            .hn-add-pet {
              border: 2px dashed #00bcd4 !important;
              background: rgba(0, 188, 212, 0.04) !important;
              cursor: pointer;
              transition: all .25s cubic-bezier(.23,1,.32,1);
            }
            .hn-add-pet:hover {
              transform: translateY(-4px);
              border-color: #00acc1 !important;
              background: rgba(0, 188, 212, 0.08) !important;
              box-shadow: 0 8px 24px rgba(0, 188, 212, 0.15);
            }
            .hn-add-pet .hn-pet-emoji {
              border: 2px dashed #00bcd4 !important;
              background: linear-gradient(135deg, #e0f7fa, #b2ebf2) !important;
              color: #00bcd4;
            }

      @media (max-width: 480px) {
.hn-pet-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
#hn-pet-modal .hn-modal-card { padding: 22px; border-radius: 22px; }
.hn-btn { padding: 6px 10px; }
.hn-btn span { font-size: 0.52rem; }
}

.hn-tutorial {
color: #7c9af7 !important;
}
.hn-tutorial:hover {
background: rgba(124,154,247,0.1) !important;
color: #6366f1 !important;
}
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════
     DOM INJECTION
     ═══════════════════════════════════════ */
  function injectDOM() {
    if (document.getElementById("helix-bottom-nav")) return;

    /* -- Bottom Nav -- */
    const nav = document.createElement("div");
    nav.id = "helix-bottom-nav";
    const navItems = NAV_PAGES.map(
      (p) =>
        `<a class="hn-btn ${isActive(p.key)}" href="${p.href}" data-key="${p.key}">
              ${p.icon}<span>${p.label}</span>
            </a>`,
    );
    /* Order: Home, Dashboard | Hub | Store, Tutorial */
    const homeDash = NAV_ORDER.slice(0, 2)
      .map((key) => navItems.find((_, i) => NAV_PAGES[i].key === key))
      .join("");
    const store = navItems.find((_, i) => NAV_PAGES[i].key === "shop");
    nav.innerHTML = `
          ${homeDash}
          <div class="hn-hub" id="hnHub" title="Switch Pet">
            <div class="hn-hub-ring"></div>
            <div class="hn-hub-avatar" id="hnHubAvatar">🐾</div>
          </div>
          ${store}
          <button class="hn-btn hn-tutorial" id="hnTutorial" title="Tutorial">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>Tutorial</span>
          </button>
        `;
    document.body.appendChild(nav);

    nav.querySelector("#hnHub").addEventListener("click", openModal);
    nav
      .querySelector("#hnTutorial")
      .addEventListener("click", openPageTutorial);

    /* -- Modal -- */
    const modal = document.createElement("div");
    modal.id = "hn-pet-modal";
    modal.innerHTML = `
      <div class="hn-backdrop" id="hnBackdrop"></div>
      <div class="hn-modal-card">
        <div class="hn-pet-view" id="hnPetView">
          <div class="hn-modal-header">
            <div>
              <h2>Your Pets</h2>
              <p>Select a pet to switch</p>
            </div>
            <button class="hn-modal-close" id="hnModalClose" aria-label="Close">
              ${closeX()}
            </button>
          </div>
          <div class="hn-pet-grid" id="hnPetGrid"></div>
        </div>
        <div class="hn-add-view" id="hnAddView">
          <button class="hn-back-link" id="hnAddBack">← Back to pets</button>
          <div class="hn-modal-header">
            <div><h2>Choose Your New Pet!</h2><p>Pick a companion and give them a name</p></div>
            <button class="hn-modal-close" id="hnAddClose" aria-label="Close">${closeX()}</button>
          </div>
          <div class="hn-type-grid" id="hnTypeGrid">
            <button class="hn-type-option" data-type="a">${catIcon()}Cat</button>
            <button class="hn-type-option" data-type="b">${dogIcon()}Dog</button>
            <button class="hn-type-option" data-type="c">${birdIcon()}Bird</button>
          </div>
          <input class="hn-pet-name-input" id="hnNewPetName" maxlength="20" placeholder="Name your pet…" />
          <div class="hn-create-error" id="hnCreateError"></div>
          <button class="hn-create-pet-btn" id="hnCreatePet">Start Your Journey!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#hnBackdrop").addEventListener("click", closeModal);
    modal.querySelector("#hnModalClose").addEventListener("click", closeModal);
    modal.querySelector("#hnAddClose").addEventListener("click", closeModal);
    modal.querySelector("#hnAddBack").addEventListener("click", showPetView);
    modal.querySelector("#hnTypeGrid").addEventListener("click", (e) => {
      const option = e.target.closest(".hn-type-option");
      if (!option) return;
      newPetType = option.dataset.type;
      modal.querySelectorAll(".hn-type-option").forEach((el) =>
        el.classList.toggle("selected", el === option),
      );
      modal.querySelector("#hnCreateError").textContent = "";
    });
    modal.querySelector("#hnCreatePet").addEventListener("click", createPet);
    modal.querySelector("#hnNewPetName").addEventListener("keydown", (e) => {
      if (e.key === "Enter") createPet();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  function isActive(key) {
    const map = {
      home: ["home.html", "index.html", "carepage.html", "teste.html"],
      kitchen: ["kitchen.html"],
      park: ["park.html"],
      vet: ["vet.html"],
      shop: ["shop.html"],
      dash: ["dash.html"],
    };
    const current = window.location.pathname.split("/").pop() || "index.html";
    return map[key]?.includes(current) ? "active" : "";
  }

  /* ═══════════════════════════════════════
     FIREBASE & DATA
     ═══════════════════════════════════════ */
  async function ensureAuth() {
    if (auth && currentUser) return;

    /* Wait up to 10 seconds for Firebase to become available.
         This handles ES module scripts that load asynchronously. */
    const start = Date.now();
    const timeout = 10000;
    while (Date.now() - start < timeout) {
      try {
        /* Approach 1: Global firebase compat (firebase-app-compat.js) */
        if (typeof firebase !== "undefined" && firebase.auth) {
          auth = firebase.auth();
          db = firebase.firestore();
          currentUser = auth.currentUser;
          if (!currentUser) {
            await new Promise((resolve) => {
              const unsub = auth.onAuthStateChanged((u) => {
                currentUser = u;
                unsub();
                resolve();
              });
            });
          }
          return;
        }

        /* Approach 2: ES modules exposed on window (e.g. dash.html exposes window._auth + window._db) */
        if (window._auth) {
          auth = window._auth;
          /* If _db isn't exposed, try to derive it from auth.app */
          if (window._db) {
            db = window._db;
          } else if (auth.app) {
            try {
              const { getFirestore } =
                await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
              db = getFirestore(auth.app);
              window._db = db;
            } catch (e) {
              console.warn("[helix-nav] Could not derive db from auth.app:", e);
            }
          }
          if (db) {
            currentUser = auth.currentUser;
            if (!currentUser) {
              await new Promise((resolve) => {
                const unsub = auth.onAuthStateChanged((u) => {
                  currentUser = u;
                  unsub();
                  resolve();
                });
              });
            }
            return;
          }
        }
      } catch (e) {
        console.warn("[helix-nav] Firebase setup error:", e);
      }
      /* Wait 200ms before next check */
      await new Promise((r) => setTimeout(r, 200));
    }
    console.warn("[helix-nav] Firebase not available after timeout");
  }

  async function loadPets() {
    await ensureAuth();
    if (!currentUser || !db) return;
    try {
      const snap = await db
        .collection("users")
        .doc(currentUser.uid)
        .collection("pets")
        .get();
      userPets = {};
      snap.forEach((doc) => (userPets[doc.id] = doc.data()));
      const userDoc = await db.collection("users").doc(currentUser.uid).get();
      currentPetId = userDoc.exists ? userDoc.data()?.currentPetId : null;
      if (!currentPetId || !userPets[currentPetId]) {
        currentPetId = Object.keys(userPets)[0] || null;
      }
      updateHubAvatar();
    } catch (e) {
      console.error("[helix-nav] loadPets error:", e);
    }
  }

  async function saveCurrentPet(pid) {
    if (!currentUser || !db) return;
    try {
      await db
        .collection("users")
        .doc(currentUser.uid)
        .set({ currentPetId: pid }, { merge: true });
    } catch (e) {
      console.error("[helix-nav] saveCurrentPet error:", e);
    }
  }

  function updateHubAvatar() {
    const el = document.getElementById("hnHubAvatar");
    if (!el) return;
    const pet = currentPetId ? userPets[currentPetId] : null;
    const traits = pet ? PET_TRAITS[pet.type] : null;
    el.innerHTML = traits?.icon || "🐾";
  }

  /* ═══════════════════════════════════════
     MODAL
     ═══════════════════════════════════════ */
  function openModal() {
    modalOpen = true;
    renderModal();
    document.getElementById("hn-pet-modal").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modalOpen = false;
    document.getElementById("hn-pet-modal").classList.remove("open");
    document.body.style.overflow = "";
  }

  function showAddPetView() {
    newPetType = null;
    document.getElementById("hnPetView").classList.add("hidden");
    document.getElementById("hnAddView").classList.add("open");
    document.querySelectorAll(".hn-type-option").forEach((el) => el.classList.remove("selected"));
    document.getElementById("hnNewPetName").value = "";
    document.getElementById("hnCreateError").textContent = "";
    setTimeout(() => document.getElementById("hnNewPetName").focus(), 50);
  }

  function showPetView() {
    document.getElementById("hnAddView").classList.remove("open");
    document.getElementById("hnPetView").classList.remove("hidden");
    renderModal();
  }

  function renderModal() {
    const grid = document.getElementById("hnPetGrid");
    if (!grid) return;
    const ids = Object.keys(userPets);
    if (ids.length === 0) {
      grid.innerHTML = `
        <div class="hn-empty-state" style="grid-column: 1 / -1;">
          <span class="hn-empty-emoji">🐾</span>
          <h3>No pets yet</h3>
          <p>Adopt your first companion to get started.</p>
          <button class="hn-add-btn" id="hnEmptyAdd">${addIcon()} Adopt a Pet</button>
        </div>
      `;
      grid.querySelector("#hnEmptyAdd").addEventListener("click", showAddPetView);
      return;
    }
    grid.innerHTML = ids
      .map((pid) => {
        const pet = userPets[pid];
        const traits = PET_TRAITS[pet.type] || { icon: "🐾", color: "#ccc" };
        const active = pid === currentPetId;
        const level = pet.level || 1;
        return `
            <div class="hn-pet-card ${active ? "active" : ""}" data-pid="${pid}">
              <div class="hn-pet-badge">✓</div>
              <div class="hn-pet-emoji" style="background: linear-gradient(135deg, ${traits.color}22, ${traits.color}44); border-color: ${traits.color}66;">
                ${traits.icon}
              </div>
              <div class="hn-pet-name">${escapeHtml(pet.name || "Pet")}</div>
              <div class="hn-pet-meta">Lv. ${level} · ${traits.name}</div>
            </div>
          `;
      })
      .join("");

    // Add the + button to add a new pet
    const addCard = document.createElement("div");
    addCard.className = "hn-pet-card hn-add-pet";
    addCard.innerHTML = `
          <div class="hn-pet-emoji" style="background: linear-gradient(135deg, #e0f7fa, #b2ebf2); border: 2px dashed #00bcd4;">
            ${addIcon()}
          </div>
          <div class="hn-pet-name" style="color: #00bcd4;">Add Pet</div>
          <div class="hn-pet-meta">Create new</div>
        `;
    addCard.addEventListener("click", showAddPetView);
    grid.appendChild(addCard);

    grid.querySelectorAll(".hn-pet-card:not(.hn-add-pet)").forEach((card) => {
      card.addEventListener("click", () => {
        const pid = card.dataset.pid;
        if (pid === currentPetId) {
          closeModal();
          return;
        }
        selectPet(pid);
      });
    });
  }

  async function createPet() {
    const nameInput = document.getElementById("hnNewPetName");
    const errorEl = document.getElementById("hnCreateError");
    const button = document.getElementById("hnCreatePet");
    const name = nameInput.value.trim();
    if (!newPetType) {
      errorEl.textContent = "Please select a pet.";
      return;
    }
    if (!name) {
      errorEl.textContent = "Please enter a pet name.";
      nameInput.focus();
      return;
    }
    await ensureAuth();
    if (!currentUser || !db) {
      errorEl.textContent = "Please sign in before adding a pet.";
      return;
    }

    const now = Date.now();
    const pid = now.toString();
    const pet = {
      name,
      type: newPetType,
      age: "baby",
      level: 1,
      experience: 0,
      experienceToNextLevel: 100,
      health: 100,
      happiness: 100,
      fullness: 100,
      energy: 100,
      bond: 0,
      personality: newPetType === "a" ? "independent, curious, and quietly affectionate" : newPetType === "b" ? "loyal, playful, and eager to please" : "bright, social, and fond of mimicking sounds",
      tasksCompleted: {},
      aiTasks: [],
      usingAITasks: false,
      lastTaskReset: now,
      adoptionDate: now,
      lastUpdated: now,
    };

    button.disabled = true;
    button.textContent = "Creating…";
    errorEl.textContent = "";
    try {
      await db.collection("users").doc(currentUser.uid).collection("pets").doc(pid).set(pet);
      await db.collection("users").doc(currentUser.uid).set({ currentPetId: pid }, { merge: true });
      userPets[pid] = pet;
      currentPetId = pid;
      updateHubAvatar();
      closeModal();
      /* Reload so each page hydrates the newly created pet into its own cache. */
      window.location.reload();
    } catch (e) {
      console.error("[helix-nav] createPet error:", e);
      errorEl.textContent = "Could not create your pet. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Start Your Journey!";
    }
  }

  async function selectPet(pid) {
    currentPetId = pid;
    updateHubAvatar();
    await saveCurrentPet(pid);
    closeModal();
    if (typeof onPetSelectCb === "function") {
      onPetSelectCb(pid, userPets[pid]);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ═══════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════ */
  window.helixNav = {
    init(opts = {}) {
      pageKey = opts.page || "other";
      onPetSelectCb = opts.onPetSelect || null;
      loadIcons();
      injectStyles();
      injectDOM();
      loadPets();
      // Retry multiple times in case firebase modules initialize late
      setTimeout(loadPets, 500);
      setTimeout(loadPets, 1500);
      setTimeout(loadPets, 3000);
    },
    refresh() {
      loadPets();
    },
    get currentPetId() {
      return currentPetId;
    },
    get userPets() {
      return userPets;
    },
    openPetModal() {
      openModal();
    },
    closePetModal() {
      closeModal();
    },
  };
})();
