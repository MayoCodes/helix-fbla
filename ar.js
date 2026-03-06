/**
 * ar.js — HELIX AR Mode
 * Powered by <model-viewer> (Google / Polymer Labs)
 *
 * Why model-viewer:
 *  - Official Google web component, used in Google Search AR
 *  - Built-in GLB / GLTF loading with Draco + KTX2 support
 *  - Native WebXR AR on Android Chrome (ARCore hit-test + anchors)
 *  - Native Quick Look AR on iOS Safari (USDZ auto-convert)
 *  - Zero manual WebXR plumbing — AR just works
 *  - World-anchoring is handled internally by the component
 *  - CDN: unpkg.com/@google/model-viewer (actively maintained)
 */

(function () {
  'use strict';

  const MV_SRC    = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
  const MODELS    = { a: 'Leopard_Hybrid_A2.glb', b: 'idle02.glb', c: 'Parrot_A4.glb' };
  // iOS Quick Look requires USDZ — map pet types to USDZ files
  // If you don't have .usdz files yet, model-viewer will attempt GLB fallback in 3D preview mode
  const MODELS_USDZ = { a: 'Leopard_Hybrid_A2.usdz', b: 'idle02.usdz', c: 'Parrot_A4.usdz' };
  const PET_LABELS = { a: 'Cat', b: 'Dog', c: 'Bird' };
  const AR_BTN_ID  = 'arLaunchBtn';
  const AR_OV_ID   = 'arOverlay';
  const MV_ID      = 'arModelViewer';

  // Detect iOS Safari
  const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  let mvLoaded    = false;
  let lastPetType = null;
  let autoRotate  = false;

  // ─────────────────────────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────────────────────────
  const CSS = `
    /* ── AR Launch Button ── */
    #${AR_BTN_ID} {
      position: fixed; left: 96px; bottom: 22px; z-index: 150;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 18px 10px 12px;
      background: rgba(8,28,28,.75); backdrop-filter: blur(16px);
      border: 1.5px solid rgba(73,166,166,.4); border-radius: 30px;
      cursor: pointer; font-family: 'Nunito',sans-serif; font-size: .78rem;
      font-weight: 800; color: #7fcece;
      box-shadow: 0 4px 20px rgba(73,166,166,.25);
      transition: transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .28s, border-color .28s;
      user-select: none; letter-spacing: .3px; -webkit-tap-highlight-color: transparent;
    }
    #${AR_BTN_ID}:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 8px 28px rgba(73,166,166,.5); border-color: #49a6a6; color: #fff; }
    #${AR_BTN_ID}:hover .arb-icon { transform: scale(1.15) rotate(-8deg); filter: drop-shadow(0 0 6px rgba(73,166,166,.9)); }
    #${AR_BTN_ID}:active { transform: scale(.97); }
    #${AR_BTN_ID}.ar-active { background: rgba(73,166,166,.25); border-color: #49a6a6; color: #fff; box-shadow: 0 0 22px rgba(73,166,166,.6); animation: arPulse 2s ease-in-out infinite; }
    @keyframes arPulse { 0%,100% { box-shadow: 0 0 22px rgba(73,166,166,.6); } 50% { box-shadow: 0 0 36px rgba(73,166,166,.9); } }
    .arb-icon { width: 20px; height: 20px; flex-shrink: 0; transition: transform .3s, filter .3s; }
    .arb-dot  { width: 6px; height: 6px; border-radius: 50%; background: #49a6a6; animation: arbBlink 2s ease-in-out infinite; flex-shrink: 0; }
    @keyframes arbBlink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

    /* ── Overlay wrapper ── */
    #${AR_OV_ID} {
      display: none; position: fixed; inset: 0; z-index: 10000;
      background: #081c1c; overflow: hidden;
    }
    #${AR_OV_ID}.open { display: block; }

    /* ── model-viewer fills the overlay ── */
    #${MV_ID} {
      width: 100%; height: 100%;
      background-color: #081c1c;
      --poster-color: #081c1c;
      --progress-bar-color: #49a6a6;
      --progress-mask: #081c1c;
    }

    /* ── HUD on top of model-viewer ── */
    .ar-hud { position: absolute; z-index: 10; pointer-events: none; }

    .ar-top-bar {
      top: 0; left: 0; right: 0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px;
      background: linear-gradient(180deg, rgba(0,0,0,.65), transparent);
      pointer-events: auto;
    }
    .ar-pet-pill { display: flex; align-items: center; gap: 8px; background: rgba(8,28,28,.75); backdrop-filter: blur(14px); border: 1px solid rgba(73,166,166,.35); border-radius: 20px; padding: 6px 14px 6px 8px; }
    .ar-pet-emo  { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#2d7a7a,#7fcece); display: flex; align-items: center; justify-content: center; font-size: .9rem; }
    .ar-pet-info { display: flex; flex-direction: column; line-height: 1.2; }
    .ar-pet-name { font-family: 'Lilita One',cursive; font-size: .82rem; color: #fff; }
    .ar-pet-sub  { font-family: 'Nunito',sans-serif; font-size: .6rem; font-weight: 800; color: #7fcece; text-transform: uppercase; letter-spacing: .5px; }

    .ar-close-btn {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1.5px solid rgba(73,166,166,.4); background: rgba(8,28,28,.75);
      backdrop-filter: blur(14px); color: #7fcece; font-size: 1.1rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      pointer-events: auto; transition: background .2s, color .2s;
    }
    .ar-close-btn:hover { background: #e05252; color: #fff; border-color: #e05252; }

    .ar-mode-badge {
      position: absolute; top: 70px; left: 50%; transform: translateX(-50%);
      background: rgba(73,166,166,.15); border: 1px solid rgba(73,166,166,.4);
      border-radius: 20px; padding: 4px 14px;
      font-family: 'Nunito',sans-serif; font-size: .62rem; font-weight: 800;
      color: #7fcece; text-transform: uppercase; letter-spacing: 1px;
      white-space: nowrap; pointer-events: none;
    }
    .ar-mode-badge .ar-rec { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #49a6a6; margin-right: 5px; vertical-align: middle; animation: arbBlink 1.2s ease-in-out infinite; }

    /* Tap hint */
    .ar-tap-hint {
      position: absolute; bottom: 130px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      pointer-events: none; transition: opacity .5s;
    }
    .ar-tap-ring {
      width: 58px; height: 58px; border-radius: 50%;
      border: 2.5px solid rgba(73,166,166,.7);
      display: flex; align-items: center; justify-content: center;
      animation: arRipple 1.8s ease-in-out infinite;
    }
    @keyframes arRipple { 0%,100% { box-shadow: 0 0 0 0 rgba(73,166,166,.45); } 50% { box-shadow: 0 0 0 16px rgba(73,166,166,0); } }
    .ar-tap-ring svg { width: 24px; height: 24px; color: #7fcece; }
    .ar-tap-txt { font-family: 'Nunito',sans-serif; font-size: .72rem; font-weight: 800; color: rgba(255,255,255,.8); text-align: center; white-space: nowrap; }

    /* Scan reticle */
    .ar-reticle-wrap { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-60%); pointer-events: none; z-index: 5; transition: opacity .3s; }
    .ar-reticle { width: 80px; height: 80px; border-radius: 50%; border: 2px solid rgba(73,166,166,.7); position: relative; animation: arSpin 3s linear infinite; }
    @keyframes arSpin { to { transform: rotate(360deg); } }
    .ar-reticle::before, .ar-reticle::after { content: ''; position: absolute; background: #49a6a6; border-radius: 2px; }
    .ar-reticle::before { width: 2px; height: 14px; top: -7px; left: calc(50% - 1px); }
    .ar-reticle::after  { width: 14px; height: 2px; left: -7px; top: calc(50% - 1px); }

    /* Bottom controls */
    .ar-bottom-bar {
      position: absolute; bottom: 0; left: 0; right: 0;
      display: flex; align-items: center; justify-content: center; gap: 14px;
      padding: 16px 20px 30px;
      background: linear-gradient(0deg, rgba(0,0,0,.65), transparent);
      pointer-events: auto;
    }
    .ar-ctrl-btn {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      cursor: pointer; background: rgba(8,28,28,.75); backdrop-filter: blur(14px);
      border: 1.5px solid rgba(73,166,166,.3); border-radius: 16px; padding: 10px 15px;
      transition: all .25s cubic-bezier(.34,1.56,.64,1); -webkit-tap-highlight-color: transparent;
    }
    .ar-ctrl-btn:hover, .ar-ctrl-btn:active { background: rgba(73,166,166,.22); border-color: #49a6a6; transform: translateY(-3px); box-shadow: 0 6px 18px rgba(73,166,166,.35); }
    .ar-ctrl-btn svg   { width: 20px; height: 20px; color: #7fcece; }
    .ar-ctrl-lbl { font-family: 'Nunito',sans-serif; font-size: .55rem; font-weight: 800; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: .5px; }
    .ar-ctrl-btn.active { background: rgba(73,166,166,.25); border-color: #49a6a6; box-shadow: 0 0 16px rgba(73,166,166,.4); }
    .ar-ctrl-btn.active .ar-ctrl-lbl { color: #7fcece; }

    /* Scale slider */
    .ar-scale-wrap {
      position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      pointer-events: auto; z-index: 20;
    }
    .ar-scale-label { font-family: 'Nunito',sans-serif; font-size: .55rem; font-weight: 800; color: rgba(127,206,206,.65); text-transform: uppercase; letter-spacing: .5px; }
    #arScaleSlider {
      -webkit-appearance: slider-vertical; writing-mode: bt-lr;
      appearance: slider-vertical; width: 6px; height: 130px;
      cursor: pointer; accent-color: #49a6a6;
    }

    /* iOS notice banner */
    .ar-ios-notice {
      position: absolute; top: 70px; left: 50%; transform: translateX(-50%);
      background: rgba(8,28,28,.9); border: 1px solid rgba(73,166,166,.5);
      border-radius: 14px; padding: 10px 16px;
      font-family: 'Nunito',sans-serif; font-size: .7rem; font-weight: 700; color: #7fcece;
      text-align: center; white-space: nowrap; z-index: 30; pointer-events: none;
      display: none;
    }
    .ar-ios-notice.visible { display: block; }

    /* Toast */
    .ar-toast {
      position: absolute; bottom: 110px; left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: rgba(8,28,28,.92); border: 1px solid rgba(73,166,166,.4);
      border-radius: 20px; padding: 7px 18px;
      font-family: 'Nunito',sans-serif; font-size: .72rem; font-weight: 800; color: #7fcece;
      white-space: nowrap; z-index: 30; opacity: 0;
      transition: opacity .3s, transform .3s; pointer-events: none;
    }
    .ar-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* model-viewer slot overrides — hide its default AR button (we use our own) */
    #${MV_ID}::part(default-ar-button) { display: none !important; }
    #${MV_ID}::part(default-progress-bar) { background: #49a6a6; }
  `;

  // ─────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────
  function getPetEmoji (t) { return { a:'🐱', b:'🐶', c:'🦜' }[t] || '🐾'; }

  function toast (msg) {
    const el = document.getElementById('arToastEl');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2500);
  }

  function setHint (msg, show) {
    const wrap = document.getElementById('arTapHint');
    const txt  = document.getElementById('arHintTxt');
    if (txt)  txt.textContent = msg;
    if (wrap) wrap.style.opacity = show ? '1' : '0';
  }

  // ─────────────────────────────────────────────────────────────────
  // LOAD model-viewer SCRIPT (once)
  // ─────────────────────────────────────────────────────────────────
  function loadModelViewer () {
    if (mvLoaded || document.querySelector(`script[src="${MV_SRC}"]`)) {
      mvLoaded = true; return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.type  = 'module';
      s.src   = MV_SRC;
      s.onload  = () => { mvLoaded = true; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // DOM
  // ─────────────────────────────────────────────────────────────────
  function injectStyles () {
    if (document.getElementById('arCSS')) return;
    const s = document.createElement('style');
    s.id = 'arCSS'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildButton () {
    if (document.getElementById(AR_BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = AR_BTN_ID; btn.title = 'View pet in AR';
    btn.innerHTML = `
      <svg class="arb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 9V5a2 2 0 0 1 2-2h4"/><path d="M16 3h4a2 2 0 0 1 2 2v4"/>
        <path d="M2 15v4a2 2 0 0 0 2 2h4"/><path d="M16 21h4a2 2 0 0 0 2-2v-4"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span class="arb-dot"></span>View in AR`;
    btn.addEventListener('click', openAR);
    document.body.appendChild(btn);
  }

  function buildOverlay () {
    if (document.getElementById(AR_OV_ID)) return;

    const petType = getCurrentPetType();
    const usdzSrc = MODELS_USDZ[petType] || '';

    const ov = document.createElement('div');
    ov.id = AR_OV_ID;

    // Key iOS fixes:
    // 1. Remove environment-image="neutral" — causes black on iOS WebKit
    // 2. Set explicit background via style + --poster-color
    // 3. Add ios-src for Quick Look USDZ (required for real AR on iOS)
    // 4. skybox-image removed — not supported on iOS and causes black
    // 5. tone-mapping="commerce" works best cross-platform
    ov.innerHTML = `
      <model-viewer
        id="${MV_ID}"
        src="${MODELS[petType]}"
        ${usdzSrc ? `ios-src="${usdzSrc}"` : ''}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        ar-placement="floor"
        camera-controls
        shadow-intensity="0.5"
        exposure="1"
        tone-mapping="commerce"
        loading="eager"
        reveal="auto"
        style="background-color: #081c1c;"
      ></model-viewer>

      <!-- HUD overlaid on top -->
      <div class="ar-hud ar-top-bar">
        <div class="ar-pet-pill">
          <div class="ar-pet-emo" id="arPetEmoji">🐾</div>
          <div class="ar-pet-info">
            <span class="ar-pet-name" id="arPetName">Pet</span>
            <span class="ar-pet-sub">AR Mode</span>
          </div>
        </div>
        <button class="ar-close-btn" id="arCloseBtn">✕</button>
      </div>

      <div class="ar-hud ar-mode-badge"><span class="ar-rec"></span><span id="arModeLbl">Loading…</span></div>

      ${IS_IOS ? `<div class="ar-ios-notice visible" id="arIosNotice">📱 iOS: Tap "Enter AR" for Quick Look AR</div>` : ''}

      <!-- Tap hint (shown before AR placement) -->
      <div class="ar-tap-hint" id="arTapHint" style="opacity:0">
        <div class="ar-tap-ring">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
          </svg>
        </div>
        <span class="ar-tap-txt" id="arHintTxt">Point at floor, then tap</span>
      </div>

      <!-- Scan reticle (shown while model-viewer is scanning) -->
      <div class="ar-reticle-wrap" id="arReticleWrap" style="opacity:0">
        <div class="ar-reticle"></div>
      </div>

      <!-- Scale slider -->
      <div class="ar-scale-wrap">
        <span class="ar-scale-label">Size</span>
        <input type="range" id="arScaleSlider" min="0.2" max="3" step="0.05" value="1" orient="vertical">
        <span class="ar-scale-label" id="arScaleVal">1×</span>
      </div>

      <!-- Bottom controls -->
      <div class="ar-bottom-bar">
        <div class="ar-ctrl-btn" id="arRotBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span class="ar-ctrl-lbl">Rotate</span>
        </div>
        <div class="ar-ctrl-btn" id="arResetBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          <span class="ar-ctrl-lbl">Reset</span>
        </div>
        <div class="ar-ctrl-btn" id="arFlipBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          <span class="ar-ctrl-lbl">Mirror</span>
        </div>
        <div class="ar-ctrl-btn" id="arLaunchARBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9V5a2 2 0 0 1 2-2h4"/><path d="M16 3h4a2 2 0 0 1 2 2v4"/><path d="M2 15v4a2 2 0 0 0 2 2h4"/><path d="M16 21h4a2 2 0 0 0 2-2v-4"/><circle cx="12" cy="12" r="3"/></svg>
          <span class="ar-ctrl-lbl">Enter AR</span>
        </div>
      </div>

      <div class="ar-toast" id="arToastEl"></div>
    `;

    document.body.appendChild(ov);

    // Wire controls
    document.getElementById('arCloseBtn').addEventListener('click', closeAR);
    document.getElementById('arRotBtn').addEventListener('click', toggleRotate);
    document.getElementById('arResetBtn').addEventListener('click', resetView);
    document.getElementById('arFlipBtn').addEventListener('click', flipModel);
    document.getElementById('arLaunchARBtn').addEventListener('click', enterAR);
    document.getElementById('arScaleSlider').addEventListener('input', onScale);

    // model-viewer events
    const mv = document.getElementById(MV_ID);

    mv.addEventListener('load', () => {
      document.getElementById('arModeLbl').textContent = IS_IOS ? '3D Preview (iOS)' : '3D Preview';
      setHint('Tap "Enter AR" to place in real world', true);
      setTimeout(() => setHint('', false), 4000);
      toast(IS_IOS ? 'Model loaded — tap Enter AR for Quick Look 🐾' : 'Model loaded — tap Enter AR to place 🐾');

      // Hide iOS notice after model loads
      const iosNotice = document.getElementById('arIosNotice');
      if (iosNotice) setTimeout(() => { iosNotice.style.opacity = '0'; }, 3000);
    });

    mv.addEventListener('error', (e) => {
      console.error('[AR] model-viewer error:', e);
      document.getElementById('arModeLbl').textContent = 'Load Error';
      toast('Error loading model — check file path');
    });

    mv.addEventListener('ar-status', (e) => {
      const status = e.detail.status;
      if (status === 'session-started') {
        document.getElementById('arModeLbl').textContent = IS_IOS ? 'Quick Look AR' : 'WebXR AR';
        document.getElementById('arReticleWrap').style.opacity = '1';
        setHint('Point at floor, then tap to place', true);
        toast('AR started — scan the floor 🌟');
      }
      if (status === 'object-placed') {
        document.getElementById('arReticleWrap').style.opacity = '0';
        setHint('', false);
        toast('Anchored! Walk around freely 📍');
      }
      if (status === 'failed') {
        document.getElementById('arModeLbl').textContent = '3D Preview';
        toast(IS_IOS ? 'AR needs a .usdz file on iOS' : 'AR not available on this device');
      }
    });

    mv.addEventListener('ar-tracking', (e) => {
      if (e.detail.status === 'tracking') {
        document.getElementById('arReticleWrap').style.opacity = '0';
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────────
  async function openAR () {
    buildOverlay();
    syncPetTag();

    document.getElementById(AR_OV_ID).classList.add('open');
    document.getElementById(AR_BTN_ID).classList.add('ar-active');

    // Load model-viewer script if not already loaded
    try {
      await loadModelViewer();
    } catch (e) {
      toast('Failed to load AR library');
      return;
    }

    // Update model src to current pet
    updateModelSrc();
  }

  function closeAR () {
    // Exit any active AR session
    const mv = document.getElementById(MV_ID);
    if (mv) {
      try { mv.exitFullscreen(); } catch (_) {}
      // Reset viewer state
      mv.setAttribute('auto-rotate', '');
      autoRotate = false;
    }

    document.getElementById(AR_OV_ID).classList.remove('open');
    document.getElementById(AR_BTN_ID).classList.remove('ar-active');

    // Reset controls
    const sl  = document.getElementById('arScaleSlider');
    const lbl = document.getElementById('arScaleVal');
    if (sl)  sl.value = 1;
    if (lbl) lbl.textContent = '1×';
    document.getElementById('arRotBtn')?.classList.remove('active');
    setHint('', false);
    document.getElementById('arReticleWrap').style.opacity = '0';
  }

  // ─────────────────────────────────────────────────────────────────
  // ENTER AR (triggers model-viewer's built-in AR flow)
  // ─────────────────────────────────────────────────────────────────
  function enterAR () {
    const mv = document.getElementById(MV_ID);
    if (!mv) return;

    if (IS_IOS) {
      // On iOS, activateAR() triggers Quick Look (requires ios-src USDZ)
      // If no USDZ is present, inform the user clearly
      const petType = getCurrentPetType();
      if (!MODELS_USDZ[petType]) {
        toast('iOS AR needs a .usdz file 🍎');
        return;
      }
    }

    // model-viewer exposes activateAR() which starts the WebXR / SceneViewer / QuickLook flow
    if (typeof mv.activateAR === 'function') {
      mv.activateAR();
    } else {
      // Fallback: click the hidden default AR button
      const arBtn = mv.shadowRoot?.querySelector('[slot="ar-button"], .ar-button');
      if (arBtn) arBtn.click();
      else toast('AR not supported on this device');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // MODEL SRC — swap GLB when pet changes
  // ─────────────────────────────────────────────────────────────────
  function updateModelSrc () {
    const petType = getCurrentPetType();
    if (petType === lastPetType) return;
    lastPetType = petType;

    const mv = document.getElementById(MV_ID);
    if (!mv) return;

    mv.setAttribute('src', MODELS[petType]);

    // Update ios-src for Quick Look
    const usdzSrc = MODELS_USDZ[petType];
    if (usdzSrc) {
      mv.setAttribute('ios-src', usdzSrc);
    } else {
      mv.removeAttribute('ios-src');
    }

    document.getElementById('arModeLbl').textContent = 'Loading…';
  }

  // ─────────────────────────────────────────────────────────────────
  // CONTROLS
  // ─────────────────────────────────────────────────────────────────
  function toggleRotate () {
    autoRotate = !autoRotate;
    const mv = document.getElementById(MV_ID);
    if (mv) {
      if (autoRotate) mv.setAttribute('auto-rotate', '');
      else            mv.removeAttribute('auto-rotate');
    }
    document.getElementById('arRotBtn')?.classList.toggle('active', autoRotate);
    toast(autoRotate ? 'Auto-rotate on 🔄' : 'Auto-rotate off');
  }

  function resetView () {
    const mv = document.getElementById(MV_ID);
    if (mv) {
      mv.cameraOrbit  = 'auto auto auto';
      mv.cameraTarget = 'auto auto auto';
      mv.fieldOfView  = 'auto';
      mv.scale        = '1 1 1';
    }
    const sl  = document.getElementById('arScaleSlider');
    const lbl = document.getElementById('arScaleVal');
    if (sl)  sl.value = 1;
    if (lbl) lbl.textContent = '1×';
    toast('Reset ✅');
  }

  function flipModel () {
    const mv = document.getElementById(MV_ID);
    if (!mv) return;
    // Toggle mirror by flipping scale x
    const cur = mv.scale || '1 1 1';
    const parts = cur.split(' ').map(Number);
    parts[0] *= -1;
    mv.scale = parts.join(' ');
    toast('Mirrored 🔄');
  }

  function onScale (e) {
    const val = parseFloat(e.target.value);
    const lbl = document.getElementById('arScaleVal');
    if (lbl) lbl.textContent = val.toFixed(1) + '×';

    const mv = document.getElementById(MV_ID);
    if (mv) mv.scale = `${val} ${val} ${val}`;
  }

  // ─────────────────────────────────────────────────────────────────
  // PET SYNC
  // ─────────────────────────────────────────────────────────────────
  function getCurrentPetType () {
    try { if (typeof petData !== 'undefined' && petData.type) return petData.type; } catch (_) {}
    return 'b';
  }

  function syncPetTag () {
    const type = getCurrentPetType();
    const name = (() => { try { return petData?.name || 'Pet'; } catch (_) { return 'Pet'; } })();
    const emo  = document.getElementById('arPetEmoji');
    const nm   = document.getElementById('arPetName');
    if (emo) emo.textContent = getPetEmoji(type);
    if (nm)  nm.textContent  = name;
  }

  function watchPetChange () {
    setInterval(() => {
      if (!document.getElementById(AR_OV_ID)?.classList.contains('open')) return;
      const type = getCurrentPetType();
      if (type !== lastPetType) {
        syncPetTag();
        updateModelSrc();
        toast('Switched to ' + (PET_LABELS[type] || 'Pet') + '! 🐾');
      }
    }, 1500);
  }

  // ─────────────────────────────────────────────────────────────────
  // BOOTSTRAP
  // ─────────────────────────────────────────────────────────────────
  function init () {
    injectStyles();
    buildButton();
    buildOverlay();
    watchPetChange();
    console.log('[AR] HELIX model-viewer AR module loaded ✅', IS_IOS ? '(iOS Safari detected)' : '');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();