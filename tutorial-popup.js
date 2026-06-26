/**
 * TUTORIAL GUIDE V4 — Clean Text Bubble (no avatar)
 *
 * A clean text bubble appears on the page and walks users through
 * interactive steps. Each step can highlight an element, prompt
 * the user to click it, and explain what it does.
 *
 * Usage:
 *   new TutorialGuide({
 *     storageKey: 'tutorialDashSeen',
 *     steps: [
 *       {
 *         name: 'Helix',
 *         text: 'Welcome! Let me show you around.',
 *         position: 'bottom-right',  // optional: bottom-right, bottom-left, top-right, top-left, near-element
 *         highlight: '#someElement',  // optional: glow this element
 *         click: '#someElement',     // optional: require click on this element
 *         action: () => { ... },     // optional: called when user clicks
 *       },
 *     ],
 *   });
 */

class TutorialGuide {
  constructor({ storageKey = "tutorialSeen", steps = [] } = {}) {
    this.storageKey = storageKey;
    this.steps = steps;
    this.currentStep = 0;
    this.bubbleEl = null;
    this.dimEl = null;
    this.progressEl = null;
    this.highlightedEl = null;
    this.clickHintEl = null;

    if (!steps.length) throw new Error("TutorialGuide needs at least one step");
  }

  /* ───────────── PUBLIC API ───────────── */

  start(force = false) {
    if (this.isSeen() && !force) return;
    if (this.bubbleEl && document.body.contains(this.bubbleEl)) return;
    this.currentStep = 0;
    this.build();
    this.showStep(0);
  }

  forceStart() {
    this.start(true);
  }

  close() {
    this.cleanup();
    localStorage.setItem(this.storageKey, "true");
  }

  isSeen() {
    return localStorage.getItem(this.storageKey) === "true";
  }

  /* ───────────── BUILD DOM ───────────── */

  build() {
    /* Dim overlay */
    const dim = document.createElement("div");
    dim.className = "tut-dim";
    document.body.appendChild(dim);
    this.dimEl = dim;

    /* Text bubble */
    const bubble = document.createElement("div");
    bubble.className = "tut-bubble";
    bubble.id = "tut-bubble";
    document.body.appendChild(bubble);
    this.bubbleEl = bubble;

    /* Progress dots */
    const progress = document.createElement("div");
    progress.className = "tut-progress";
    progress.id = "tut-progress";
    this.steps.forEach((_, i) => {
      const dot = document.createElement("div");
      dot.className = "tut-progress-dot";
      dot.dataset.step = i;
      progress.appendChild(dot);
    });
    document.body.appendChild(progress);
    this.progressEl = progress;
  }

  /* ───────────── RENDER STEP ───────────── */

  showStep(index) {
    this.currentStep = index;
    const step = this.steps[index];
    if (!step) {
      this.close();
      return;
    }

    /* Cleanup previous step's effects */
    this.removeHighlight();
    this.removeClickHint();

    /* Update progress */
    if (this.progressEl) {
      this.progressEl
        .querySelectorAll(".tut-progress-dot")
        .forEach((dot, i) => {
          dot.classList.toggle("active", i === index);
          dot.classList.toggle("done", i < index);
        });
    }

    /* Render bubble content */
    const isLast = index === this.steps.length - 1;
    const isFirst = index === 0;

    this.bubbleEl.innerHTML = `
      <div class="tut-bubble-name">${step.name || "Helix"}</div>
      <div class="tut-bubble-text">${step.text || ""}</div>
      <div class="tut-bubble-step">Step ${index + 1} of ${this.steps.length}</div>
      <div class="tut-bubble-actions">
        ${!isFirst ? `<button class="tut-btn tut-btn-secondary" data-act="prev">← Back</button>` : ""}
        <button class="tut-btn tut-btn-primary" data-act="next">
          ${step.click ? "Skip" : isLast ? "Got it!" : "Next →"}
        </button>
        <button class="tut-btn tut-btn-skip" data-act="skip">Skip tour</button>
      </div>
    `;

    /* Wire buttons */
    this.bubbleEl
      .querySelector('[data-act="next"]')
      .addEventListener("click", () => this.next());
    const prevBtn = this.bubbleEl.querySelector('[data-act="prev"]');
    if (prevBtn) prevBtn.addEventListener("click", () => this.prev());
    this.bubbleEl
      .querySelector('[data-act="skip"]')
      .addEventListener("click", () => this.close());

    /* Position bubble */
    this.positionBubble(step);

    /* Highlight element if specified */
    if (step.highlight) {
      this.highlightElement(step.highlight);
    }

    /* If step requires a click, set up click handler */
    if (step.click) {
      this.setupClickStep(step);
    }

    /* Show dim overlay */
    if (this.dimEl) {
      setTimeout(() => this.dimEl.classList.add("show"), 100);
    }
  }

  /* ───────────── POSITIONING ───────────── */

  positionBubble(step) {
    const bubble = this.bubbleEl;
    bubble.style.left = "";
    bubble.style.right = "";
    bubble.style.top = "";
    bubble.style.bottom = "";
    bubble.style.transform = "";

    const position = step.position || "bottom-right";

    if (position === "near-element" && step.highlight) {
      const target = document.querySelector(step.highlight);
      if (target) {
        const rect = target.getBoundingClientRect();
        const bubbleWidth = 380;
        const bubbleHeight = 200;
        const margin = 16;

        /* Try to position to the right of element */
        const spaceRight = window.innerWidth - rect.right;
        const spaceLeft = rect.left;
        const spaceTop = rect.top;
        const spaceBottom = window.innerHeight - rect.bottom;

        /* Prefer right side */
        if (spaceRight > bubbleWidth + margin * 2) {
          bubble.style.left = rect.right + margin + "px";
          /* Vertically center with element, but keep on screen */
          const top = Math.max(
            margin,
            Math.min(
              rect.top + rect.height / 2 - bubbleHeight / 2,
              window.innerHeight - bubbleHeight - margin,
            ),
          );
          bubble.style.top = top + "px";
        } else if (spaceLeft > bubbleWidth + margin * 2) {
        /* Then left side */
          bubble.style.left = rect.left - bubbleWidth - margin + "px";
          const top = Math.max(
            margin,
            Math.min(
              rect.top + rect.height / 2 - bubbleHeight / 2,
              window.innerHeight - bubbleHeight - margin,
            ),
          );
          bubble.style.top = top + "px";
        } else if (spaceBottom > bubbleHeight + margin * 2) {
        /* Then below */
          bubble.style.left =
            Math.max(
              margin,
              Math.min(
                rect.left + rect.width / 2 - bubbleWidth / 2,
                window.innerWidth - bubbleWidth - margin,
              ),
            ) + "px";
          bubble.style.top = rect.bottom + margin + "px";
        } else {
        /* Then above */
          bubble.style.left =
            Math.max(
              margin,
              Math.min(
                rect.left + rect.width / 2 - bubbleWidth / 2,
                window.innerWidth - bubbleWidth - margin,
              ),
            ) + "px";
          bubble.style.bottom = window.innerHeight - rect.top + margin + "px";
        }
        return;
      }
    }

    /* Default positions */
    switch (position) {
      case "bottom-left":
        bubble.style.left = "24px";
        bubble.style.bottom = "120px";
        break;
      case "top-right":
        bubble.style.right = "24px";
        bubble.style.top = "24px";
        break;
      case "top-left":
        bubble.style.left = "24px";
        bubble.style.top = "24px";
        break;
      case "bottom-center":
        bubble.style.left = "50%";
        bubble.style.bottom = "120px";
        bubble.style.transform = "translateX(-50%)";
        break;
      default: /* bottom-right */
        bubble.style.right = "24px";
        bubble.style.bottom = "120px";
        break;
    }
  }

  /* ───────────── HIGHLIGHT ───────────── */

  highlightElement(selector) {
    const target = document.querySelector(selector);
    if (!target) {
      console.warn(`[Tutorial] Element "${selector}" not found`);
      return;
    }
    target.classList.add("tut-glow");
    this.highlightedEl = target;
  }

  removeHighlight() {
    if (this.highlightedEl) {
      this.highlightedEl.classList.remove("tut-glow");
      this.highlightedEl = null;
    }
  }

  /* ───────────── CLICK STEPS ───────────── */

  setupClickStep(step) {
    const target = document.querySelector(step.click);
    if (!target) {
      console.warn(`[Tutorial] Click target "${step.click}" not found`);
      return;
    }

    /* Make target clickable */
    target.style.cursor = "pointer";
    target.style.position = "relative";

    /* Add click hint label */
    const hint = document.createElement("div");
    hint.className = "tut-click-hint";
    hint.textContent = step.clickHint || "Click here";
    document.body.appendChild(hint);
    this.positionClickHint(hint, target);
    this.clickHintEl = hint;

    /* Update on scroll/resize */
    this._updateHintPos = () => this.positionClickHint(hint, target);
    window.addEventListener("scroll", this._updateHintPos, { passive: true });
    window.addEventListener("resize", this._updateHintPos, { passive: true });

    /* Click handler */
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (step.action) step.action();
      this.next();
    };
    target.addEventListener("click", handler, { capture: true });
    this._clickHandler = handler;
    this._clickTarget = target;
  }

  positionClickHint(hint, target) {
    const rect = target.getBoundingClientRect();
    hint.style.left = rect.left + rect.width / 2 - 50 + "px";
    hint.style.top = rect.bottom + 12 + "px";
  }

  removeClickHint() {
    if (this.clickHintEl && document.body.contains(this.clickHintEl)) {
      document.body.removeChild(this.clickHintEl);
    }
    this.clickHintEl = null;

    if (this._clickTarget && this._clickHandler) {
      this._clickTarget.style.cursor = "";
      this._clickTarget.style.position = "";
      this._clickTarget.removeEventListener("click", this._clickHandler, {
        capture: true,
      });
      this._clickTarget = null;
      this._clickHandler = null;
    }

    if (this._updateHintPos) {
      window.removeEventListener("scroll", this._updateHintPos);
      window.removeEventListener("resize", this._updateHintPos);
      this._updateHintPos = null;
    }
  }

  /* ───────────── NAVIGATION ───────────── */

  next() {
    this.showStep(this.currentStep + 1);
  }

  prev() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  /* ───────────── CLEANUP ───────────── */

  cleanup() {
    this.removeHighlight();
    this.removeClickHint();

    if (this.bubbleEl && document.body.contains(this.bubbleEl)) {
      document.body.removeChild(this.bubbleEl);
    }
    if (this.dimEl && document.body.contains(this.dimEl)) {
      document.body.removeChild(this.dimEl);
    }
    if (this.progressEl && document.body.contains(this.progressEl)) {
      document.body.removeChild(this.progressEl);
    }

    this.bubbleEl = null;
    this.dimEl = null;
    this.progressEl = null;
  }
}

window.TutorialGuide = TutorialGuide;
