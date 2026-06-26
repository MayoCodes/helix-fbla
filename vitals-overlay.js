/**
 * HELIX Vitals Overlay
 * --------------------
 * Self-contained left card stack (profile + vitals rings + navigation menu).
 *
 * Usage:
 *   <script src="vitals-overlay.js"></script>
 *   <script>
 *     HelixVitals.init({
 *       page: 'kitchen',           // 'kitchen' | 'park' | 'vet' | 'shop' | 'yeap'
 *       petData: petData,          // reference to your petData object
 *       userData: userData,        // reference to your userData object
 *       currentUser: currentUser,  // firebase user (for displayName)
 *       onAlert: (type, msg) => {} // optional custom alert handler
 *     });
 *   </script>
 */
(function () {
  "use strict";

  let _petData = null;
  let _userData = null;
  let _currentUser = null;
  let _currentPage = "yeap";
  let _onAlert = null;

  /* ── Inject Styles ── */
  function injectStyles() {
    if (document.getElementById("helix-vitals-styles")) return;
    const s = document.createElement("style");
    s.id = "helix-vitals-styles";
    s.textContent = `
      /* ── LEFT CARD STACK ── */
      .hvs-left-card-stack {
        position: fixed;
        left: 24px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 100;
        width: 280px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      }
      .hvs-left-card-stack > * { pointer-events: auto; }

      .hvs-profile-mini-card {
        background: rgba(245, 245, 245, 0.96);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        flex-shrink: 0;
      }
      .hvs-pmc-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        background: linear-gradient(135deg, #26a69a, #2d7a7a);
      }
      .hvs-pmc-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .hvs-pmc-info { flex: 1; min-width: 0; }
      .hvs-pmc-name {
        font-family: "Inter", sans-serif;
        font-weight: 800;
        font-size: 0.95rem;
        color: #1a1a1a;
        letter-spacing: -0.3px;
      }
      .hvs-pmc-sub {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.72rem;
        color: #888;
        font-weight: 700;
        margin-top: 2px;
        font-family: "Inter", sans-serif;
      }
      .hvs-pmc-coins {
        font-family: "Inter", sans-serif;
        font-weight: 800;
        font-size: 0.9rem;
        color: #f4a020;
        flex-shrink: 0;
      }

      .hvs-vitals-card {
        background: rgba(245, 245, 245, 0.96);
        backdrop-filter: blur(20px);
        border-radius: 24px;
        padding: 18px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex-shrink: 0;
      }
      .hvs-vitals-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .hvs-vitals-name {
        font-family: "Inter", sans-serif;
        font-weight: 800;
        font-size: 1rem;
        color: #1a1a1a;
      }
      .hvs-vitals-menu-btn {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: none;
        background: rgba(0,0,0,0.05);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: background 0.2s;
      }
      .hvs-vitals-menu-btn:hover { background: rgba(0,0,0,0.1); }
      .hvs-vitals-sub {
        font-size: 0.6rem;
        font-weight: 800;
        color: #aaa;
        letter-spacing: 2px;
        font-family: "Inter", sans-serif;
      }
      .hvs-vitals-rings {
        position: relative;
        width: 180px;
        height: 180px;
        margin: 0 auto;
      }
      .hvs-vitals-rings svg { transform: rotate(-90deg); }
      .hvs-vitals-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 44px;
        height: 44px;
        background: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        color: #ff5a7e;
      }
      .hvs-vitals-center svg {
        width: 22px;
        height: 22px;
        transform: none;
      }
      .hvs-vitals-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 4px;
      }
      .hvs-vitals-footer-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #ff5a7e;
        font-family: "Inter", sans-serif;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .hvs-vitals-footer-label::before {
        content: "";
        width: 6px;
        height: 6px;
        background: #ff5a7e;
        border-radius: 50%;
        display: inline-block;
      }
      .hvs-vitals-footer-pct {
        font-family: "Inter", sans-serif;
        font-weight: 800;
        font-size: 0.85rem;
        color: #333;
      }
      .hvs-vitals-stats-row {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        padding-top: 10px;
        border-top: 1px solid rgba(0,0,0,0.06);
      }
      .hvs-vitals-stat {
        text-align: center;
        flex: 1;
      }
      .hvs-vitals-stat-val {
        font-family: "Inter", sans-serif;
        font-weight: 800;
        font-size: 0.85rem;
        color: #333;
      }
      .hvs-vitals-stat-lbl {
        font-size: 0.6rem;
        font-weight: 700;
        color: #aaa;
        margin-top: 2px;
        letter-spacing: 0.5px;
        font-family: "Inter", sans-serif;
      }

      .hvs-menu-card {
        background: rgba(245, 245, 245, 0.96);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .hvs-menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 14px;
        border: none;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: "Nunito", sans-serif;
        font-weight: 700;
        font-size: 0.85rem;
        color: #666;
        text-decoration: none;
        position: relative;
      }
      .hvs-menu-item:hover {
        background: rgba(0,0,0,0.04);
        color: #333;
      }
      .hvs-menu-item.active {
        background: rgba(255,90,126,0.1);
        color: #ff5a7e;
      }
      .hvs-menu-item.active .hvs-menu-item-icon { color: #ff5a7e; }
      .hvs-menu-item.active .hvs-menu-item-label { color: #ff5a7e; }
      .hvs-menu-item-icon {
        width: 20px;
        height: 20px;
        color: #999;
        flex-shrink: 0;
      }
      .hvs-menu-item-icon svg {
        width: 100%;
        height: 100%;
      }
      .hvs-menu-item-label {
        flex: 1;
        text-align: left;
        font-size: 0.85rem;
        font-weight: 700;
      }
      .hvs-expand-family-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 12px;
        margin-top: 4px;
        border-radius: 14px;
        border: none;
        background: linear-gradient(135deg, #26a69a, #2d7a7a);
        color: #fff;
        font-family: "Nunito", sans-serif;
        font-weight: 800;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(38,166,154,0.3);
      }
      .hvs-expand-family-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(38,166,154,0.4);
      }

      @media (max-width: 1024px) {
        .hvs-left-card-stack { width: 240px; }
      }
      @media (max-width: 768px) {
        .hvs-left-card-stack { display: none; }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── SVGs ── */
  function homeSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>';
  }
  function parkSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-8" /><path d="M12 14a4 4 0 0 1 4-4h4a4 4 0 0 0-4-4 4 4 0 0 0-4 4z" /><path d="M12 14a4 4 0 0 0-4-4H4a4 4 0 0 1 4-4 4 4 0 0 1 4 4z" /><path d="M12 6V2" /></svg>';
  }
  function vetSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>';
  }
  function storeSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
  }

  const PAGES = [
    { key: "kitchen", label: "Kitchen", href: "kitchen.html", svg: homeSvg },
    { key: "park", label: "Park", href: "park.html", svg: parkSvg },
    { key: "vet", label: "Vet", href: "vet.html", svg: vetSvg },
    { key: "shop", label: "Store", href: "shop.html", svg: storeSvg },
  ];

  /* ── Inject DOM ── */
  function injectDOM() {
    if (document.getElementById("hvs-root")) return;

    const stack = document.createElement("div");
    stack.id = "hvs-root";
    stack.className = "hvs-left-card-stack";
    stack.innerHTML = `
      <!-- Profile mini card -->
      <div class="hvs-profile-mini-card">
        <div class="hvs-pmc-avatar">
          <img src="https://i.pravatar.cc/150?img=12" alt="avatar" id="hvsAvatar" />
        </div>
        <div class="hvs-pmc-info">
          <div class="hvs-pmc-name" id="hvsPmcName">Trainer</div>
          <div class="hvs-pmc-sub">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f4a020" stroke="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
            </svg>
            <span id="hvsPmcSub">Lv. 1 Trainer</span>
          </div>
        </div>
        <div class="hvs-pmc-coins" id="hvsPmcCoins">$0</div>
      </div>

      <!-- Vitals card -->
      <div class="hvs-vitals-card">
        <div class="hvs-vitals-header">
          <div class="hvs-vitals-name" id="hvsVitalsName">Pet</div>
          <button class="hvs-vitals-menu-btn" onclick="(function(){var m=document.getElementById('hvsVitalsMsg');if(m)showAlert('info',m.textContent||'Vitals synced with your pet.')})()" title="Vitals info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
            </svg>
          </button>
        </div>
        <div class="hvs-vitals-sub" id="hvsVitalsSub">VITALS SYNC</div>
        <div class="hvs-vitals-rings">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="78" fill="none" stroke="#eee" stroke-width="10" stroke-linecap="round"/>
            <circle id="hvsRingHp" cx="90" cy="90" r="78" fill="none" stroke="#ff5a7e" stroke-width="10" stroke-linecap="round" stroke-dasharray="490" stroke-dashoffset="490" style="transition: stroke-dashoffset 0.6s ease"/>
            <circle cx="90" cy="90" r="60" fill="none" stroke="#eee" stroke-width="10" stroke-linecap="round"/>
            <circle id="hvsRingFd" cx="90" cy="90" r="60" fill="none" stroke="#ffa726" stroke-width="10" stroke-linecap="round" stroke-dasharray="377" stroke-dashoffset="377" style="transition: stroke-dashoffset 0.6s ease"/>
            <circle cx="90" cy="90" r="42" fill="none" stroke="#eee" stroke-width="10" stroke-linecap="round"/>
            <circle id="hvsRingJoy" cx="90" cy="90" r="42" fill="none" stroke="#26a69a" stroke-width="10" stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="264" style="transition: stroke-dashoffset 0.6s ease"/>
          </svg>
          <div class="hvs-vitals-center">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
        </div>
        <div class="hvs-vitals-footer">
          <div class="hvs-vitals-footer-label">Health Care</div>
          <div class="hvs-vitals-footer-pct" id="hvsVitalsPct">95%</div>
        </div>
        <div class="hvs-vitals-stats-row">
          <div class="hvs-vitals-stat"><div class="hvs-vitals-stat-val" id="hvsVitalsHp">100</div><div class="hvs-vitals-stat-lbl">Health</div></div>
          <div class="hvs-vitals-stat"><div class="hvs-vitals-stat-val" id="hvsVitalsNrg">100</div><div class="hvs-vitals-stat-lbl">Energy</div></div>
          <div class="hvs-vitals-stat"><div class="hvs-vitals-stat-val" id="hvsVitalsFd">100</div><div class="hvs-vitals-stat-lbl">Fullness</div></div>
          <div class="hvs-vitals-stat"><div class="hvs-vitals-stat-val" id="hvsVitalsJoy">100</div><div class="hvs-vitals-stat-lbl">Happiness</div></div>
        </div>
      </div>

      <!-- Menu card -->
      <div class="hvs-menu-card" id="hvsMenuCard"></div>
    `;
    document.body.appendChild(stack);

    // Also inject a hidden div for the vitals sync message
    const msg = document.createElement("div");
    msg.id = "hvsVitalsMsg";
    msg.style.display = "none";
    msg.textContent = "Vitals synced with your pet.";
    document.body.appendChild(msg);
  }

  /* ── Render Menu ── */
  function renderMenu() {
    const card = document.getElementById("hvsMenuCard");
    if (!card) return;
    card.innerHTML = PAGES.map((p) => {
      const active = p.key === _currentPage ? " active" : "";
      return `<button class="hvs-menu-item${active}" onclick="window.location.href='${p.href}'">
        <span class="hvs-menu-item-icon">${p.svg()}</span>
        <span class="hvs-menu-item-label">${p.label}</span>
      </button>`;
    }).join("") +
    `<button class="hvs-expand-family-btn" id="hvsExpandBtn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Expand Family
    </button>`;
    document.getElementById("hvsExpandBtn").onclick = () => {
      window.location.href = "yeap.html";
    };
  }

  /* ── MONEY FORMAT ── */
  function formatMoney(n) {
    return "$" + (typeof n === "number" ? Math.max(0, n) : 0);
  }

  /* ── PUBLIC updateUI ── */
  function updateUI() {
    const p = _petData || {};
    const ct = _userData?.costTracking || {};
    const hp = Math.round(p.health || 0);
    const nrg = Math.round(p.energy || 0);
    const fd = Math.round(p.fullness || 0);
    const joy = Math.round(p.happiness || 0);
    const C_HP = 490, C_FD = 377, C_JOY = 264;

    // Profile
    const name = _currentUser?.displayName || "Trainer";
    document.getElementById("hvsPmcName").textContent = name;
    document.getElementById("hvsPmcSub").textContent = "Lv. " + (p.level || 1) + " Trainer";
    document.getElementById("hvsPmcCoins").textContent = formatMoney(ct.budgetRemaining);

    // Vitals name
    document.getElementById("hvsVitalsName").textContent = p.name || "Pet";

    // Rings
    document.getElementById("hvsRingHp").style.strokeDashoffset = C_HP * (1 - hp / 100);
    document.getElementById("hvsRingFd").style.strokeDashoffset = C_FD * (1 - fd / 100);
    document.getElementById("hvsRingJoy").style.strokeDashoffset = C_JOY * (1 - joy / 100);

    // Stat values
    document.getElementById("hvsVitalsHp").textContent = hp;
    document.getElementById("hvsVitalsNrg").textContent = nrg;
    document.getElementById("hvsVitalsFd").textContent = fd;
    document.getElementById("hvsVitalsJoy").textContent = joy;

    // Average
    const avg = Math.round((hp + fd + joy + nrg) / 4);
    document.getElementById("hvsVitalsPct").textContent = avg + "%";
  }

  /* ── INIT ── */
  window.HelixVitals = {
    init(opts = {}) {
      _currentPage = opts.page || "yeap";
      _petData = opts.petData || null;
      _userData = opts.userData || null;
      _currentUser = opts.currentUser || null;
      _onAlert = opts.onAlert || null;

      injectStyles();
      injectDOM();
      renderMenu();
      updateUI();
    },
    updateUI() {
      updateUI();
    },
    set petData(v) { _petData = v; updateUI(); },
    set userData(v) { _userData = v; updateUI(); },
    set currentUser(v) { _currentUser = v; updateUI(); },
    get petData() { return _petData; },
    get userData() { return _userData; },
  };
})();
