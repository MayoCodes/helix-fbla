(function () {
  // ── Styles ──
  const style = document.createElement('style');
  style.textContent = `
    #helix-overlay-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 99999;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(6, 11, 11, 0.85);
      border: 1px solid rgba(73, 166, 166, 0.35);
      box-shadow: 0 0 24px rgba(73, 166, 166, 0.15), 0 4px 20px rgba(0,0,0,0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                  box-shadow 0.3s ease,
                  border-color 0.3s ease;
      text-decoration: none;
      overflow: hidden;
    }

    #helix-overlay-btn:hover {
      transform: scale(1.12) translateY(-2px);
      box-shadow: 0 0 40px rgba(73, 166, 166, 0.35), 0 8px 32px rgba(0,0,0,0.5);
      border-color: rgba(73, 166, 166, 0.7);
    }

    #helix-overlay-btn img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      pointer-events: none;
    }

    #helix-overlay-tooltip {
      position: fixed;
      bottom: 102px;
      right: 28px;
      z-index: 99999;
      background: rgba(6, 11, 11, 0.9);
      border: 1px solid rgba(73, 166, 166, 0.25);
      border-radius: 8px;
      padding: 8px 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #8fa8a8;
      white-space: nowrap;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    #helix-overlay-btn:hover + #helix-overlay-tooltip,
    #helix-overlay-tooltip.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // ── Button (anchor) ──
  const btn = document.createElement('a');
  btn.id = 'helix-overlay-btn';
  btn.href = 'nav.html';

  const img = document.createElement('img');
  img.src = 'logo.png';
  img.alt = 'Go to Nav';
  btn.appendChild(img);

  // ── Tooltip ──
  const tooltip = document.createElement('div');
  tooltip.id = 'helix-overlay-tooltip';
  tooltip.textContent = 'Open Nav';

  // Show tooltip on hover
  btn.addEventListener('mouseenter', () => tooltip.classList.add('visible'));
  btn.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));

  // ── Mount ──
  document.body.appendChild(btn);
  document.body.appendChild(tooltip);
})();