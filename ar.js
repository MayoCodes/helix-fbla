/**
 * ar.js — HELIX AR Mode (mobile-first rewrite)
 *
 * Priority order:
 *  1. WebXR immersive-ar  (Android Chrome 81+, supported tablets)
 *     → true 6DOF tracking, hit-test surface detection, XR anchor world-lock
 *  2. Gyro fallback        (iOS Safari, older Android)
 *     → camera feed + Babylon rendered over it, model at fixed world coords,
 *       DeviceOrientation drives view rotation so model stays glued to floor
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────────────────────────
  const AR_BTN_ID  = 'arLaunchBtn';
  const AR_OV_ID   = 'arOverlay';
  const AR_CVS_ID  = 'arCanvas';
  const MODELS     = { a: 'Leopard_Hybrid_A2.glb', b: 'idle02.glb', c: 'Parrot_A4.glb' };
  const PET_LABELS = { a: 'Cat', b: 'Dog', c: 'Bird' };

  // ─────────────────────────────────────────────────────────────────
  // CSS  — full styles preserved from all previous versions
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
      user-select: none; letter-spacing: .3px;
    }
    #${AR_BTN_ID}:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 8px 28px rgba(73,166,166,.5); border-color: #49a6a6; color: #fff; }
    #${AR_BTN_ID}:hover .ar-btn-icon { transform: scale(1.15) rotate(-8deg); filter: drop-shadow(0 0 6px rgba(73,166,166,.9)); }
    #${AR_BTN_ID}:active { transform: scale(.97); }
    #${AR_BTN_ID}.ar-active { background: rgba(73,166,166,.25); border-color: #49a6a6; color: #fff; box-shadow: 0 0 22px rgba(73,166,166,.6); animation: arPulse 2s ease-in-out infinite; }
    @keyframes arPulse { 0%,100% { box-shadow: 0 0 22px rgba(73,166,166,.6); } 50% { box-shadow: 0 0 36px rgba(73,166,166,.9); } }
    .ar-btn-icon { width: 20px; height: 20px; flex-shrink: 0; transition: transform .3s, filter .3s; }
    .ar-btn-dot { width: 6px; height: 6px; border-radius: 50%; background: #49a6a6; animation: arDotBlink 2s ease-in-out infinite; flex-shrink: 0; }
    @keyframes arDotBlink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

    /* ── AR Fullscreen Overlay ── */
    #${AR_OV_ID} { display: none; position: fixed; inset: 0; z-index: 10000; background: #000; flex-direction: column; overflow: hidden; }
    #${AR_OV_ID}.open { display: flex; }

    #arVideo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }

    #${AR_CVS_ID} {
      position: absolute; inset: 0;
      width: 100% !important; height: 100% !important;
      z-index: 1; outline: none; touch-action: none;
      background: transparent !important;
    }

    /* ── HUD base ── */
    .ar-hud { position: absolute; z-index: 10; pointer-events: none; }

    /* Top bar */
    .ar-top-bar { top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: linear-gradient(180deg,rgba(0,0,0,.65) 0%,transparent 100%); pointer-events: auto; }
    .ar-pet-tag { display: flex; align-items: center; gap: 8px; background: rgba(8,28,28,.75); backdrop-filter: blur(14px); border: 1px solid rgba(73,166,166,.35); border-radius: 20px; padding: 6px 14px 6px 8px; }
    .ar-pet-dot { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#2d7a7a,#7fcece); display: flex; align-items: center; justify-content: center; font-size: .9rem; }
    .ar-pet-info { display: flex; flex-direction: column; line-height: 1.2; }
    .ar-pet-name { font-family: 'Lilita One',cursive; font-size: .82rem; color: #fff; }
    .ar-pet-sub  { font-family: 'Nunito',sans-serif; font-size: .6rem; font-weight: 800; color: #7fcece; text-transform: uppercase; letter-spacing: .5px; }
    .ar-close-btn { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid rgba(73,166,166,.4); background: rgba(8,28,28,.75); backdrop-filter: blur(14px); color: #7fcece; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; pointer-events: auto; transition: background .2s, color .2s; }
    .ar-close-btn:hover { background: #e05252; color: #fff; border-color: #e05252; }

    /* Mode badge */
    .ar-mode-badge { position: absolute; top: 70px; left: 50%; transform: translateX(-50%); background: rgba(73,166,166,.15); border: 1px solid rgba(73,166,166,.4); border-radius: 20px; padding: 4px 14px; font-family: 'Nunito',sans-serif; font-size: .62rem; font-weight: 800; color: #7fcece; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; pointer-events: none; }
    .ar-mode-badge .ar-rec { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #49a6a6; margin-right: 5px; vertical-align: middle; animation: arDotBlink 1.2s ease-in-out infinite; }

    /* Tap hint (fades in then out) */
    .ar-tap-hint { position: absolute; bottom: 120px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; transition: opacity .6s; }
    .ar-tap-circle { width: 54px; height: 54px; border-radius: 50%; border: 2px solid rgba(73,166,166,.6); display: flex; align-items: center; justify-content: center; animation: arRipple 1.8s ease-in-out infinite; }
    @keyframes arRipple { 0%,100% { box-shadow: 0 0 0 0 rgba(73,166,166,.4); } 50% { box-shadow: 0 0 0 14px rgba(73,166,166,0); } }
    .ar-tap-circle svg { width: 22px; height: 22px; color: #7fcece; }
    .ar-tap-text { font-family: 'Nunito',sans-serif; font-size: .7rem; font-weight: 800; color: rgba(255,255,255,.7); letter-spacing: .5px; text-align: center; white-space: nowrap; }

    /* Scan reticle (CSS ring shown in gyro mode) */
    .ar-reticle-wrap { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-60%); pointer-events: none; z-index: 5; }
    .ar-reticle { width: 80px; height: 80px; border-radius: 50%; border: 2px solid rgba(73,166,166,.7); position: relative; animation: arSpin 3s linear infinite; }
    @keyframes arSpin { to { transform: rotate(360deg); } }
    .ar-reticle::before,.ar-reticle::after { content: ''; position: absolute; background: #49a6a6; border-radius: 2px; }
    .ar-reticle::before { width: 2px; height: 14px; top: -7px; left: calc(50% - 1px); }
    .ar-reticle::after  { width: 14px; height: 2px; left: -7px; top: calc(50% - 1px); }

    /* Bottom controls */
    .ar-bottom-bar { bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 18px 20px 32px; background: linear-gradient(0deg,rgba(0,0,0,.65) 0%,transparent 100%); pointer-events: auto; }
    .ar-ctrl-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; background: rgba(8,28,28,.75); backdrop-filter: blur(14px); border: 1.5px solid rgba(73,166,166,.3); border-radius: 16px; padding: 10px 16px; transition: all .25s cubic-bezier(.34,1.56,.64,1); }
    .ar-ctrl-btn:hover { background: rgba(73,166,166,.22); border-color: #49a6a6; transform: translateY(-3px); box-shadow: 0 6px 18px rgba(73,166,166,.35); }
    .ar-ctrl-btn svg { width: 20px; height: 20px; color: #7fcece; }
    .ar-ctrl-lbl { font-family: 'Nunito',sans-serif; font-size: .55rem; font-weight: 800; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: .5px; }
    .ar-ctrl-btn.active,.ar-ctrl-btn.on { background: rgba(73,166,166,.25); border-color: #49a6a6; box-shadow: 0 0 16px rgba(73,166,166,.4); }
    .ar-ctrl-btn.active .ar-ctrl-lbl,.ar-ctrl-btn.on .ar-ctrl-lbl { color: #7fcece; }

    /* Scale slider */
    .ar-scale-wrap { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: auto; z-index: 10; }
    .ar-scale-label { font-family: 'Nunito',sans-serif; font-size: .55rem; font-weight: 800; color: rgba(127,206,206,.65); text-transform: uppercase; letter-spacing: .5px; }
    #arScaleSlider { -webkit-appearance: slider-vertical; writing-mode: bt-lr; appearance: slider-vertical; width: 6px; height: 130px; cursor: pointer; accent-color: #49a6a6; }

    /* Camera permission notice */
    .ar-fallback-notice { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(8,28,28,.9); border: 1px solid rgba(73,166,166,.35); border-radius: 18px; padding: 22px 28px; text-align: center; max-width: 300px; z-index: 20; display: none; }
    .ar-fallback-notice .af-icon { font-size: 2.4rem; margin-bottom: 10px; }
    .ar-fallback-notice p { font-family: 'Nunito',sans-serif; font-size: .78rem; color: rgba(255,255,255,.7); font-weight: 700; line-height: 1.5; }
    .ar-fallback-notice strong { color: #7fcece; }

    /* Toast */
    .ar-toast { position: absolute; bottom: 110px; left: 50%; transform: translateX(-50%) translateY(10px); background: rgba(8,28,28,.92); border: 1px solid rgba(73,166,166,.4); border-radius: 20px; padding: 7px 18px; font-family: 'Nunito',sans-serif; font-size: .72rem; font-weight: 800; color: #7fcece; white-space: nowrap; z-index: 20; opacity: 0; transition: opacity .3s, transform .3s; pointer-events: none; }
    .ar-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  `;
  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  let arEngine      = null;
  let arScene       = null;
  let arModel       = null;       // ONE active pet mesh — never duplicated
  let arAnchorNode  = null;       // TransformNode that model is parented to
  let arXR          = null;
  let cameraStream  = null;
  let modelLoading  = false;
  let lastPetType   = null;
  let baseScale     = 1.8;
  let arScaleVal    = 1.0;
  let arRotating    = false;

  // Gyro fallback state
  let gyroAlpha = 0, gyroBeta = 0, gyroGamma = 0;
  let gyroHandler = null;

  // ─────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || ('ontouchstart' in window && navigator.maxTouchPoints > 1);

  function getPetEmoji (t) { return { a:'🐱', b:'🐶', c:'🦜' }[t] || '🐾'; }

  function toast (msg) {
    const el = document.getElementById('arToastEl');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function setHint (msg) {
    const el  = document.getElementById('arTapHint');
    const txt = document.getElementById('arHintTxt');
    if (txt) txt.textContent = msg;
    if (el)  el.style.opacity = '1';
  }
  function hideHint () {
    const el = document.getElementById('arTapHint');
    if (el) el.style.opacity = '0';
  }

  // ─────────────────────────────────────────────────────────────────
  // INJECT STYLES + BUILD DOM
  // ─────────────────────────────────────────────────────────────────
  function injectStyles () {
    if (document.getElementById('arCSS')) return;
    const s = document.createElement('style');
    s.id = 'arCSS';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildButton () {
    if (document.getElementById(AR_BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = AR_BTN_ID;
    btn.title = 'View pet in AR';
    btn.innerHTML = `
      <svg class="ar-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 9V5a2 2 0 0 1 2-2h4"/><path d="M16 3h4a2 2 0 0 1 2 2v4"/>
        <path d="M2 15v4a2 2 0 0 0 2 2h4"/><path d="M16 21h4a2 2 0 0 0 2-2v-4"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span class="ar-btn-dot"></span>View in AR`;
    btn.addEventListener('click', openAR);
    document.body.appendChild(btn);
  }

  function buildOverlay () {
    if (document.getElementById(AR_OV_ID)) return;
    const ov = document.createElement('div');
    ov.id = AR_OV_ID;
    ov.innerHTML = `
      <video id="arVideo" autoplay playsinline muted></video>
      <canvas id="${AR_CVS_ID}"></canvas>

      <!-- Top bar -->
      <div class="ar-hud ar-top-bar">
        <div class="ar-pet-tag">
          <div class="ar-pet-dot" id="arPetEmoji">🐾</div>
          <div class="ar-pet-info">
            <span class="ar-pet-name" id="arPetName">Pet</span>
            <span class="ar-pet-sub">AR Mode</span>
          </div>
        </div>
        <button class="ar-close-btn" id="arCloseBtn">✕</button>
      </div>

      <!-- Mode badge -->
      <div class="ar-hud ar-mode-badge"><span class="ar-rec"></span><span id="arModeLbl">Live AR</span></div>

      <!-- Tap hint (shown initially, fades after placement) -->
      <div class="ar-tap-hint" id="arTapHint" style="opacity:0">
        <div class="ar-tap-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
          </svg>
        </div>
        <span class="ar-tap-text" id="arHintTxt">Point at floor then tap</span>
      </div>

      <!-- Scan reticle (gyro mode) -->
      <div class="ar-reticle-wrap" id="arReticle" style="display:none">
        <div class="ar-reticle"></div>
      </div>

      <!-- Scale slider -->
      <div class="ar-scale-wrap">
        <span class="ar-scale-label">Size</span>
        <input type="range" id="arScaleSlider" min="0.3" max="3" step="0.05" value="1" orient="vertical">
        <span class="ar-scale-label" id="arScaleVal">1×</span>
      </div>

      <!-- Bottom controls -->
      <div class="ar-hud ar-bottom-bar">
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
        <div class="ar-ctrl-btn" id="arShadowBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="20" rx="8" ry="2"/><path d="M12 4v12"/></svg>
          <span class="ar-ctrl-lbl">Shadow</span>
        </div>
      </div>

      <!-- Camera permission fallback -->
      <div class="ar-fallback-notice" id="arFallbackNotice">
        <div class="af-icon">📷</div>
        <p>Camera access required for AR.<br><strong>Allow camera</strong> in browser settings.</p>
      </div>

      <div class="ar-toast" id="arToastEl"></div>
    `;
    document.body.appendChild(ov);

    document.getElementById('arCloseBtn').addEventListener('click', closeAR);
    document.getElementById('arRotBtn').addEventListener('click', toggleRotate);
    document.getElementById('arResetBtn').addEventListener('click', resetModel);
    document.getElementById('arFlipBtn').addEventListener('click', flipModel);
    document.getElementById('arShadowBtn').addEventListener('click', toggleShadow);
    document.getElementById('arScaleSlider').addEventListener('input', onScale);
    document.getElementById(AR_CVS_ID).addEventListener('click', onTap);
    document.getElementById(AR_CVS_ID).addEventListener('touchend', onTap, { passive: true });
  }

  // ─────────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────────
  async function openAR () {
    buildOverlay();
    syncPetTag();
    document.getElementById(AR_OV_ID).classList.add('open');
    document.getElementById(AR_BTN_ID).classList.add('ar-active');

    await startCamera();

    const xrOK = !!(navigator.xr) &&
      await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);

    if (xrOK) {
      document.getElementById('arModeLbl').textContent = 'WebXR AR';
      await launchWebXR();
    } else {
      document.getElementById('arModeLbl').textContent = 'Camera AR';
      await launchGyroAR();
    }
  }

  function closeAR () {
    // Kill XR
    if (arXR) { try { arXR.baseExperience?.exitXRAsync(); } catch (e) {} arXR = null; }

    // Kill gyro listener
    if (gyroHandler) { window.removeEventListener('deviceorientation', gyroHandler); gyroHandler = null; }

    // Kill camera
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    const vid = document.getElementById('arVideo');
    if (vid) vid.srcObject = null;

    // Kill Babylon
    disposeScene();

    // Reset state
    arRotating = false; arScaleVal = 1.0; modelLoading = false; lastPetType = null;
    arModel = null; arAnchorNode = null;

    document.getElementById(AR_OV_ID).classList.remove('open');
    document.getElementById(AR_BTN_ID).classList.remove('ar-active');
  }

  function disposeScene () {
    if (arEngine) {
      try { arEngine.stopRenderLoop(); } catch (e) {}
      try { arScene?.dispose(); } catch (e) {}
      try { arEngine.dispose(); } catch (e) {}
      arEngine = null; arScene = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // CAMERA
  // ─────────────────────────────────────────────────────────────────
  async function startCamera () {
    const vid = document.getElementById('arVideo');
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      vid.srcObject = cameraStream;
      await vid.play().catch(() => {});
      document.getElementById('arFallbackNotice').style.display = 'none';
    } catch (err) {
      console.warn('[AR] Camera denied:', err.message);
      document.getElementById('arFallbackNotice').style.display = 'block';
      vid.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // BABYLON SCENE INIT
  // ─────────────────────────────────────────────────────────────────
  function initScene () {
    disposeScene();

    const canvas = document.getElementById(AR_CVS_ID);

    // CRITICAL on mobile: match canvas pixel size to screen before engine init
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    arEngine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      alpha: true,
      premultipliedAlpha: false,
      antialias: true
    });
    arEngine.setHardwareScalingLevel(1 / (window.devicePixelRatio || 1));

    arScene = new BABYLON.Scene(arEngine);
    arScene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // fully transparent → camera shows through

    // Lights
    const h = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0, 1, 0), arScene);
    h.intensity = 0.8;
    const d = new BABYLON.DirectionalLight('d', new BABYLON.Vector3(-1, -2, -1), arScene);
    d.position = new BABYLON.Vector3(5, 10, 5);
    d.intensity = 1.0;

    // Invisible large floor for tap picking
    const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: 200, height: 200 }, arScene);
    floor.position.y = 0;
    floor.isVisible  = false;
    floor.isPickable = true;

    // Anchor node — model is parented here; updating this node moves the model
    arAnchorNode = new BABYLON.TransformNode('anchor', arScene);
    arAnchorNode.position = new BABYLON.Vector3(0, 0, 0);

    arEngine.runRenderLoop(() => {
      if (!arScene) return;
      if (arRotating && arModel) arModel.rotation.y += 0.014;
      arScene.render();
    });

    window.addEventListener('resize', onResize);
    return canvas;
  }

  function onResize () {
    if (!arEngine) return;
    const canvas = document.getElementById(AR_CVS_ID);
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    arEngine.resize();
  }

  // ─────────────────────────────────────────────────────────────────
  // MODEL LOADING  — strictly ONE model at a time
  // ─────────────────────────────────────────────────────────────────
  function loadARModel (petType, onDone) {
    if (!arScene)         return;
    if (modelLoading)     return;  // block re-entrant calls
    modelLoading = true;

    // Full disposal of previous model
    if (arModel) {
      try {
        arScene.animationGroups.slice().forEach(ag => { try { ag.stop(); ag.dispose(); } catch (_) {} });
        arModel.getChildMeshes(false).forEach(m => { try { m.material?.dispose(true,true); m.dispose(); } catch (_) {} });
        arModel.dispose();
      } catch (e) {}
      arModel = null;
    }

    const file = MODELS[petType];
    if (!file) { modelLoading = false; return; }

    BABYLON.SceneLoader.ImportMesh('', '', file, arScene, (meshes, _ps, _sk, ags) => {
      if (!arScene) { modelLoading = false; return; }

      const root = meshes[0];

      // Fix PBR materials for transparency / mobile drivers
      root.getChildMeshes().forEach(m => {
        const mat = m.material;
        if (!mat || mat.getClassName() !== 'PBRMaterial') return;
        if (mat.albedoTexture?.hasAlpha) {
          mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST;
          mat.alphaCutOff = 0.5;
          mat.useAlphaFromAlbedoTexture = true;
        } else {
          mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
          mat.useAlphaFromAlbedoTexture = false;
        }
        if (!mat.metallicTexture) { mat.metallic = 0; mat.roughness = 1; }
        mat.backFaceCulling = true;
        mat.freeze(); // improves mobile GPU perf
      });

      // Normalise size
      const b1  = root.getHierarchyBoundingVectors();
      const sz  = b1.max.subtract(b1.min);
      baseScale = 1.8 / Math.max(sz.x, sz.y, sz.z);
      root.scaling.setAll(baseScale * arScaleVal);
      root.computeWorldMatrix(true);

      // Snap feet to y=0
      const b2 = root.getHierarchyBoundingVectors();
      root.position.y = -b2.min.y;

      // Parent to anchor node so world-locking the anchor moves the whole model
      root.parent = arAnchorNode;

      // Play first idle animation
      if (ags?.length) ags[0].start(true);

      arModel    = root;
      lastPetType = petType;
      modelLoading = false;
      if (onDone) onDone();
    }, null, (_, msg) => {
      console.error('[AR] Load error:', msg);
      modelLoading = false;
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PATH 1 — WebXR  (Android Chrome, best AR quality)
  // ─────────────────────────────────────────────────────────────────
  async function launchWebXR () {
    const canvas = initScene();

    // FreeCamera — WebXR replaces its view/proj matrices every frame with device pose
    const cam = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 1.6, 0), arScene);
    cam.minZ = 0.01;
    arScene.activeCamera = cam;

    const petType = getCurrentPetType();
    let xrAnchor  = null;

    try {
      arXR = await arScene.createDefaultXRExperienceAsync({
        uiOptions: { sessionMode: 'immersive-ar', requiredFeatures: ['hit-test'] },
        optionalFeatures: ['anchors', 'dom-overlay', 'light-estimation']
      });

      const fm = arXR.baseExperience.featuresManager;

      // ── Reticle ring that tracks detected floor surface ──
      const ring = BABYLON.MeshBuilder.CreateTorus('ring',
        { diameter: 0.22, thickness: 0.016, tessellation: 56 }, arScene);
      ring.rotationQuaternion = new BABYLON.Quaternion();
      ring.isPickable = false;
      ring.setEnabled(false);
      const rMat = new BABYLON.StandardMaterial('rm', arScene);
      rMat.emissiveColor   = new BABYLON.Color3(0.28, 0.65, 0.65);
      rMat.disableLighting = true;
      ring.material = rMat;

      // ── Hit-test — updates ring position every XR frame ──
      let latestHit = null;
      const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, 'latest');
      hitTest.onHitTestResultObservable.add(results => {
        if (results.length) {
          latestHit = results[0];
          ring.setEnabled(true);
          latestHit.transformationMatrix.decompose(
            undefined, ring.rotationQuaternion, ring.position);
        } else {
          latestHit = null;
          ring.setEnabled(false);
        }
      });

      // ── Anchor system ──
      let anchorsFeature = null;
      try { anchorsFeature = fm.enableFeature(BABYLON.WebXRAnchorSystem, 'latest'); } catch (_) {}

      // Load model hidden; show once user taps
      loadARModel(petType, () => {
        arAnchorNode.setEnabled(false);
        setHint('Point at the floor, then tap to place 🐾');
      });

      // ── Tap to place + anchor ──
      let placed = false;
      canvas.addEventListener('click', async () => {
        if (!arModel || !latestHit) return;

        // Remove old anchor
        if (xrAnchor) {
          try { xrAnchor.onBeforeRenderObservable.clear(); await xrAnchor.remove(); }
          catch (_) {}
          xrAnchor = null;
        }

        // Move anchor node to hit-test surface
        latestHit.transformationMatrix.decompose(undefined, undefined, arAnchorNode.position);
        arAnchorNode.setEnabled(true);
        ring.setEnabled(false);
        hideHint();

        // Create XR anchor — every frame its matrix is applied to arAnchorNode
        if (anchorsFeature) {
          try {
            xrAnchor = await anchorsFeature.addAnchorPointUsingHitTestResultAsync(latestHit);
            xrAnchor.onBeforeRenderObservable.add(() => {
              if (!xrAnchor?.transformationMatrix) return;
              xrAnchor.transformationMatrix.decompose(
                undefined, undefined, arAnchorNode.position);
            });
            toast(placed ? 'Moved & re-anchored 📍' : 'Anchored! Walk freely 📍');
          } catch (e) {
            toast('Placed! 🐾');
          }
        } else {
          toast('Placed! 🐾');
        }
        placed = true;
      });

      toast('Scan the floor — a ring will appear 🌟');
    } catch (e) {
      console.warn('[AR] WebXR failed, falling back to gyro AR:', e.message);
      disposeScene();
      await launchGyroAR();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PATH 2 — Gyro AR  (iOS Safari + older Android)
  //
  // How it works:
  //   • Camera feed plays in the <video> element (real world background).
  //   • Babylon canvas is transparent and overlaid on top.
  //   • The pet is placed at a FIXED world-space position (arAnchorNode).
  //   • DeviceOrientation events rotate the Babylon camera around the world,
  //     so the pet appears to stay glued to the real floor regardless of how
  //     the phone is turned.
  //   • First tap places the pet (moves arAnchorNode to a position in front
  //     of the camera). Subsequent taps reposition it.
  // ─────────────────────────────────────────────────────────────────
  async function launchGyroAR () {
    // Request gyro permission on iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { await DeviceOrientationEvent.requestPermission(); } catch (_) {}
    }

    initScene();

    // ── Camera: FreeCamera positioned at eye level, looking forward ──
    // We drive it manually from gyro data so it rotates in place (no translation).
    // The pet stays at arAnchorNode.position = constant world point.
    const W = window.innerWidth, H = window.innerHeight;
    const cam = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 1.4, 0), arScene);
    cam.setTarget(new BABYLON.Vector3(0, 0.5, 2));  // looking forward initially
    cam.minZ    = 0.01;
    cam.maxZ    = 1000;
    cam.fov     = 1.05;  // ~60°, close to typical phone rear camera FOV
    cam.inputs.clear();  // disable all keyboard/mouse inputs; we drive it manually
    arScene.activeCamera = cam;

    // Place pet 2 m in front of camera at floor level
    arAnchorNode.position.set(0, 0, 2);

    const petType = getCurrentPetType();
    // Show CSS reticle crosshair while model loads
    const reticleEl = document.getElementById('arReticle');
    if (reticleEl) reticleEl.style.display = 'block';

    loadARModel(petType, () => {
      if (reticleEl) reticleEl.style.display = 'none';
      setHint('Pet anchored — tap floor to reposition');
      setTimeout(hideHint, 4000);
      toast('Pet placed! Move your phone around 📍');
    });

    // ── Gyro → camera rotation ──
    // DeviceOrientation gives absolute device attitude in Euler angles.
    // We build a rotation quaternion from alpha/beta/gamma and apply it to
    // the camera's rotation quaternion directly — this rotates the entire
    // scene view without touching world-space objects.

    const toRad = Math.PI / 180;
    let initialAlpha = null;

    cam.rotationQuaternion = new BABYLON.Quaternion();

    gyroHandler = (e) => {
      if (e.alpha === null) return;

      // Normalise alpha relative to when AR was opened (so forward = where you started)
      if (initialAlpha === null) initialAlpha = e.alpha;
      const alpha  = (e.alpha  - initialAlpha + 360) % 360;
      const beta   = e.beta  || 0;
      const gamma  = e.gamma || 0;

      // Convert device Euler → quaternion that represents the camera looking through the phone
      // Standard WebXR / Google AR Core mapping for portrait mode:
      //   alpha = yaw around Z (compass heading)
      //   beta  = tilt forward/back (pitch)
      //   gamma = tilt left/right (roll)

      const qAlpha  = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, -alpha  * toRad);
      const qBeta   = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, (beta - 90) * toRad);
      const qGamma  = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, gamma  * toRad);

      // Combine: apply in the right order for a rear-facing camera in portrait
      cam.rotationQuaternion = qAlpha.multiply(qBeta).multiply(qGamma);
    };

    window.addEventListener('deviceorientation', gyroHandler, { passive: true });

    // If no gyro events fire within 1s, show a static view message
    const gyroCheck = setTimeout(() => {
      toast('No gyro detected — drag to look around');
      // Enable touch-drag as fallback
      cam.inputs.addMouse();
      cam.inputs.addTouch();
      cam.attachControl(document.getElementById(AR_CVS_ID), true);
    }, 1200);

    window.addEventListener('deviceorientation', () => clearTimeout(gyroCheck), { once: true });
  }

  // ─────────────────────────────────────────────────────────────────
  // TAP — move arAnchorNode (repositions the whole model)
  // ─────────────────────────────────────────────────────────────────
  function onTap (e) {
    if (!arModel || !arScene) return;

    // Don't fire if tap was on a UI control
    const target = e.target || e.srcElement;
    if (target !== document.getElementById(AR_CVS_ID)) return;

    const canvas = document.getElementById(AR_CVS_ID);
    const rect   = canvas.getBoundingClientRect();

    // Support both mouse and touch events
    const clientX = e.touches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.touches ? e.changedTouches[0].clientY : e.clientY;
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    // Pick against the invisible floor plane
    const pick = arScene.pick(px, py, m => m.name === 'floor');
    if (pick?.hit && pick.pickedPoint) {
      arAnchorNode.position.x = pick.pickedPoint.x;
      arAnchorNode.position.z = pick.pickedPoint.z;
      // Y stays 0 (floor level); model's internal y-offset keeps feet on floor
      toast('Moved! 🐾');
    } else {
      // Fallback: place 2.5m in front of camera's current look direction
      const cam = arScene.activeCamera;
      if (!cam) return;
      const fwd = cam.getForwardRay(2.5).direction;
      arAnchorNode.position.x = cam.position.x + fwd.x * 2.5;
      arAnchorNode.position.z = cam.position.z + fwd.z * 2.5;
      toast('Placed! 🐾');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // CONTROLS
  // ─────────────────────────────────────────────────────────────────
  function toggleRotate () {
    arRotating = !arRotating;
    document.getElementById('arRotBtn')?.classList.toggle('active', arRotating);
    toast(arRotating ? 'Auto-rotate on 🔄' : 'Auto-rotate off');
  }

  function resetModel () {
    if (!arModel || !arAnchorNode) return;
    arAnchorNode.position.set(0, 0, 2);
    arModel.rotation.set(0, 0, 0);
    arScaleVal = 1.0;
    const sl = document.getElementById('arScaleSlider');
    const lbl = document.getElementById('arScaleVal');
    if (sl) sl.value = 1;
    if (lbl) lbl.textContent = '1×';
    arModel.scaling.setAll(baseScale);
    toast('Reset ✅');
  }

  function flipModel () {
    if (!arModel) return;
    arModel.scaling.x *= -1;
    toast('Mirrored 🔄');
  }

  function toggleShadow () {
    // Floor is invisible in AR — inform user
    toast('Floor hidden in AR mode');
  }

  function onScale (e) {
    arScaleVal = parseFloat(e.target.value);
    const lbl = document.getElementById('arScaleVal');
    if (lbl) lbl.textContent = arScaleVal.toFixed(1) + '×';
    if (!arModel) return;
    arModel.scaling.setAll(baseScale * arScaleVal);
    // Recompute foot-snap
    arModel.computeWorldMatrix(true);
    const b = arModel.getHierarchyBoundingVectors();
    arModel.position.y = -b.min.y / (baseScale * arScaleVal) * (baseScale * arScaleVal);
  }

  // ─────────────────────────────────────────────────────────────────
  // PET TAG SYNC
  // ─────────────────────────────────────────────────────────────────
  function getCurrentPetType () {
    try { if (typeof petData !== 'undefined' && petData.type) return petData.type; } catch (_) {}
    return 'b';
  }

  function syncPetTag () {
    const type = getCurrentPetType();
    const name = (() => { try { return petData?.name || 'Pet'; } catch (_) { return 'Pet'; } })();
    const emoji = document.getElementById('arPetEmoji');
    const nameEl = document.getElementById('arPetName');
    if (emoji)  emoji.textContent  = getPetEmoji(type);
    if (nameEl) nameEl.textContent = name;
  }

  function watchPetChange () {
    setInterval(() => {
      if (!document.getElementById(AR_OV_ID)?.classList.contains('open')) return;
      const type = getCurrentPetType();
      if (type !== lastPetType && arScene && !modelLoading) {
        syncPetTag();
        loadARModel(type, () => toast('Switched to ' + (PET_LABELS[type] || 'Pet') + '! 🐾'));
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
    console.log('[AR] HELIX AR loaded ✅  mobile=' + isMobile);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();