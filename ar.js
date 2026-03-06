/**
 * ar.js — HELIX AR Mode
 * Injects an AR button (bottom-left) that launches WebXR immersive-ar,
 * rendering the currently-selected pet model through the device camera.
 * Falls back to a simulated "AR-style" overlay for unsupported browsers.
 */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  const AR_BTN_ID   = 'arLaunchBtn';
  const AR_OV_ID    = 'arOverlay';
  const AR_CVS_ID   = 'arCanvas';
  const MODELS      = { a: 'Leopard_Hybrid_A2.glb', b: 'idle02.glb', c: 'Parrot_A4.glb' };
  const PET_LABELS  = { a: 'Cat', b: 'Dog', c: 'Bird' };
  const FLOOR_Y     = 0;   // world Y the pet stands on

  // ── Injected styles ────────────────────────────────────────────────────────
  const CSS = `
    /* ── AR Launch Button (bottom-left) ── */
    #${AR_BTN_ID} {
      position: fixed;
      left: 96px;
      bottom: 22px;
      z-index: 150;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px 10px 12px;
      background: rgba(8, 28, 28, 0.75);
      backdrop-filter: blur(16px);
      border: 1.5px solid rgba(73, 166, 166, 0.4);
      border-radius: 30px;
      cursor: pointer;
      font-family: 'Nunito', sans-serif;
      font-size: 0.78rem;
      font-weight: 800;
      color: #7fcece;
      box-shadow: 0 4px 20px rgba(73, 166, 166, 0.25);
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                  box-shadow 0.28s ease,
                  border-color 0.28s ease;
      user-select: none;
      letter-spacing: 0.3px;
    }
    #${AR_BTN_ID}:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 28px rgba(73, 166, 166, 0.5);
      border-color: #49a6a6;
      color: #fff;
    }
    #${AR_BTN_ID}:hover .ar-btn-icon {
      transform: scale(1.15) rotate(-8deg);
      filter: drop-shadow(0 0 6px rgba(73,166,166,0.9));
    }
    #${AR_BTN_ID}:active { transform: scale(0.97); }
    #${AR_BTN_ID}.ar-active {
      background: rgba(73, 166, 166, 0.25);
      border-color: #49a6a6;
      color: #fff;
      box-shadow: 0 0 22px rgba(73, 166, 166, 0.6);
      animation: arPulse 2s ease-in-out infinite;
    }
    @keyframes arPulse {
      0%, 100% { box-shadow: 0 0 22px rgba(73,166,166,0.6); }
      50%       { box-shadow: 0 0 36px rgba(73,166,166,0.9); }
    }
    .ar-btn-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      transition: transform 0.3s, filter 0.3s;
    }
    .ar-btn-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #49a6a6;
      animation: arDotBlink 2s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes arDotBlink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }

    /* ── AR Fullscreen Overlay ── */
    #${AR_OV_ID} {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: #000;
      flex-direction: column;
      overflow: hidden;
    }
    #${AR_OV_ID}.open { display: flex; }

    /* Camera video backdrop */
    #arVideo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 0;
    }

    /* Babylon AR canvas */
    #${AR_CVS_ID} {
      position: absolute;
      inset: 0;
      width: 100% !important;
      height: 100% !important;
      z-index: 1;
      outline: none;
      touch-action: none;
    }

    /* ── AR HUD ── */
    .ar-hud {
      position: absolute;
      z-index: 10;
      pointer-events: none;
    }

    /* Top bar */
    .ar-top-bar {
      top: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%);
      pointer-events: auto;
    }
    .ar-pet-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(8, 28, 28, 0.75);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(73, 166, 166, 0.35);
      border-radius: 20px;
      padding: 6px 14px 6px 8px;
    }
    .ar-pet-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2d7a7a, #7fcece);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }
    .ar-pet-info { display: flex; flex-direction: column; line-height: 1.2; }
    .ar-pet-name {
      font-family: 'Lilita One', cursive;
      font-size: 0.82rem;
      color: #fff;
    }
    .ar-pet-sub {
      font-family: 'Nunito', sans-serif;
      font-size: 0.6rem;
      font-weight: 800;
      color: #7fcece;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ar-close-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1.5px solid rgba(73, 166, 166, 0.4);
      background: rgba(8, 28, 28, 0.75);
      backdrop-filter: blur(14px);
      color: #7fcece;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      transition: background 0.2s, color 0.2s;
    }
    .ar-close-btn:hover { background: #e05252; color: #fff; border-color: #e05252; }

    /* AR mode label */
    .ar-mode-badge {
      position: absolute;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(73, 166, 166, 0.15);
      border: 1px solid rgba(73, 166, 166, 0.4);
      border-radius: 20px;
      padding: 4px 14px;
      font-family: 'Nunito', sans-serif;
      font-size: 0.62rem;
      font-weight: 800;
      color: #7fcece;
      text-transform: uppercase;
      letter-spacing: 1px;
      white-space: nowrap;
      pointer-events: none;
    }
    .ar-mode-badge .ar-rec {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #49a6a6;
      margin-right: 5px;
      vertical-align: middle;
      animation: arDotBlink 1.2s ease-in-out infinite;
    }

    /* Tap hint */
    .ar-tap-hint {
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      pointer-events: none;
      animation: arFadeHint 3s ease forwards;
    }
    @keyframes arFadeHint {
      0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
      20%  { opacity: 1; transform: translateX(-50%) translateY(0); }
      80%  { opacity: 1; }
      100% { opacity: 0; }
    }
    .ar-tap-circle {
      width: 54px; height: 54px;
      border-radius: 50%;
      border: 2px solid rgba(73, 166, 166, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: arRipple 1.8s ease-in-out infinite;
    }
    @keyframes arRipple {
      0%, 100% { box-shadow: 0 0 0 0 rgba(73,166,166,0.4); }
      50%       { box-shadow: 0 0 0 14px rgba(73,166,166,0); }
    }
    .ar-tap-circle svg { width: 22px; height: 22px; color: #7fcece; }
    .ar-tap-text {
      font-family: 'Nunito', sans-serif;
      font-size: 0.7rem;
      font-weight: 800;
      color: rgba(255,255,255,0.7);
      letter-spacing: 0.5px;
    }

    /* Bottom control strip */
    .ar-bottom-bar {
      bottom: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 18px 20px 32px;
      background: linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%);
      pointer-events: auto;
    }
    .ar-ctrl-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      background: rgba(8, 28, 28, 0.75);
      backdrop-filter: blur(14px);
      border: 1.5px solid rgba(73, 166, 166, 0.3);
      border-radius: 16px;
      padding: 10px 16px;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .ar-ctrl-btn:hover {
      background: rgba(73, 166, 166, 0.22);
      border-color: #49a6a6;
      transform: translateY(-3px);
      box-shadow: 0 6px 18px rgba(73,166,166,0.35);
    }
    .ar-ctrl-btn svg { width: 20px; height: 20px; color: #7fcece; }
    .ar-ctrl-lbl {
      font-family: 'Nunito', sans-serif;
      font-size: 0.55rem;
      font-weight: 800;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ar-ctrl-btn.active {
      background: rgba(73,166,166,0.25);
      border-color: #49a6a6;
      box-shadow: 0 0 16px rgba(73,166,166,0.4);
    }
    .ar-ctrl-btn.active .ar-ctrl-lbl { color: #7fcece; }

    /* Scan reticle (shown in non-WebXR mode) */
    .ar-reticle-wrap {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -60%);
      pointer-events: none;
      z-index: 5;
    }
    .ar-reticle {
      width: 80px; height: 80px;
      border-radius: 50%;
      border: 2px solid rgba(73,166,166,0.7);
      position: relative;
      animation: arSpin 3s linear infinite;
    }
    @keyframes arSpin { to { transform: rotate(360deg); } }
    .ar-reticle::before, .ar-reticle::after {
      content: '';
      position: absolute;
      background: #49a6a6;
      border-radius: 2px;
    }
    .ar-reticle::before { width: 2px; height: 14px; top: -7px; left: calc(50% - 1px); }
    .ar-reticle::after  { width: 14px; height: 2px; left: -7px; top: calc(50% - 1px); }

    /* No-AR fallback notice */
    .ar-fallback-notice {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(8, 28, 28, 0.9);
      border: 1px solid rgba(73, 166, 166, 0.35);
      border-radius: 18px;
      padding: 22px 28px;
      text-align: center;
      max-width: 300px;
      z-index: 20;
      display: none;
    }
    .ar-fallback-notice .af-icon { font-size: 2.4rem; margin-bottom: 10px; }
    .ar-fallback-notice p {
      font-family: 'Nunito', sans-serif;
      font-size: 0.78rem;
      color: rgba(255,255,255,0.7);
      font-weight: 700;
      line-height: 1.5;
    }
    .ar-fallback-notice strong { color: #7fcece; }

    /* Scale slider */
    .ar-scale-wrap {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
      z-index: 10;
    }
    .ar-scale-label {
      font-family: 'Nunito', sans-serif;
      font-size: 0.55rem;
      font-weight: 800;
      color: rgba(127, 206, 206, 0.65);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    #arScaleSlider {
      -webkit-appearance: slider-vertical;
      writing-mode: bt-lr;
      appearance: slider-vertical;
      width: 6px;
      height: 130px;
      cursor: pointer;
      accent-color: #49a6a6;
    }

    /* Toast */
    .ar-toast {
      position: absolute;
      bottom: 110px;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: rgba(8, 28, 28, 0.9);
      border: 1px solid rgba(73,166,166,0.4);
      border-radius: 20px;
      padding: 7px 18px;
      font-family: 'Nunito', sans-serif;
      font-size: 0.72rem;
      font-weight: 800;
      color: #7fcece;
      white-space: nowrap;
      z-index: 20;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
    }
    .ar-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;

  // ── State ──────────────────────────────────────────────────────────────────
  let arEngine     = null;
  let arScene      = null;
  let arModel      = null;        // the ONE active pet root mesh
  let arXR         = null;        // XR experience helper
  let cameraStream = null;        // getUserMedia stream
  let arRotating   = false;
  let arScaleVal   = 1.0;
  let lastPetType  = null;
  let modelLoading = false;       // lock — prevents double-load race
  let baseScale    = 1.8;         // normalised scale stored after first load
  let shadowVisible = true;
  let floorMesh    = null;        // the visible floor quad

  // ── Helpers ────────────────────────────────────────────────────────────────
  function injectStyles () {
    if (document.getElementById('arStyles')) return;
    const s = document.createElement('style');
    s.id = 'arStyles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function getPetEmoji (type) {
    return { a: '🐱', b: '🐶', c: '🦜' }[type] || '🐾';
  }

  function arToast (msg) {
    const t = document.getElementById('arToastEl');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ── Build DOM ──────────────────────────────────────────────────────────────
  function buildARButton () {
    if (document.getElementById(AR_BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = AR_BTN_ID;
    btn.title = 'View your pet in AR';
    btn.innerHTML = `
      <svg class="ar-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 9V5a2 2 0 0 1 2-2h4"/>
        <path d="M16 3h4a2 2 0 0 1 2 2v4"/>
        <path d="M2 15v4a2 2 0 0 0 2 2h4"/>
        <path d="M16 21h4a2 2 0 0 0 2-2v-4"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 5v2M12 17v2M5 12h2M17 12h2"/>
      </svg>
      <span class="ar-btn-dot"></span>
      View in AR
    `;
    btn.addEventListener('click', openAR);
    document.body.appendChild(btn);
  }

  function buildAROverlay () {
    if (document.getElementById(AR_OV_ID)) return;

    const ov = document.createElement('div');
    ov.id = AR_OV_ID;
    ov.innerHTML = `
      <!-- Camera feed backdrop -->
      <video id="arVideo" autoplay playsinline muted></video>

      <!-- Babylon canvas -->
      <canvas id="${AR_CVS_ID}"></canvas>

      <!-- Top bar -->
      <div class="ar-hud ar-top-bar">
        <div class="ar-pet-tag">
          <div class="ar-pet-dot" id="arPetEmoji">🐾</div>
          <div class="ar-pet-info">
            <span class="ar-pet-name" id="arPetNameTag">Pet</span>
            <span class="ar-pet-sub">AR Mode</span>
          </div>
        </div>
        <button class="ar-close-btn" id="arCloseBtn" title="Exit AR">✕</button>
      </div>

      <!-- AR badge -->
      <div class="ar-hud ar-mode-badge"><span class="ar-rec"></span>Live AR</div>

      <!-- Reticle (non-WebXR) -->
      <div class="ar-reticle-wrap" id="arReticle">
        <div class="ar-reticle"></div>
      </div>

      <!-- Tap hint -->
      <div class="ar-tap-hint" id="arTapHint">
        <div class="ar-tap-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
          </svg>
        </div>
        <span class="ar-tap-text">Tap to place your pet</span>
      </div>

      <!-- Scale slider -->
      <div class="ar-scale-wrap">
        <span class="ar-scale-label">Size</span>
        <input type="range" id="arScaleSlider" min="0.3" max="3" step="0.05" value="1" orient="vertical">
        <span class="ar-scale-label" id="arScaleVal">1×</span>
      </div>

      <!-- Bottom controls -->
      <div class="ar-hud ar-bottom-bar">
        <div class="ar-ctrl-btn" id="arRotBtn" title="Toggle auto-rotate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span class="ar-ctrl-lbl">Rotate</span>
        </div>
        <div class="ar-ctrl-btn" id="arResetBtn" title="Reset position">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4l3 3"/>
          </svg>
          <span class="ar-ctrl-lbl">Reset</span>
        </div>
        <div class="ar-ctrl-btn" id="arFlipBtn" title="Flip model">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
          </svg>
          <span class="ar-ctrl-lbl">Mirror</span>
        </div>
        <div class="ar-ctrl-btn" id="arShadowBtn" title="Toggle shadow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="20" rx="8" ry="2"/>
            <path d="M12 4v12"/>
          </svg>
          <span class="ar-ctrl-lbl">Shadow</span>
        </div>
      </div>

      <!-- Fallback notice -->
      <div class="ar-fallback-notice" id="arFallbackNotice">
        <div class="af-icon">📷</div>
        <p>Camera access is required for AR.<br><strong>Allow camera</strong> in your browser settings and try again.</p>
      </div>

      <!-- Toast -->
      <div class="ar-toast" id="arToastEl"></div>
    `;

    document.body.appendChild(ov);

    // Wire up controls
    document.getElementById('arCloseBtn').addEventListener('click', closeAR);
    document.getElementById('arRotBtn').addEventListener('click', toggleRotate);
    document.getElementById('arResetBtn').addEventListener('click', resetModel);
    document.getElementById('arFlipBtn').addEventListener('click', flipModel);
    document.getElementById('arShadowBtn').addEventListener('click', toggleShadow);
    document.getElementById('arScaleSlider').addEventListener('input', onScaleChange);

    // Tap to place (non-WebXR)
    document.getElementById(AR_CVS_ID).addEventListener('click', onTapPlace);
  }

  // ── Open / Close ───────────────────────────────────────────────────────────
  async function openAR () {
    buildAROverlay();
    updateARPetTag();

    document.getElementById(AR_OV_ID).classList.add('open');
    document.getElementById(AR_BTN_ID).classList.add('ar-active');

    // Always try camera first
    await startCamera();

    // Try native WebXR immersive-ar
    const xrSupported = navigator.xr && await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
    if (xrSupported) {
      await launchWebXR();
    } else {
      // Fallback: render Babylon on transparent canvas over camera video
      await launchSimulatedAR();
    }

    // Hide reticle/hint after 3 s
    setTimeout(() => {
      const r = document.getElementById('arReticle');
      const h = document.getElementById('arTapHint');
      if (r) r.style.opacity = '0';
      if (h) h.style.display = 'none';
    }, 3500);
  }

  function closeAR () {
    // Stop XR session
    if (arXR) {
      try { arXR.baseExperience?.exitXRAsync(); } catch (e) {}
      arXR = null;
    }

    // Stop camera
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    const vid = document.getElementById('arVideo');
    if (vid) { vid.srcObject = null; }

    // Dispose Babylon fully
    if (arEngine) {
      try {
        arEngine.stopRenderLoop();
        if (arScene) { arScene.dispose(); arScene = null; }
        arEngine.dispose();
      } catch (e) {}
      arEngine = null;
    }

    // Reset state
    arModel      = null;
    floorMesh    = null;
    arRotating   = false;
    arScaleVal   = 1.0;
    modelLoading = false;
    shadowVisible = true;
    lastPetType  = null;

    document.getElementById(AR_OV_ID).classList.remove('open');
    document.getElementById(AR_BTN_ID).classList.remove('ar-active');
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  async function startCamera () {
    const vid = document.getElementById('arVideo');
    const notice = document.getElementById('arFallbackNotice');
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      vid.srcObject = cameraStream;
      await vid.play().catch(() => {});
      if (notice) notice.style.display = 'none';
    } catch (err) {
      console.warn('[AR] Camera access denied:', err.message);
      if (notice) notice.style.display = 'block';
      // Use a solid dark background as fallback
      vid.style.display = 'none';
    }
  }

  // ── Babylon setup — scene/lights/floor only; each launch mode sets its own camera ──
  function initBabylonAR (canvas) {
    if (arEngine) { try { arEngine.stopRenderLoop(); arEngine.dispose(); } catch (e) {} }

    arEngine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      alpha: true,
      premultipliedAlpha: false
    });

    arScene = new BABYLON.Scene(arEngine);
    arScene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    const hem = new BABYLON.HemisphericLight('arH', new BABYLON.Vector3(0, 1, 0), arScene);
    hem.intensity = 0.75;
    const dir = new BABYLON.DirectionalLight('arD', new BABYLON.Vector3(-1, -2, -1), arScene);
    dir.position = new BABYLON.Vector3(5, 10, 5);
    dir.intensity = 0.85;

    // Invisible floor — 100×100 so any tap hits it; used only for pick-ray
    floorMesh = BABYLON.MeshBuilder.CreateGround('arFloor', { width: 100, height: 100 }, arScene);
    floorMesh.position.y = FLOOR_Y;
    floorMesh.id = 'arFloor';
    floorMesh.isVisible = false;

    arEngine.runRenderLoop(() => {
      if (!arScene) return;
      if (arRotating && arModel) arModel.rotation.y += 0.012;
      arScene.render();
    });

    window.addEventListener('resize', () => arEngine && arEngine.resize());
  }

  function loadARModel (petType, onDone) {
    if (!arScene) return;
    // ── Guard: if already loading, ignore the duplicate request ──
    if (modelLoading) return;
    modelLoading = true;

    // ── Completely destroy the previous model before loading a new one ──
    if (arModel) {
      try {
        // Stop all animations that reference this model
        arScene.animationGroups.slice().forEach(ag => {
          try { ag.stop(); ag.dispose(); } catch (e) {}
        });
        // Dispose every child mesh + its material
        arModel.getChildMeshes(false).forEach(m => {
          try { m.material?.dispose(true, true); m.dispose(); } catch (e) {}
        });
        arModel.dispose();
      } catch (e) { console.warn('[AR] Cleanup error:', e); }
      arModel = null;
    }

    const file = MODELS[petType];
    if (!file) { modelLoading = false; return; }

    BABYLON.SceneLoader.ImportMesh('', '', file, arScene, (meshes, _ps, _sk, ags) => {
      // Extra safety: if another load snuck through, discard this one
      if (!arScene) { modelLoading = false; return; }

      arModel = meshes[0];

      // Fix materials
      arModel.getChildMeshes().forEach(mesh => {
        if (!mesh.material) return;
        const mat = mesh.material;
        if (mat.getClassName() === 'PBRMaterial') {
          if (mat.albedoTexture) {
            if (mat.albedoTexture.hasAlpha) {
              mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST;
              mat.alphaCutOff = 0.5;
              mat.useAlphaFromAlbedoTexture = true;
            } else {
              mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
              mat.useAlphaFromAlbedoTexture = false;
            }
          }
          if (!mat.metallicTexture) { mat.metallic = 0; mat.roughness = 1; }
          mat.backFaceCulling = true;
        }
      });

      // Normalise size
      const b = arModel.getHierarchyBoundingVectors();
      const sz = b.max.subtract(b.min);
      baseScale = 1.8 / Math.max(sz.x, sz.y, sz.z);
      arModel.scaling.setAll(baseScale * arScaleVal);
      arModel.computeWorldMatrix(true);

      // ── Place pet ON the floor (y=0), centred x/z ──
      const b2 = arModel.getHierarchyBoundingVectors();
      const ctr = BABYLON.Vector3.Center(b2.min, b2.max);
      // Shift so feet touch FLOOR_Y exactly
      arModel.position = new BABYLON.Vector3(-ctr.x, FLOOR_Y - b2.min.y, -ctr.z);

      // Play idle animation
      if (ags && ags.length > 0) { ags[0].start(true); }

      lastPetType  = petType;
      modelLoading = false;
      if (onDone) onDone();
    }, null, (_, msg) => {
      console.error('[AR] Model load error:', msg);
      modelLoading = false;
    });
  }

  // ── WebXR launch ───────────────────────────────────────────────────────────
  // ── WebXR launch — pet anchored to real-world surface via XR Anchors ─────────
  async function launchWebXR () {
    const canvas = document.getElementById(AR_CVS_ID);
    initBabylonAR(canvas);

    // FreeCamera — WebXR drives it via 6DOF device pose; pet is world-fixed
    const cam = new BABYLON.FreeCamera('arCam', new BABYLON.Vector3(0, 1.6, 0), arScene);
    cam.minZ = 0.01;
    arScene.activeCamera = cam;

    const petType = getCurrentPetType();
    let currentAnchor = null;

    try {
      arXR = await arScene.createDefaultXRExperienceAsync({
        uiOptions: { sessionMode: 'immersive-ar' },
        optionalFeatures: ['hit-test', 'anchors', 'dom-overlay', 'light-estimation']
      });

      const fm = arXR.baseExperience.featuresManager;

      // Reticle torus follows detected floor surface
      const reticleM = BABYLON.MeshBuilder.CreateTorus('reticle',
        { diameter: 0.18, thickness: 0.014, tessellation: 48 }, arScene);
      const rMat = new BABYLON.StandardMaterial('rm', arScene);
      rMat.emissiveColor   = new BABYLON.Color3(0.28, 0.65, 0.65);
      rMat.disableLighting = true;
      reticleM.material    = rMat;
      reticleM.isPickable  = false;
      reticleM.setEnabled(false);
      reticleM.rotationQuaternion = new BABYLON.Quaternion();

      // Hit-test snaps reticle to real surface every frame
      let latestHit = null;
      try {
        const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, 'latest');
        hitTest.onHitTestResultObservable.add((results) => {
          if (results.length) {
            latestHit = results[0];
            reticleM.setEnabled(true);
            latestHit.transformationMatrix.decompose(
              undefined, reticleM.rotationQuaternion, reticleM.position);
          } else {
            latestHit = null;
            reticleM.setEnabled(false);
          }
        });
      } catch (e) { console.warn('[AR] Hit-test unavailable'); }

      let anchorsFeature = null;
      try { anchorsFeature = fm.enableFeature(BABYLON.WebXRAnchorSystem, 'latest'); } catch (e) {}

      // Load model hidden until user taps a surface
      loadARModel(petType, () => {
        if (arModel) arModel.setEnabled(false);
        arToast('Point at the floor, then tap to anchor 🐾');
      });

      // Tap = anchor the pet at the detected surface
      canvas.addEventListener('click', async function onXRTap () {
        if (!arModel || !latestHit) return;

        // Detach previous anchor
        if (currentAnchor) {
          try { currentAnchor.onBeforeRenderObservable.clear(); await currentAnchor.remove(); }
          catch (e) {}
          currentAnchor = null;
        }

        // Position model at surface hit point, feet on floor
        latestHit.transformationMatrix.decompose(undefined, undefined, arModel.position);
        arModel.computeWorldMatrix(true);
        const b2 = arModel.getHierarchyBoundingVectors();
        arModel.position.y += FLOOR_Y - b2.min.y;
        arModel.setEnabled(true);

        // XR Anchor: keeps model nailed to real-world coordinates as camera moves
        if (anchorsFeature) {
          try {
            currentAnchor = await anchorsFeature.addAnchorPointUsingHitTestResultAsync(latestHit);
            currentAnchor.onBeforeRenderObservable.add(() => {
              if (!arModel || !currentAnchor.transformationMatrix) return;
              const p = new BABYLON.Vector3();
              currentAnchor.transformationMatrix.decompose(undefined, undefined, p);
              arModel.position.x = p.x;
              arModel.position.z = p.z;
              arModel.computeWorldMatrix(true);
              const b = arModel.getHierarchyBoundingVectors();
              arModel.position.y = p.y + (FLOOR_Y - b.min.y);
            });
            arToast('Anchored! Walk around freely 📍');
          } catch (e) {
            console.warn('[AR] Anchor failed:', e);
            arToast('Placed! (no anchor — may drift slightly)');
          }
        } else {
          arToast('Placed! 🐾');
        }
        reticleM.setEnabled(false);
      });

      arToast('WebXR ready — scan the floor then tap 🌟');
    } catch (e) {
      console.warn('[AR] WebXR failed, simulated AR:', e.message);
      await launchSimulatedAR();
    }
  }

  // ── Simulated AR — DeviceOrientationCamera so pet stays world-anchored ───────
  // Pet sits at a FIXED world position. Camera is driven by the phone gyroscope,
  // so rotating/walking with the phone changes viewpoint but never moves the pet —
  // it appears glued to the real floor under the camera video feed.
  async function launchSimulatedAR () {
    const canvas = document.getElementById(AR_CVS_ID);
    canvas.style.background = 'transparent';
    initBabylonAR(canvas);

    // iOS 13+ requires explicit gyro permission
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { await DeviceOrientationEvent.requestPermission(); } catch (e) {}
    }

    const hasDO = window.DeviceOrientationEvent && ('ontouchstart' in window);
    if (hasDO) {
      // Gyroscope camera: rotating the phone rotates the view; pet is world-static
      const cam = new BABYLON.DeviceOrientationCamera(
        'arDOCam', new BABYLON.Vector3(0, 1.4, -2.8), arScene);
      cam.setTarget(new BABYLON.Vector3(0, 0.6, 0));
      cam.minZ = 0.01;
      cam.fov  = 1.15;
      arScene.activeCamera = cam;
      cam.attachControl(canvas, true);
      arToast('Move your phone — pet stays anchored! 📍');
    } else {
      // Desktop fallback: ArcRotate orbits around the fixed pet
      const cam = new BABYLON.ArcRotateCamera(
        'arCam', -Math.PI / 2, 1.15, 5.5, new BABYLON.Vector3(0, 0.5, 0), arScene);
      cam.lowerRadiusLimit = 1.5;
      cam.upperRadiusLimit = 14;
      cam.wheelPrecision   = 50;
      cam.attachControl(canvas, true);
      arToast('Drag to orbit your pet 🐾');
    }

    const petType = getCurrentPetType();
    // Pet loads at world origin — position (0,0,0) — never moves with camera
    loadARModel(petType, () => arToast('Pet anchored to floor 📍'));
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  function toggleRotate () {
    arRotating = !arRotating;
    document.getElementById('arRotBtn')?.classList.toggle('active', arRotating);
    arToast(arRotating ? 'Auto-rotate on 🔄' : 'Auto-rotate off');
  }

  function resetModel () {
    if (!arModel) return;
    // Recentre on floor, reset rotation + scale
    arModel.rotation = BABYLON.Vector3.Zero();
    arScaleVal = 1.0;
    document.getElementById('arScaleSlider').value = 1;
    document.getElementById('arScaleVal').textContent = '1×';
    arModel.scaling.setAll(baseScale);
    // Re-snap to floor centre
    const b2 = arModel.getHierarchyBoundingVectors();
    arModel.position = new BABYLON.Vector3(0, FLOOR_Y - b2.min.y, 0);
    arToast('Reset ✅');
  }

  function flipModel () {
    if (!arModel) return;
    arModel.scaling.x *= -1;
    arToast('Mirrored 🔄');
  }

  function toggleShadow () {
    // Floor is invisible — nothing to toggle visually
    arToast('Floor is hidden in AR mode');
  }

  function onScaleChange (e) {
    arScaleVal = parseFloat(e.target.value);
    document.getElementById('arScaleVal').textContent = arScaleVal.toFixed(1) + '×';
    if (!arModel) return;
    const prevY = arModel.position.y;
    arModel.scaling.setAll(baseScale * arScaleVal);
    // Re-snap feet to floor after scale change
    arModel.computeWorldMatrix(true);
    const b2 = arModel.getHierarchyBoundingVectors();
    arModel.position.y = FLOOR_Y - b2.min.y + (prevY > FLOOR_Y ? prevY - FLOOR_Y : 0);
  }

  // Tap on the floor plane to MOVE the existing pet (never creates a new one)
  function onTapPlace (e) {
    if (!arModel || !arScene) return;

    // Ignore clicks that hit UI elements (buttons, sliders, etc.)
    if (e.target !== document.getElementById(AR_CVS_ID)) return;

    const canvas = document.getElementById(AR_CVS_ID);
    const rect   = canvas.getBoundingClientRect();
    const px     = e.clientX - rect.left;
    const py     = e.clientY - rect.top;

    const cam = arScene.activeCamera;
    if (!cam) return;

    // Pick against the floor plane only
    const pick = arScene.pick(px, py, m => m.id === 'arFloor');
    if (pick && pick.hit && pick.pickedPoint) {
      // Slide the pet to the tapped floor position, keep Y snapped to floor
      arModel.position.x = pick.pickedPoint.x;
      arModel.position.z = pick.pickedPoint.z;
      // Ensure feet stay on floor
      arModel.computeWorldMatrix(true);
      const b2 = arModel.getHierarchyBoundingVectors();
      arModel.position.y = FLOOR_Y - b2.min.y;
      arToast('Moved! 🐾');
    }
  }

  // ── Sync with current pet ──────────────────────────────────────────────────
  function getCurrentPetType () {
    // Access globals defined in the main HTML
    try {
      if (typeof petData !== 'undefined' && petData.type) return petData.type;
    } catch (e) {}
    return 'b';
  }

  function updateARPetTag () {
    const type = getCurrentPetType();
    const name = (() => { try { return petData?.name || 'Pet'; } catch (e) { return 'Pet'; } })();
    const emoji = document.getElementById('arPetEmoji');
    const nameTag = document.getElementById('arPetNameTag');
    if (emoji) emoji.textContent = getPetEmoji(type);
    if (nameTag) nameTag.textContent = name;
  }

  // Watch for pet changes while AR is open
  function watchPetChange () {
    setInterval(() => {
      if (!document.getElementById(AR_OV_ID)?.classList.contains('open')) return;
      const type = getCurrentPetType();
      if (type !== lastPetType && arScene) {
        updateARPetTag();
        loadARModel(type, () => arToast('Switched to ' + (PET_LABELS[type] || 'Pet') + '! 🐾'));
      }
    }, 1500);
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  function init () {
    injectStyles();
    buildARButton();
    buildAROverlay();
    watchPetChange();
    console.log('[AR] HELIX AR module loaded ✅');
  }

  // Wait for DOM and Babylon.js
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();