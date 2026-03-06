/**
 * ar.js — HELIX AR Mode
 *
 * Strategy:
 *  iOS Safari  → model-viewer Quick Look  (native ARKit, pet stands on floor via camera)
 *  Android     → model-viewer Scene Viewer / WebXR (ARCore)
 *
 * No 3D preview. Tap button → camera opens → pet appears on floor.
 *
 * Requires:
 *  .glb  files for Android
 *  .usdz files for iOS  (run convert-to-usdz.mjs to generate)
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────────
  const MV_SRC = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';

  const MODELS = {
    a: { glb: 'idle02.glb', usdz: 'idle02.usdz', label: 'Cat',  emoji: '🐱' },
    b: { glb: 'idle02.glb', usdz: 'idle02.usdz', label: 'Dog',  emoji: '🐶' },
    c: { glb: 'idle02.glb', usdz: 'idle02.usdz', label: 'Bird', emoji: '🦜' },
  };

  const AR_BTN_ID = 'arLaunchBtn';
  const MV_ID     = 'arMvHidden';   // hidden model-viewer used only as AR launcher

  // ─────────────────────────────────────────────────────────────────
  // DEVICE DETECTION
  // ─────────────────────────────────────────────────────────────────
  const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // iOS 12+ supports Quick Look AR in Safari
  const SUPPORTS_QUICK_LOOK = IS_IOS && 'relList' in document.createElement('a') &&
    document.createElement('a').relList.supports('ar');

  // Android WebXR / Scene Viewer
  const IS_ANDROID = /Android/.test(navigator.userAgent);

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  let mvReady    = false;
  let mvEl       = null;   // the hidden model-viewer element
  let loadingPet = false;

  // ─────────────────────────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────────────────────────
  const CSS = `
    /* ── Launch button ── */
    #${AR_BTN_ID} {
      position: fixed; left: 96px; bottom: 22px; z-index: 150;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 18px 10px 12px;
      background: rgba(8,28,28,.82); backdrop-filter: blur(16px);
      border: 1.5px solid rgba(73,166,166,.45); border-radius: 30px;
      cursor: pointer; font-family: 'Nunito', sans-serif; font-size: .78rem;
      font-weight: 800; color: #7fcece;
      box-shadow: 0 4px 20px rgba(73,166,166,.25);
      transition: transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .28s, border-color .28s, background .2s;
      user-select: none; letter-spacing: .3px;
      -webkit-tap-highlight-color: transparent;
      outline: none; border-style: solid;
    }
    #${AR_BTN_ID}:hover  {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 28px rgba(73,166,166,.5);
      border-color: #49a6a6; color: #fff;
    }
    #${AR_BTN_ID}:active { transform: scale(.96); }

    #${AR_BTN_ID}.ar-loading {
      opacity: .7; pointer-events: none;
    }
    #${AR_BTN_ID}.ar-loading .arb-label::after {
      content: ''; display: inline-block;
      width: 8px; height: 8px; margin-left: 6px;
      border: 2px solid rgba(127,206,206,.3);
      border-top-color: #7fcece; border-radius: 50%;
      animation: arBtnSpin .7s linear infinite;
      vertical-align: middle;
    }
    @keyframes arBtnSpin { to { transform: rotate(360deg); } }

    .arb-icon {
      width: 20px; height: 20px; flex-shrink: 0;
      transition: transform .3s, filter .3s;
    }
    #${AR_BTN_ID}:hover .arb-icon {
      transform: scale(1.15) rotate(-8deg);
      filter: drop-shadow(0 0 6px rgba(73,166,166,.9));
    }
    .arb-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #49a6a6; flex-shrink: 0;
      animation: arbBlink 2s ease-in-out infinite;
    }
    @keyframes arbBlink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
    .arb-label { pointer-events: none; }

    /* ── iOS fallback notice (shown if no USDZ yet) ── */
    .ar-notice-toast {
      position: fixed; bottom: 80px; left: 50%;
      transform: translateX(-50%) translateY(12px);
      background: rgba(8,28,28,.95); border: 1.5px solid rgba(73,166,166,.45);
      border-radius: 22px; padding: 10px 20px;
      font-family: 'Nunito', sans-serif; font-size: .74rem; font-weight: 800;
      color: #7fcece; white-space: nowrap;
      z-index: 9999; opacity: 0;
      transition: opacity .3s, transform .3s;
      pointer-events: none; text-align: center; line-height: 1.5;
    }
    .ar-notice-toast.show {
      opacity: 1; transform: translateX(-50%) translateY(0);
    }

    /* ── Hidden model-viewer container ── */
    #arMvContainer {
      position: fixed; width: 1px; height: 1px;
      overflow: hidden; opacity: 0; pointer-events: none;
      left: -9999px; top: -9999px; z-index: -1;
    }
    #${MV_ID} {
      display: block; width: 1px; height: 1px;
    }
  `;

  // ─────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────
  let toastEl = null;

  function showToast(msg, duration = 3500) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ar-notice-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), duration);
  }

  function setButtonLoading(on) {
    const btn = document.getElementById(AR_BTN_ID);
    if (!btn) return;
    btn.classList.toggle('ar-loading', on);
    btn.querySelector('.arb-label').textContent = on ? 'Opening…' : 'View in AR';
  }

  function getCurrentPetType() {
    try { if (typeof petData !== 'undefined' && petData.type) return petData.type; } catch (_) {}
    return 'b';
  }

  // ─────────────────────────────────────────────────────────────────
  // LOAD model-viewer SCRIPT
  // ─────────────────────────────────────────────────────────────────
  function loadMvScript() {
    return new Promise((resolve, reject) => {
      if (customElements.get('model-viewer')) { resolve(); return; }
      if (document.querySelector(`script[src="${MV_SRC}"]`)) {
        customElements.whenDefined('model-viewer').then(resolve).catch(reject);
        return;
      }
      const s = document.createElement('script');
      s.type = 'module'; s.src = MV_SRC; s.crossOrigin = 'anonymous';
      s.onload  = () => customElements.whenDefined('model-viewer').then(resolve).catch(reject);
      s.onerror = () => reject(new Error('model-viewer failed to load'));
      document.head.appendChild(s);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // BUILD / UPDATE hidden model-viewer
  // ─────────────────────────────────────────────────────────────────
  function ensureMvContainer() {
    if (document.getElementById('arMvContainer')) return;
    const wrap = document.createElement('div');
    wrap.id = 'arMvContainer';
    document.body.appendChild(wrap);
  }

  function buildMv(petType) {
    ensureMvContainer();
    const wrap  = document.getElementById('arMvContainer');
    const model = MODELS[petType] || MODELS['b'];

    // Remove old instance
    const old = document.getElementById(MV_ID);
    if (old) old.remove();

    const mv = document.createElement('model-viewer');
    mv.id = MV_ID;
    mv.setAttribute('src',          model.glb);
    mv.setAttribute('ios-src',      model.usdz);
    mv.setAttribute('ar',           '');
    mv.setAttribute('ar-modes',     IS_IOS ? 'quick-look' : 'scene-viewer webxr');
    mv.setAttribute('ar-scale',     'fixed');
    mv.setAttribute('ar-placement', 'floor');
    mv.setAttribute('loading',      'eager');
    mv.setAttribute('reveal',       'auto');
    mv.style.cssText = 'display:block;width:1px;height:1px;';

    mv.addEventListener('ar-status', (e) => {
      if (e.detail.status === 'failed') {
        setButtonLoading(false);
        showToast(IS_IOS
          ? '⚠️ AR failed — make sure .usdz file is on the server'
          : '⚠️ AR not supported on this device');
      }
      if (e.detail.status === 'session-started') {
        setButtonLoading(false);
      }
    });

    wrap.appendChild(mv);
    mvEl = mv;
  }

  // ─────────────────────────────────────────────────────────────────
  // DIRECT QUICK LOOK LINK (iOS fallback — bypasses model-viewer entirely)
  // This is the most reliable iOS path: a hidden <a rel="ar"> link
  // tapped programmatically. iOS Safari opens ARKit directly.
  // ─────────────────────────────────────────────────────────────────
  function triggerQuickLookDirect(usdzUrl) {
    // Remove existing anchor
    const old = document.getElementById('arQuickLookAnchor');
    if (old) old.remove();

    const a = document.createElement('a');
    a.id       = 'arQuickLookAnchor';
    a.rel      = 'ar';
    a.href     = usdzUrl;
    a.download = usdzUrl.split('/').pop();
    // Must contain an img child for Quick Look to activate
    const img  = document.createElement('img');
    img.src    = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    img.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;';
    a.appendChild(img);
    a.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(a);

    // Simulate tap — this must happen in same call stack as user gesture
    a.click();
    setButtonLoading(false);
  }

  // ─────────────────────────────────────────────────────────────────
  // ANDROID — Scene Viewer intent URL (most reliable on Android Chrome)
  // Opens Google's Scene Viewer AR directly, no model-viewer needed
  // ─────────────────────────────────────────────────────────────────
  function triggerSceneViewer(glbUrl) {
    // Scene Viewer intent — works on Android 10+ with ARCore
    const fullUrl = new URL(glbUrl, window.location.href).href;
    const intent  = `intent://arvr.google.com/scene-viewer/1.0?` +
      `file=${encodeURIComponent(fullUrl)}&mode=ar_preferred&resizable=false` +
      `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent(fullUrl)};end;`;
    window.location.href = intent;
    setButtonLoading(false);
  }

  // ─────────────────────────────────────────────────────────────────
  // MAIN TAP HANDLER
  // ─────────────────────────────────────────────────────────────────
  async function handleARTap() {
    if (loadingPet) return;
    loadingPet = true;
    setButtonLoading(true);

    const petType = getCurrentPetType();
    const model   = MODELS[petType] || MODELS['b'];

    // ── iOS Safari ────────────────────────────────────────────────
    if (IS_IOS) {
      if (!SUPPORTS_QUICK_LOOK) {
        showToast('⚠️ AR requires iOS 12 or later in Safari');
        setButtonLoading(false);
        loadingPet = false;
        return;
      }

      // Direct <a rel="ar"> method — most reliable, no dependency
      // MUST be called synchronously within the user gesture call stack
      triggerQuickLookDirect(model.usdz);
      loadingPet = false;
      return;
    }

    // ── Android Chrome ────────────────────────────────────────────
    if (IS_ANDROID) {
      triggerSceneViewer(model.glb);
      loadingPet = false;
      return;
    }

    // ── Desktop / other — use model-viewer as fallback ────────────
    try {
      await loadMvScript();
      buildMv(petType);
      mvReady = true;
      if (typeof mvEl.activateAR === 'function') {
        mvEl.activateAR();
      }
    } catch (err) {
      console.error('[AR]', err);
      showToast('⚠️ AR not available in this browser');
    }

    setButtonLoading(false);
    loadingPet = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // BUILD BUTTON
  // ─────────────────────────────────────────────────────────────────
  function buildButton() {
    if (document.getElementById(AR_BTN_ID)) return;

    const btn = document.createElement('button');
    btn.id    = AR_BTN_ID;
    btn.title = 'View pet in AR';
    btn.innerHTML = `
      <svg class="arb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 9V5a2 2 0 0 1 2-2h4"/>
        <path d="M16 3h4a2 2 0 0 1 2 2v4"/>
        <path d="M2 15v4a2 2 0 0 0 2 2h4"/>
        <path d="M16 21h4a2 2 0 0 0 2-2v-4"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span class="arb-dot"></span>
      <span class="arb-label">View in AR</span>`;

    // IMPORTANT: listener must be on direct user gesture — no async gap before tap
    btn.addEventListener('click', handleARTap);
    document.body.appendChild(btn);
  }

  // ─────────────────────────────────────────────────────────────────
  // INFER STYLES
  // ─────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('arCSS')) return;
    const s = document.createElement('style');
    s.id = 'arCSS'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────────
  // PRELOAD — start fetching model-viewer script in background on
  // non-iOS so it's already registered when user taps
  // ─────────────────────────────────────────────────────────────────
  function preload() {
    if (!IS_IOS) {
      loadMvScript().catch(() => {});
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // BOOTSTRAP
  // ─────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildButton();
    preload();
    console.log(
      `[AR] HELIX AR ready — ` +
      (IS_IOS     ? `iOS Quick Look (USDZ)` :
       IS_ANDROID ? `Android Scene Viewer (GLB)` :
                    `Desktop model-viewer fallback`)
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();