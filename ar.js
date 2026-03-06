/**
 * ar.js — HELIX AR Mode
 * Powered by <model-viewer> (Google / Polymer Labs)
 */

(function () {
  'use strict';

  const MV_SRC     = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
  const MODELS     = { a: 'Leopard_Hybrid_A2.glb', b: 'idle02.glb', c: 'Parrot_A4.glb' };
  const MODELS_USDZ = { a: 'Leopard_Hybrid_A2.usdz', b: 'idle02.usdz', c: 'Parrot_A4.usdz' };
  const PET_LABELS = { a: 'Cat', b: 'Dog', c: 'Bird' };
  const AR_BTN_ID  = 'arLaunchBtn';
  const AR_OV_ID   = 'arOverlay';
  const MV_ID      = 'arModelViewer';

  const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  let mvScriptReady = false;  // script tag injected & loaded
  let mvDefined     = false;  // custom element actually defined
  let lastPetType   = null;
  let autoRotate    = false;

  // ─────────────────────────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────────────────────────
  const CSS = `
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
    #${AR_BTN_ID}:hover  { transform: translateY(-3px) scale(1.04); box-shadow: 0 8px 28px rgba(73,166,166,.5); border-color: #49a6a6; color: #fff; }
    #${AR_BTN_ID}:hover .arb-icon { transform: scale(1.15) rotate(-8deg); filter: drop-shadow(0 0 6px rgba(73,166,166,.9)); }
    #${AR_BTN_ID}:active { transform: scale(.97); }
    #${AR_BTN_ID}.ar-active { background: rgba(73,166,166,.25); border-color: #49a6a6; color: #fff; box-shadow: 0 0 22px rgba(73,166,166,.6); animation: arPulse 2s ease-in-out infinite; }
    @keyframes arPulse { 0%,100% { box-shadow: 0 0 22px rgba(73,166,166,.6); } 50% { box-shadow: 0 0 36px rgba(73,166,166,.9); } }
    .arb-icon { width: 20px; height: 20px; flex-shrink: 0; transition: transform .3s, filter .3s; }
    .arb-dot  { width: 6px; height: 6px; border-radius: 50%; background: #49a6a6; animation: arbBlink 2s ease-in-out infinite; flex-shrink: 0; }
    @keyframes arbBlink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

    #${AR_OV_ID} {
      display: none; position: fixed; inset: 0; z-index: 10000;
      background: #081c1c; overflow: hidden;
    }
    #${AR_OV_ID}.open { display: block; }

    /* model-viewer must be display:block and have explicit dimensions */
    #${MV_ID} {
      display: block;
      width: 100%; height: 100%;
      background-color: #081c1c;
      --poster-color: #081c1c;
      --progress-bar-color: #49a6a6;
    }

    /* Loading spinner shown while model-viewer initialises */
    .ar-loading-screen {
      position: absolute; inset: 0; z-index: 5;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #081c1c; gap: 18px; transition: opacity .4s;
    }
    .ar-loading-screen.hidden { opacity: 0; pointer-events: none; }
    .ar-spinner {
      width: 52px; height: 52px; border-radius: 50%;
      border: 3px solid rgba(73,166,166,.2);
      border-top-color: #49a6a6;
      animation: arSpin 0.9s linear infinite;
    }
    @keyframes arSpin { to { transform: rotate(360deg); } }
    .ar-loading-txt { font-family: 'Nunito',sans-serif; font-size: .8rem; font-weight: 800; color: #7fcece; letter-spacing: .5px; }

    .ar-hud { position: absolute; z-index: 10; pointer-events: none; }

    .ar-top-bar {
      top: 0; left: 0; right: 0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px;
      background: linear-gradient(180deg,rgba(0,0,0,.65),transparent);
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

    .ar-reticle-wrap { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-60%); pointer-events: none; z-index: 5; transition: opacity .3s; }
    .ar-reticle { width: 80px; height: 80px; border-radius: 50%; border: 2px solid rgba(73,166,166,.7); position: relative; animation: arSpinR 3s linear infinite; }
    @keyframes arSpinR { to { transform: rotate(360deg); } }
    .ar-reticle::before, .ar-reticle::after { content: ''; position: absolute; background: #49a6a6; border-radius: 2px; }
    .ar-reticle::before { width: 2px; height: 14px; top: -7px; left: calc(50% - 1px); }
    .ar-reticle::after  { width: 14px; height: 2px; left: -7px; top: calc(50% - 1px); }

    .ar-bottom-bar {
      position: absolute; bottom: 0; left: 0; right: 0;
      display: flex; align-items: center; justify-content: center; gap: 14px;
      padding: 16px 20px 30px;
      background: linear-gradient(0deg,rgba(0,0,0,.65),transparent);
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

    #${MV_ID}::part(default-ar-button)    { display: none !important; }
    #${MV_ID}::part(default-progress-bar) { background: #49a6a6; }
  `;

  // ─────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────
  function getPetEmoji(t) { return { a:'🐱', b:'🐶', c:'🦜' }[t] || '🐾'; }

  function toast(msg) {
    const el = document.getElementById('arToastEl');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2500);
  }

  function setHint(msg, show) {
    const wrap = document.getElementById('arTapHint');
    const txt  = document.getElementById('arHintTxt');
    if (txt)  txt.textContent = msg;
    if (wrap) wrap.style.opacity = show ? '1' : '0';
  }

  function hideLoadingScreen() {
    const ls = document.getElementById('arLoadingScreen');
    if (ls) ls.classList.add('hidden');
  }

  // ─────────────────────────────────────────────────────────────────
  // LOAD model-viewer — inject early, wait for custom element define
  // ─────────────────────────────────────────────────────────────────
  function loadModelViewer() {
    return new Promise((resolve, reject) => {
      // If already defined, resolve immediately
      if (customElements.get('model-viewer')) {
        mvScriptReady = true; mvDefined = true;
        resolve(); return;
      }

      // If script already injected, just wait for define
      if (mvScriptReady) {
        waitForDefine(resolve, reject); return;
      }

      const s = document.createElement('script');
      s.type        = 'module';
      s.src         = MV_SRC;
      s.crossOrigin = 'anonymous';
      s.onload      = () => { mvScriptReady = true; waitForDefine(resolve, reject); };
      s.onerror     = () => reject(new Error('model-viewer script failed to load'));
      document.head.appendChild(s);
    });
  }

  function waitForDefine(resolve, reject) {
    // customElements.whenDefined guarantees the element is registered
    customElements.whenDefined('model-viewer')
      .then(() => { mvDefined = true; resolve(); })
      .catch(reject);

    // Safety timeout — 15s
    const t = setTimeout(() => {
      if (!mvDefined) reject(new Error('model-viewer define timeout'));
    }, 15000);

    customElements.whenDefined('model-viewer').then(() => clearTimeout(t)).catch(() => {});
  }

  // ─────────────────────────────────────────────────────────────────
  // INJECT STYLES
  // ─────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('arCSS')) return;
    const s = document.createElement('style');
    s.id = 'arCSS'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────────
  // BUILD BUTTON
  // ─────────────────────────────────────────────────────────────────
  function buildButton() {
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

  // ─────────────────────────────────────────────────────────────────
  // BUILD OVERLAY SHELL (no model-viewer yet — injected after script)
  // ─────────────────────────────────────────────────────────────────
  function buildOverlay() {
    if (document.getElementById(AR_OV_ID)) return;

    const ov = document.createElement('div');
    ov.id = AR_OV_ID;
    ov.innerHTML = `
      <!-- Loading screen shown until model-viewer is ready -->
      <div id="arLoadingScreen" class="ar-loading-screen">
        <div class="ar-spinner"></div>
        <span class="ar-loading-txt" id="arLoadingTxt">Initialising AR…</span>
      </div>

      <!-- model-viewer injected here programmatically after script loads -->
      <div id="arMvSlot" style="position:absolute;inset:0;z-index:1;"></div>

      <!-- HUD — always on top -->
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

      <div class="ar-hud ar-mode-badge" id="arModeBadge" style="display:none">
        <span class="ar-rec"></span><span id="arModeLbl">Loading…</span>
      </div>

      <div class="ar-tap-hint" id="arTapHint" style="opacity:0">
        <div class="ar-tap-ring">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
          </svg>
        </div>
        <span class="ar-tap-txt" id="arHintTxt">Point at floor, then tap</span>
      </div>

      <div class="ar-reticle-wrap" id="arReticleWrap" style="opacity:0">
        <div class="ar-reticle"></div>
      </div>

      <div class="ar-scale-wrap">
        <span class="ar-scale-label">Size</span>
        <input type="range" id="arScaleSlider" min="0.2" max="3" step="0.05" value="1" orient="vertical">
        <span class="ar-scale-label" id="arScaleVal">1×</span>
      </div>

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

    document.getElementById('arCloseBtn').addEventListener('click', closeAR);
    document.getElementById('arRotBtn').addEventListener('click', toggleRotate);
    document.getElementById('arResetBtn').addEventListener('click', resetView);
    document.getElementById('arFlipBtn').addEventListener('click', flipModel);
    document.getElementById('arLaunchARBtn').addEventListener('click', enterAR);
    document.getElementById('arScaleSlider').addEventListener('input', onScale);
  }

  // ─────────────────────────────────────────────────────────────────
  // INJECT <model-viewer> — only AFTER customElements.whenDefined resolves
  // This is the critical fix: on iOS Safari, writing innerHTML with
  // an unknown custom element tag before it's registered produces
  // an HTMLUnknownElement that never renders.
  // ─────────────────────────────────────────────────────────────────
  function injectModelViewer(petType) {
    const slot = document.getElementById('arMvSlot');
    if (!slot) return;

    // Remove any existing instance
    const existing = document.getElementById(MV_ID);
    if (existing) existing.remove();

    const glbSrc  = MODELS[petType]      || MODELS['b'];
    const usdzSrc = MODELS_USDZ[petType] || '';

    const mv = document.createElement('model-viewer');
    mv.id = MV_ID;

    // Set all attributes via setAttribute (not innerHTML) so iOS registers them correctly
    mv.setAttribute('src', glbSrc);
    if (usdzSrc) mv.setAttribute('ios-src', usdzSrc);
    mv.setAttribute('ar', '');
    mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    mv.setAttribute('ar-scale', 'fixed');
    mv.setAttribute('ar-placement', 'floor');
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('shadow-intensity', '0.5');
    mv.setAttribute('exposure', '1');
    mv.setAttribute('tone-mapping', 'commerce');
    mv.setAttribute('loading', 'eager');
    mv.setAttribute('reveal', 'auto');

    // Inline style for guaranteed dimensions — critical for iOS WebKit
    mv.style.cssText = [
      'display:block',
      'width:100%',
      'height:100%',
      'position:absolute',
      'inset:0',
      'background-color:#081c1c',
      '--poster-color:#081c1c',
      '--progress-bar-color:#49a6a6',
    ].join(';');

    mv.addEventListener('load', onMvLoad);
    mv.addEventListener('error', onMvError);
    mv.addEventListener('ar-status', onArStatus);
    mv.addEventListener('ar-tracking', onArTracking);

    slot.appendChild(mv);
    lastPetType = petType;
  }

  // ─────────────────────────────────────────────────────────────────
  // model-viewer EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────
  function onMvLoad() {
    hideLoadingScreen();
    const badge = document.getElementById('arModeBadge');
    if (badge) badge.style.display = '';
    document.getElementById('arModeLbl').textContent = IS_IOS ? '3D Preview (iOS)' : '3D Preview';
    setHint('Tap "Enter AR" to place in real world', true);
    setTimeout(() => setHint('', false), 4000);
    toast(IS_IOS ? 'Model loaded 🐾  Tap Enter AR for Quick Look' : 'Model loaded — tap Enter AR to place 🐾');
  }

  function onMvError(e) {
    console.error('[AR] model-viewer load error:', e);
    const ltxt = document.getElementById('arLoadingTxt');
    if (ltxt) ltxt.textContent = '⚠️ Model failed to load';
    toast('Error loading 3D model — check file path');
  }

  function onArStatus(e) {
    const s = e.detail.status;
    if (s === 'session-started') {
      document.getElementById('arModeLbl').textContent = IS_IOS ? 'Quick Look AR' : 'WebXR AR';
      document.getElementById('arReticleWrap').style.opacity = '1';
      setHint('Point at floor, then tap to place', true);
      toast('AR started — scan the floor 🌟');
    }
    if (s === 'object-placed') {
      document.getElementById('arReticleWrap').style.opacity = '0';
      setHint('', false);
      toast('Anchored! Walk around freely 📍');
    }
    if (s === 'failed') {
      document.getElementById('arModeLbl').textContent = '3D Preview';
      toast(IS_IOS ? 'AR needs a .usdz file on iOS' : 'AR not available on this device');
    }
  }

  function onArTracking(e) {
    if (e.detail.status === 'tracking') {
      document.getElementById('arReticleWrap').style.opacity = '0';
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────────
  async function openAR() {
    buildOverlay();
    syncPetTag();

    document.getElementById(AR_OV_ID).classList.add('open');
    document.getElementById(AR_BTN_ID).classList.add('ar-active');

    const ltxt = document.getElementById('arLoadingTxt');

    try {
      if (ltxt) ltxt.textContent = 'Loading AR library…';
      await loadModelViewer();
    } catch (err) {
      console.error('[AR]', err);
      if (ltxt) ltxt.textContent = '⚠️ AR library failed to load';
      toast('Failed to load AR — check connection');
      return;
    }

    if (ltxt) ltxt.textContent = 'Loading 3D model…';
    const petType = getCurrentPetType();
    injectModelViewer(petType);
  }

  function closeAR() {
    const mv = document.getElementById(MV_ID);
    if (mv) { try { mv.exitFullscreen(); } catch (_) {} }

    document.getElementById(AR_OV_ID).classList.remove('open');
    document.getElementById(AR_BTN_ID).classList.remove('ar-active');

    // Re-show loading screen for next open
    const ls = document.getElementById('arLoadingScreen');
    if (ls) ls.classList.remove('hidden');
    const badge = document.getElementById('arModeBadge');
    if (badge) badge.style.display = 'none';

    const sl  = document.getElementById('arScaleSlider');
    const lbl = document.getElementById('arScaleVal');
    if (sl)  sl.value = 1;
    if (lbl) lbl.textContent = '1×';
    document.getElementById('arRotBtn')?.classList.remove('active');
    autoRotate = false;
    setHint('', false);
    document.getElementById('arReticleWrap').style.opacity = '0';
  }

  // ─────────────────────────────────────────────────────────────────
  // ENTER AR
  // ─────────────────────────────────────────────────────────────────
  function enterAR() {
    const mv = document.getElementById(MV_ID);
    if (!mv) { toast('Model not ready yet'); return; }

    if (IS_IOS) {
      const petType = getCurrentPetType();
      if (!MODELS_USDZ[petType]) {
        toast('iOS AR needs a .usdz file 🍎'); return;
      }
    }

    if (typeof mv.activateAR === 'function') {
      mv.activateAR();
    } else {
      const arBtn = mv.shadowRoot?.querySelector('[slot="ar-button"], .ar-button');
      if (arBtn) arBtn.click();
      else toast('AR not supported on this device');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // MODEL SRC — swap GLB when pet changes while overlay is open
  // ─────────────────────────────────────────────────────────────────
  function updateModelSrc() {
    const petType = getCurrentPetType();
    if (petType === lastPetType) return;

    const mv = document.getElementById(MV_ID);
    if (!mv) return;

    mv.setAttribute('src', MODELS[petType]);
    const usdzSrc = MODELS_USDZ[petType];
    if (usdzSrc) mv.setAttribute('ios-src', usdzSrc);
    else         mv.removeAttribute('ios-src');

    lastPetType = petType;
    document.getElementById('arModeLbl').textContent = 'Loading…';
  }

  // ─────────────────────────────────────────────────────────────────
  // CONTROLS
  // ─────────────────────────────────────────────────────────────────
  function toggleRotate() {
    autoRotate = !autoRotate;
    const mv = document.getElementById(MV_ID);
    if (mv) {
      if (autoRotate) mv.setAttribute('auto-rotate', '');
      else            mv.removeAttribute('auto-rotate');
    }
    document.getElementById('arRotBtn')?.classList.toggle('active', autoRotate);
    toast(autoRotate ? 'Auto-rotate on 🔄' : 'Auto-rotate off');
  }

  function resetView() {
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

  function flipModel() {
    const mv = document.getElementById(MV_ID);
    if (!mv) return;
    const parts = (mv.scale || '1 1 1').split(' ').map(Number);
    parts[0] *= -1;
    mv.scale = parts.join(' ');
    toast('Mirrored 🔄');
  }

  function onScale(e) {
    const val = parseFloat(e.target.value);
    const lbl = document.getElementById('arScaleVal');
    if (lbl) lbl.textContent = val.toFixed(1) + '×';
    const mv = document.getElementById(MV_ID);
    if (mv) mv.scale = `${val} ${val} ${val}`;
  }

  // ─────────────────────────────────────────────────────────────────
  // PET SYNC
  // ─────────────────────────────────────────────────────────────────
  function getCurrentPetType() {
    try { if (typeof petData !== 'undefined' && petData.type) return petData.type; } catch (_) {}
    return 'b';
  }

  function syncPetTag() {
    const type = getCurrentPetType();
    const name = (() => { try { return petData?.name || 'Pet'; } catch (_) { return 'Pet'; } })();
    const emo  = document.getElementById('arPetEmoji');
    const nm   = document.getElementById('arPetName');
    if (emo) emo.textContent = getPetEmoji(type);
    if (nm)  nm.textContent  = name;
  }

  function watchPetChange() {
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
  // BOOTSTRAP — preload script in background so it's ready on first tap
  // ─────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildButton();
    buildOverlay();
    watchPetChange();

    // Kick off script load immediately in background
    loadModelViewer().catch(() => {
      console.warn('[AR] Background preload failed — will retry on open');
    });

    console.log('[AR] HELIX AR module loaded ✅', IS_IOS ? '(iOS Safari)' : '(non-iOS)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();