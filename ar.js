/**
 * ar.js — HELIX AR Mode
 *
 * Strategy:
 *  iOS Safari  → model-viewer Quick Look  (native ARKit, pet stands on floor via camera)
 *  Android     → Scene Viewer / WebXR (ARCore)
 *
 * No 3D preview. Tap button → camera opens → pet appears on floor.
 *
 * Fixes applied via model-viewer attributes (no file editing needed):
 *  - scale="25 25 25"         → dog was microscopic, now visible
 *  - orientation="90deg 0 0"  → dog was face-down, now stands upright
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────────
  const MV_SRC = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';

  // Always use idle02 for AR regardless of active pet type
  const AR_MODEL = {
    glb:   'idle02.glb',
    usdz:  'idle02.usdz',
  };

  const AR_BTN_ID = 'arLaunchBtn';
  const MV_ID     = 'arMvHidden';

  // ─────────────────────────────────────────────────────────────────
  // DEVICE DETECTION
  // ─────────────────────────────────────────────────────────────────
  const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const SUPPORTS_QUICK_LOOK = IS_IOS &&
    document.createElement('a').relList.supports('ar');

  const IS_ANDROID = /Android/.test(navigator.userAgent);

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  let mvEl       = null;
  let loadingAR  = false;

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
    #${AR_BTN_ID}:hover {
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

    /* ── Toast ── */
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

    /* ── Hidden model-viewer ── */
    #arMvContainer {
      position: fixed; width: 1px; height: 1px;
      overflow: hidden; opacity: 0; pointer-events: none;
      left: -9999px; top: -9999px; z-index: -1;
    }
    #${MV_ID} { display: block; width: 1px; height: 1px; }
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
  // BUILD hidden model-viewer
  // Key attributes:
  //   scale="25 25 25"        — makes dog visible (was microscopic)
  //   orientation="90deg 0 0" — rotates 90° on X so dog stands upright
  //                             instead of lying face-down on the floor
  // ─────────────────────────────────────────────────────────────────
  function buildMv() {
    let wrap = document.getElementById('arMvContainer');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'arMvContainer';
      document.body.appendChild(wrap);
    }

    const old = document.getElementById(MV_ID);
    if (old) old.remove();

    const mv = document.createElement('model-viewer');
    mv.id = MV_ID;
    mv.setAttribute('src',          AR_MODEL.glb);
    mv.setAttribute('ios-src',      AR_MODEL.usdz);
    mv.setAttribute('ar',           '');
    mv.setAttribute('ar-modes',     IS_IOS ? 'quick-look' : 'scene-viewer webxr');
    mv.setAttribute('ar-scale',     'fixed');
    mv.setAttribute('ar-placement', 'floor');
    mv.setAttribute('scale',        '25 25 25');       // ← size fix
    mv.setAttribute('orientation',  '90deg 0 0');      // ← angle fix — stands upright
    mv.setAttribute('loading',      'eager');
    mv.setAttribute('reveal',       'auto');
    mv.style.cssText = 'display:block;width:1px;height:1px;';

    mv.addEventListener('ar-status', (e) => {
      if (e.detail.status === 'failed') {
        setButtonLoading(false);
        showToast(IS_IOS
          ? '⚠️ Make sure idle02.usdz is uploaded to your server'
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
  // iOS — direct <a rel="ar"> Quick Look trigger
  // Most reliable iOS path — native browser feature, no JS library needed
  // Must be called synchronously within the user gesture
  // ─────────────────────────────────────────────────────────────────
  function triggerQuickLookDirect() {
    const old = document.getElementById('arQuickLookAnchor');
    if (old) old.remove();

    const a   = document.createElement('a');
    a.id      = 'arQuickLookAnchor';
    a.rel     = 'ar';
    a.href    = AR_MODEL.usdz;
    a.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';

    // Quick Look requires an <img> child to activate
    const img = document.createElement('img');
    img.src   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    img.style.cssText = 'width:1px;height:1px;';
    a.appendChild(img);
    document.body.appendChild(a);

    a.click();
    setButtonLoading(false);
  }

  // ─────────────────────────────────────────────────────────────────
  // Android — Scene Viewer intent URL
  // ─────────────────────────────────────────────────────────────────
  function triggerSceneViewer() {
    const fullUrl = new URL(AR_MODEL.glb, window.location.href).href;
    const intent  =
      `intent://arvr.google.com/scene-viewer/1.0?` +
      `file=${encodeURIComponent(fullUrl)}&mode=ar_preferred&resizable=false` +
      `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;` +
      `action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent(fullUrl)};end;`;
    window.location.href = intent;
    setButtonLoading(false);
  }

  // ─────────────────────────────────────────────────────────────────
  // MAIN TAP HANDLER
  // ─────────────────────────────────────────────────────────────────
  async function handleARTap() {
    if (loadingAR) return;
    loadingAR = true;
    setButtonLoading(true);

    // ── iOS Safari ────────────────────────────────────────────────
    if (IS_IOS) {
      if (!SUPPORTS_QUICK_LOOK) {
        showToast('⚠️ AR requires iOS 12 or later in Safari');
        setButtonLoading(false);
        loadingAR = false;
        return;
      }
      // Must stay synchronous with the tap gesture
      triggerQuickLookDirect();
      loadingAR = false;
      return;
    }

    // ── Android Chrome ────────────────────────────────────────────
    if (IS_ANDROID) {
      triggerSceneViewer();
      loadingAR = false;
      return;
    }

    // ── Desktop fallback — model-viewer ──────────────────────────
    try {
      await loadMvScript();
      buildMv();
      if (typeof mvEl.activateAR === 'function') {
        mvEl.activateAR();
      }
    } catch (err) {
      console.error('[AR]', err);
      showToast('⚠️ AR not available in this browser');
    }

    setButtonLoading(false);
    loadingAR = false;
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
    btn.addEventListener('click', handleARTap);
    document.body.appendChild(btn);
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
  // PRELOAD — fetch model-viewer script in background on non-iOS
  // ─────────────────────────────────────────────────────────────────
  function preload() {
    if (!IS_IOS) loadMvScript().catch(() => {});
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