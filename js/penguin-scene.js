/**
 * Penguin Ramp & Hungry Polar Bear Ice Cave scene.
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM dependencies and can be imported directly in Node.js unit tests.
 * `PenguinArena` renders and animates the interactive SVG scene in the browser.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'iq-penguin-arena-styles';

/**
 * Creates the initial pure state for the penguin ramp arena.
 * @param {number} [totalPenguins=10]
 */
export function createPenguinState(totalPenguins = 10) {
  const total = Number.isFinite(Number(totalPenguins))
    ? Math.max(1, Math.floor(Number(totalPenguins)))
    : 10;

  return {
    total,
    remaining: total,
    eaten: 0,
    fallingIndex: null,
    bearState: 'patrol',
    bearSlot: 0,
  };
}

/**
 * Returns a new state with one penguin dropped from the ramp to the hungry polar bear.
 * If no penguins remain, returns an unchanged copy of the state.
 * @param {{ total: number, remaining: number, eaten: number, fallingIndex: number | null, bearState: string, bearSlot: number }} state
 */
export function dropOnePenguin(state) {
  if (!state || state.remaining <= 0) {
    return { ...state };
  }
  const fallingIndex = state.remaining - 1;
  return {
    ...state,
    remaining: state.remaining - 1,
    eaten: state.eaten + 1,
    fallingIndex,
    bearState: 'eating',
    bearSlot: fallingIndex,
  };
}

/**
 * Returns a new state where the remaining penguins celebrate and the polar bear grumbles.
 * @param {{ total: number, remaining: number, eaten: number, fallingIndex: number | null, bearState: string, bearSlot: number }} state
 */
export function celebratePenguins(state) {
  return {
    ...state,
    bearState: 'grumble',
  };
}

/**
 * Computes evenly distributed X coordinates on the 640px wide ramp for `total` slots.
 * @param {number} index
 * @param {number} total
 * @returns {number}
 */
function getSlotX(index, total) {
  if (total <= 1) {
    return 320;
  }
  const left = 84;
  const right = 556;
  const step = (right - left) / (total - 1);
  return Math.round(left + index * step);
}

/**
 * Helper to create an SVG element with attributes (safe, no innerHTML).
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs]
 * @returns {SVGElement}
 */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * Injects scoped CSS animations once into the document head.
 */
function ensureArenaStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.penguin-arena-wrap {
  position: relative;
  width: 100%;
  border-radius: 1.125rem;
  overflow: hidden;
  border: 1px solid #bfdbfe;
  background: linear-gradient(180deg, #dbeafe 0%, #e0f2fe 45%, #1e3a5f 100%);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
}

.penguin-arena-svg {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}

.penguin-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.875rem;
  background: #0f172a;
  color: #f8fafc;
  font-size: 0.875rem;
  font-weight: 600;
}

.penguin-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem 0.625rem;
  border-radius: 999px;
  background: #1e293b;
  color: #e0f2fe;
  font-variant-numeric: tabular-nums;
}

.penguin-status-pill[data-danger="true"] {
  background: #7f1d1d;
  color: #fee2e2;
}

.penguin-status-note {
  color: #cbd5e1;
  font-weight: 500;
  font-size: 0.8125rem;
}

.pg-trapdoor {
  transition: transform 0.22s cubic-bezier(0.3, 1.3, 0.5, 1);
  transform-box: fill-box;
  transform-origin: left center;
}

.pg-trapdoor.is-open {
  transform: rotate(78deg);
}

.pg-penguin-body {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: pg-waddle 2.6s ease-in-out infinite;
}

.pg-penguin-slot.is-hop .pg-penguin-body {
  animation: pg-hop 0.52s cubic-bezier(0.25, 1.4, 0.5, 1) 1;
}

.pg-penguin-slot.is-falling .pg-penguin-body {
  animation: none;
}

.pg-penguin-slot.is-eaten {
  opacity: 0;
  pointer-events: none;
}

.pg-panic {
  opacity: 0;
  transition: opacity 0.12s ease;
}

.pg-penguin-slot.is-falling .pg-panic {
  opacity: 1;
}

.pg-bear-jaw {
  transform-box: fill-box;
  transform-origin: left center;
  transition: transform 0.12s ease;
}

.pg-bear.is-chomp .pg-bear-jaw {
  animation: pg-chomp 0.34s ease-in-out 2;
}

.pg-bear-bubble {
  opacity: 0;
  transform: translateY(6px) scale(0.88);
  transform-box: fill-box;
  transform-origin: center bottom;
  transition: opacity 0.16s ease, transform 0.18s cubic-bezier(0.2, 1.4, 0.4, 1);
}

.pg-bear-bubble.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.pg-snow-burst {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
}

.pg-snow-burst.is-active {
  animation: pg-burst 0.55s ease-out 1;
}

@keyframes pg-waddle {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-3.5deg) translateY(-1px); }
  75% { transform: rotate(3.5deg) translateY(-1px); }
}

@keyframes pg-hop {
  0% { transform: translateY(0) scale(1); }
  40% { transform: translateY(-13px) scale(1.06); }
  70% { transform: translateY(-2px) scale(0.96); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes pg-chomp {
  0%, 100% { transform: rotate(0deg); }
  45% { transform: rotate(32deg); }
}

@keyframes pg-burst {
  0% { opacity: 0.95; transform: scale(0.4); }
  60% { opacity: 0.9; transform: scale(1.25); }
  100% { opacity: 0; transform: scale(1.55); }
}

@media (prefers-reduced-motion: reduce) {
  .pg-penguin-body,
  .pg-penguin-slot.is-hop .pg-penguin-body,
  .pg-bear.is-chomp .pg-bear-jaw,
  .pg-snow-burst.is-active {
    animation: none !important;
  }
  .pg-trapdoor,
  .pg-bear-bubble {
    transition: none !important;
  }
}
`;
  document.head.appendChild(style);
}

/**
 * Checks whether the user prefers reduced motion.
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Interactive SVG controller for the Penguin Ramp & Hungry Polar Bear Ice Cave.
 */
export class PenguinArena {
  /**
   * @param {HTMLElement} containerEl
   * @param {{ totalPenguins?: number }} [options]
   */
  constructor(containerEl, { totalPenguins = 10 } = {}) {
    if (!containerEl) {
      throw new Error('PenguinArena requires a valid container element.');
    }
    this._container = containerEl;
    this._state = createPenguinState(totalPenguins);
    this._timers = new Set();
    this._rafId = null;
    this._lastFrameTime = 0;
    this._destroyed = false;

    // Bear motion state in SVG coordinates
    this._bearX = 320;
    this._bearDir = 1; // 1 = facing right, -1 = facing left
    this._bearTargetX = null;
    this._bearSpeed = 62; // px/sec patrol
    this._bearWalkPhase = 0;
    this._bearBusyUntil = 0;

    // Falling penguin animations: Map<index, { startTime, duration, startX, slotGroup, moverGroup }>
    this._fallingAnimations = new Map();

    // Cached DOM references
    this._svg = null;
    this._statusPill = null;
    this._statusNote = null;
    this._slotsLayer = null;
    this._trapdoors = [];
    this._penguinSlots = [];
    this._bearGroup = null;
    this._bearFlipGroup = null;
    this._bearFrontLeg = null;
    this._bearBackLeg = null;
    this._bearBubbleGroup = null;
    this._bearBubbleText = null;
    this._snowBurstGroup = null;

    ensureArenaStyles();
    this._buildDom();
    this.reset(totalPenguins);
    this._startLoop();
  }

  /**
   * Resets all penguins onto the ramp, closes trapdoors, and resets the bear to patrol.
   * @param {number} [totalPenguins]
   */
  reset(totalPenguins = this._state.total) {
    this._clearTimers();
    this._fallingAnimations.clear();
    this._state = createPenguinState(totalPenguins);

    this._bearX = 320;
    this._bearDir = 1;
    this._bearTargetX = null;
    this._bearSpeed = 62;
    this._bearBusyUntil = 0;

    this._renderSlots();
    this._hideBubble();
    if (this._bearGroup) {
      this._bearGroup.classList.remove('is-chomp');
      this._updateBearTransform();
    }
    this._updateStatusUi();
  }

  /**
   * Triggers a trapdoor opening, penguin falling into the ice cave, and the polar bear
   * sprinting over to chomp it.
   * @returns {{ remaining: number, eaten: number, total: number }}
   */
  onWrongAnswer() {
    const prevRemaining = this._state.remaining;
    const nextState = dropOnePenguin(this._state);
    this._state = nextState;

    if (nextState.remaining === prevRemaining) {
      return {
        remaining: this._state.remaining,
        eaten: this._state.eaten,
        total: this._state.total,
      };
    }

    const idx = nextState.fallingIndex;
    const targetX = getSlotX(idx, nextState.total);
    const trapdoor = this._trapdoors[idx];
    const slotInfo = this._penguinSlots[idx];

    if (trapdoor) {
      trapdoor.classList.add('is-open');
    }

    this._updateStatusUi();

    if (prefersReducedMotion()) {
      this._bearX = targetX;
      this._bearTargetX = null;
      this._updateBearTransform();
      if (slotInfo) {
        slotInfo.group.classList.add('is-eaten');
      }
      this._showBubble('NOM!');
      this._schedule(() => {
        this._hideBubble();
        this._state = { ...this._state, bearState: 'patrol' };
      }, 900);
    } else {
      // Sprint bear to the exact X under the falling penguin
      this._bearTargetX = targetX;
      this._bearSpeed = 520;
      this._bearBusyUntil = performance.now() + 1450;

      if (slotInfo) {
        slotInfo.group.classList.remove('is-hop');
        slotInfo.group.classList.add('is-falling');
        this._fallingAnimations.set(idx, {
          startTime: performance.now(),
          duration: 460,
          targetX,
          slotInfo,
        });
      }
    }

    return {
      remaining: this._state.remaining,
      eaten: this._state.eaten,
      total: this._state.total,
    };
  }

  /**
   * Celebrates a correct answer: remaining penguins hop happily and the polar bear grumbles.
   * @returns {{ remaining: number, eaten: number, total: number }}
   */
  onCorrectAnswer() {
    this._state = celebratePenguins(this._state);

    for (let i = 0; i < this._state.remaining; i += 1) {
      const slotInfo = this._penguinSlots[i];
      if (!slotInfo) continue;
      slotInfo.group.classList.remove('is-hop');
      // Force reflow so rapid consecutive correct answers replay the hop
      void slotInfo.group.getBoundingClientRect();
      slotInfo.group.classList.add('is-hop');
    }

    this._showBubble('Grrr...');
    this._bearBusyUntil = Math.max(this._bearBusyUntil, performance.now() + 850);
    this._schedule(() => {
      if (this._state.bearState === 'grumble') {
        this._hideBubble();
        this._state = { ...this._state, bearState: 'patrol' };
      }
    }, 850);

    this._updateStatusUi();

    return {
      remaining: this._state.remaining,
      eaten: this._state.eaten,
      total: this._state.total,
    };
  }

  /**
   * Returns a snapshot of the current arena state.
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Cleans up animation frame loops, timers, and DOM nodes.
   */
  destroy() {
    this._destroyed = true;
    this._clearTimers();
    this._fallingAnimations.clear();
    if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._container) {
      this._container.replaceChildren();
    }
  }

  /** @private */
  _schedule(fn, delayMs) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      if (!this._destroyed) {
        fn();
      }
    }, delayMs);
    this._timers.add(id);
    return id;
  }

  /** @private */
  _clearTimers() {
    for (const id of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
  }

  /** @private */
  _buildDom() {
    this._container.replaceChildren();

    const wrap = document.createElement('div');
    wrap.className = 'penguin-arena-wrap';

    const svg = svgEl('svg', {
      class: 'penguin-arena-svg',
      viewBox: '0 0 640 240',
      role: 'img',
      'aria-label': 'Isrampe med pingviner og sulten isbjørn i ishulen',
    });
    this._svg = svg;

    // Defs: gradients for sky, ice cave, ice ramp
    const defs = svgEl('defs');

    const skyGrad = svgEl('linearGradient', { id: 'pg-sky-grad', x1: '0', y1: '0', x2: '0', y2: '1' });
    skyGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#bae6fd' }));
    skyGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#f0f9ff' }));
    defs.appendChild(skyGrad);

    const caveGrad = svgEl('linearGradient', { id: 'pg-cave-grad', x1: '0', y1: '0', x2: '0', y2: '1' });
    caveGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#0c223a' }));
    caveGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#1e3a5f' }));
    defs.appendChild(caveGrad);

    const iceGrad = svgEl('linearGradient', { id: 'pg-ice-grad', x1: '0', y1: '0', x2: '0', y2: '1' });
    iceGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#e0f2fe' }));
    iceGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#7dd3fc' }));
    defs.appendChild(iceGrad);

    svg.appendChild(defs);

    // 1. Arctic sky backdrop
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: 640, height: 108, fill: 'url(#pg-sky-grad)' }));

    // Distant icy peaks
    svg.appendChild(svgEl('path', {
      d: 'M0 104 L78 44 L148 84 L235 32 L320 82 L420 38 L512 80 L585 48 L640 94 L640 108 L0 108 Z',
      fill: '#dbeafe',
      opacity: '0.85',
    }));

    // Subtle snowflakes in sky
    const snowCoords = [
      [52, 24, 2.2], [134, 18, 1.8], [210, 30, 2], [295, 16, 2.4],
      [388, 22, 1.8], [468, 28, 2.2], [548, 18, 2], [608, 32, 1.7],
    ];
    for (const [cx, cy, r] of snowCoords) {
      svg.appendChild(svgEl('circle', { cx, cy, r, fill: '#ffffff', opacity: '0.85' }));
    }

    // 2. Ice Cave (ishulen) interior
    svg.appendChild(svgEl('rect', { x: 0, y: 102, width: 640, height: 138, fill: 'url(#pg-cave-grad)' }));

    // Cave snowy floor
    svg.appendChild(svgEl('path', {
      d: 'M0 218 Q160 210 320 218 T640 215 L640 240 L0 240 Z',
      fill: '#bae6fd',
    }));
    svg.appendChild(svgEl('path', {
      d: 'M0 226 Q180 220 360 227 T640 224 L640 240 L0 240 Z',
      fill: '#e0f2fe',
    }));

    // Left & right icy cave walls / pillars supporting the ramp
    svg.appendChild(svgEl('path', {
      d: 'M0 90 L52 90 L44 134 L34 176 L46 240 L0 240 Z',
      fill: '#38bdf8',
      opacity: '0.35',
    }));
    svg.appendChild(svgEl('path', {
      d: 'M0 90 L38 90 L28 148 L22 240 L0 240 Z',
      fill: '#7dd3fc',
      opacity: '0.5',
    }));
    svg.appendChild(svgEl('path', {
      d: 'M640 90 L588 90 L596 134 L606 176 L594 240 L640 240 Z',
      fill: '#38bdf8',
      opacity: '0.35',
    }));
    svg.appendChild(svgEl('path', {
      d: 'M640 90 L602 90 L612 148 L618 240 L640 240 Z',
      fill: '#7dd3fc',
      opacity: '0.5',
    }));

    // Hanging icicles along the cave ceiling / ramp underside
    const icicles = [46, 62, 132, 240, 355, 470, 578, 594];
    for (let i = 0; i < icicles.length; i += 1) {
      const ix = icicles[i];
      const len = i % 2 === 0 ? 18 : 13;
      svg.appendChild(svgEl('polygon', {
        points: `${ix - 5},104 ${ix + 5},104 ${ix},${104 + len}`,
        fill: '#bae6fd',
        opacity: '0.7',
      }));
    }

    // Ramp side ledges (solid ice anchors on left & right)
    svg.appendChild(svgEl('rect', {
      x: 0,
      y: 90,
      width: 58,
      height: 14,
      rx: 4,
      fill: 'url(#pg-ice-grad)',
      stroke: '#38bdf8',
      'stroke-width': 1.5,
    }));
    svg.appendChild(svgEl('rect', {
      x: 582,
      y: 90,
      width: 58,
      height: 14,
      rx: 4,
      fill: 'url(#pg-ice-grad)',
      stroke: '#38bdf8',
      'stroke-width': 1.5,
    }));

    // Subtle cave label
    const caveSign = svgEl('text', {
      x: 320,
      y: 128,
      'text-anchor': 'middle',
      fill: '#7dd3fc',
      opacity: '0.32',
      'font-size': '11',
      'font-weight': '700',
      'letter-spacing': '2.5',
      'font-family': 'system-ui, sans-serif',
    });
    caveSign.textContent = 'ISHULEN';
    svg.appendChild(caveSign);

    // 3. Dynamic layer for trapdoors & penguins
    this._slotsLayer = svgEl('g', { class: 'pg-slots-layer' });
    svg.appendChild(this._slotsLayer);

    // 4. Hungry Polar Bear layer in the ice cave
    this._buildBear(svg);

    // 5. Snow-puff burst particles (positioned dynamically on chomp)
    this._snowBurstGroup = svgEl('g', {
      class: 'pg-snow-burst',
      transform: 'translate(320, 185)',
    });
    const puffOffsets = [
      [-18, -14, 5], [16, -16, 4.5], [-24, 2, 4], [22, 0, 5],
      [0, -22, 4.5], [-10, 10, 3.5], [12, 10, 4],
    ];
    for (const [px, py, pr] of puffOffsets) {
      this._snowBurstGroup.appendChild(svgEl('circle', {
        cx: px,
        cy: py,
        r: pr,
        fill: '#ffffff',
        opacity: '0.95',
      }));
    }
    svg.appendChild(this._snowBurstGroup);

    wrap.appendChild(svg);

    // Accessible status bar below SVG
    const statusBar = document.createElement('div');
    statusBar.className = 'penguin-status-bar';
    statusBar.setAttribute('aria-live', 'polite');

    const pill = document.createElement('span');
    pill.className = 'penguin-status-pill';
    this._statusPill = pill;

    const note = document.createElement('span');
    note.className = 'penguin-status-note';
    this._statusNote = note;

    statusBar.appendChild(pill);
    statusBar.appendChild(note);
    wrap.appendChild(statusBar);

    this._container.appendChild(wrap);
  }

  /** @private */
  _buildBear(svg) {
    const bearGroup = svgEl('g', {
      class: 'pg-bear',
      transform: 'translate(320, 192)',
    });

    // Comic speech bubble above bear (does not flip with bear facing)
    const bubbleGroup = svgEl('g', {
      class: 'pg-bear-bubble',
      transform: 'translate(0, -48)',
    });
    bubbleGroup.appendChild(svgEl('rect', {
      x: -36,
      y: -17,
      width: 72,
      height: 24,
      rx: 12,
      fill: '#ffffff',
      stroke: '#0f172a',
      'stroke-width': 2,
    }));
    bubbleGroup.appendChild(svgEl('polygon', {
      points: '-5,7 5,7 0,14',
      fill: '#ffffff',
      stroke: '#0f172a',
      'stroke-width': 1.5,
    }));
    // Cover seam between bubble rect and pointer
    bubbleGroup.appendChild(svgEl('rect', {
      x: -6,
      y: 4,
      width: 12,
      height: 4,
      fill: '#ffffff',
    }));
    const bubbleText = svgEl('text', {
      x: 0,
      y: -1,
      'text-anchor': 'middle',
      fill: '#0f172a',
      'font-size': '12',
      'font-weight': '800',
      'font-family': 'system-ui, sans-serif',
    });
    bubbleText.textContent = 'NOM!';
    bubbleGroup.appendChild(bubbleText);
    bearGroup.appendChild(bubbleGroup);

    // Inner flippable bear body (facing right by default)
    const flipGroup = svgEl('g', { class: 'pg-bear-flip' });

    // Ground shadow
    flipGroup.appendChild(svgEl('ellipse', {
      cx: 0,
      cy: 26,
      rx: 34,
      ry: 6,
      fill: '#0f172a',
      opacity: '0.28',
    }));

    // Back legs (darker ice-white)
    const backLeg = svgEl('g', { class: 'pg-bear-back-leg' });
    backLeg.appendChild(svgEl('rect', {
      x: -24,
      y: 8,
      width: 12,
      height: 18,
      rx: 6,
      fill: '#cbd5e1',
      stroke: '#64748b',
      'stroke-width': 1.2,
    }));
    backLeg.appendChild(svgEl('rect', {
      x: 8,
      y: 8,
      width: 12,
      height: 18,
      rx: 6,
      fill: '#cbd5e1',
      stroke: '#64748b',
      'stroke-width': 1.2,
    }));
    flipGroup.appendChild(backLeg);

    // Round fluffy tail
    flipGroup.appendChild(svgEl('circle', {
      cx: -32,
      cy: -2,
      r: 6,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.3,
    }));

    // Bear torso
    flipGroup.appendChild(svgEl('ellipse', {
      cx: -4,
      cy: 0,
      rx: 30,
      ry: 19,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.5,
    }));

    // Subtle belly highlight
    flipGroup.appendChild(svgEl('ellipse', {
      cx: -4,
      cy: 6,
      rx: 20,
      ry: 10,
      fill: '#e0f2fe',
      opacity: '0.55',
    }));

    // Front legs
    const frontLeg = svgEl('g', { class: 'pg-bear-front-leg' });
    frontLeg.appendChild(svgEl('rect', {
      x: -18,
      y: 9,
      width: 13,
      height: 18,
      rx: 6,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.3,
    }));
    frontLeg.appendChild(svgEl('rect', {
      x: 13,
      y: 9,
      width: 13,
      height: 18,
      rx: 6,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.3,
    }));
    flipGroup.appendChild(frontLeg);

    // Bear head
    // Back ear
    flipGroup.appendChild(svgEl('circle', {
      cx: 17,
      cy: -22,
      r: 5.5,
      fill: '#e2e8f0',
      stroke: '#94a3b8',
      'stroke-width': 1.2,
    }));
    // Head cranium
    flipGroup.appendChild(svgEl('circle', {
      cx: 24,
      cy: -11,
      r: 14,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.4,
    }));
    // Front ear
    flipGroup.appendChild(svgEl('circle', {
      cx: 25,
      cy: -23,
      r: 5.5,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.2,
    }));
    flipGroup.appendChild(svgEl('circle', {
      cx: 25,
      cy: -23,
      r: 2.5,
      fill: '#fda4af',
      opacity: '0.7',
    }));

    // Lower jaw (articulates open for chomp!)
    const jawGroup = svgEl('g', { class: 'pg-bear-jaw' });
    // Inside mouth (pink/dark red visible when open)
    jawGroup.appendChild(svgEl('ellipse', {
      cx: 35,
      cy: -4,
      rx: 8,
      ry: 4.5,
      fill: '#be123c',
    }));
    // Tongue
    jawGroup.appendChild(svgEl('ellipse', {
      cx: 36,
      cy: -2.5,
      rx: 4.5,
      ry: 2,
      fill: '#fb7185',
    }));
    // Lower jaw chin
    jawGroup.appendChild(svgEl('path', {
      d: 'M26 -5 Q36 -1 43 -4 Q42 2 33 2 Q26 1 26 -5 Z',
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.2,
    }));
    flipGroup.appendChild(jawGroup);

    // Upper snout
    flipGroup.appendChild(svgEl('ellipse', {
      cx: 37,
      cy: -9,
      rx: 9,
      ry: 5.5,
      fill: '#f8fafc',
      stroke: '#94a3b8',
      'stroke-width': 1.2,
    }));

    // Little white fang peeking out
    flipGroup.appendChild(svgEl('polygon', {
      points: '37,-4.5 40,-4.5 38.5,-1.5',
      fill: '#ffffff',
      stroke: '#cbd5e1',
      'stroke-width': 0.5,
    }));

    // Black nose
    flipGroup.appendChild(svgEl('ellipse', {
      cx: 44,
      cy: -10.5,
      rx: 3.4,
      ry: 2.5,
      fill: '#0f172a',
    }));

    // Expressive hungry eye + brow
    flipGroup.appendChild(svgEl('circle', { cx: 30, cy: -14, r: 2.3, fill: '#0f172a' }));
    flipGroup.appendChild(svgEl('circle', { cx: 30.8, cy: -14.8, r: 0.8, fill: '#ffffff' }));
    flipGroup.appendChild(svgEl('line', {
      x1: 26.5,
      y1: -18.5,
      x2: 33.5,
      y2: -16.8,
      stroke: '#334155',
      'stroke-width': 1.6,
      'stroke-linecap': 'round',
    }));

    bearGroup.appendChild(flipGroup);
    svg.appendChild(bearGroup);

    this._bearGroup = bearGroup;
    this._bearFlipGroup = flipGroup;
    this._bearFrontLeg = frontLeg;
    this._bearBackLeg = backLeg;
    this._bearBubbleGroup = bubbleGroup;
    this._bearBubbleText = bubbleText;
  }

  /** @private */
  _renderSlots() {
    if (!this._slotsLayer) return;
    this._slotsLayer.replaceChildren();
    this._trapdoors = [];
    this._penguinSlots = [];

    const total = this._state.total;
    const slotWidth = total > 1 ? Math.min(44, Math.floor(472 / total) - 4) : 44;

    for (let i = 0; i < total; i += 1) {
      const cx = getSlotX(i, total);

      // Trapdoor slab & hinge at y = 90
      const trapX = Math.round(cx - slotWidth / 2);
      const trapdoor = svgEl('rect', {
        class: 'pg-trapdoor',
        x: trapX,
        y: 90,
        width: slotWidth,
        height: 12,
        rx: 3,
        fill: 'url(#pg-ice-grad)',
        stroke: '#0284c7',
        'stroke-width': 1.3,
      });
      this._slotsLayer.appendChild(trapdoor);
      this._trapdoors.push(trapdoor);

      // Tiny hinge bolt on left of trapdoor
      this._slotsLayer.appendChild(svgEl('circle', {
        cx: trapX + 3,
        cy: 96,
        r: 2,
        fill: '#0369a1',
      }));

      // Penguin container positioned at (cx, 89)
      const slotGroup = svgEl('g', {
        class: 'pg-penguin-slot',
        transform: `translate(${cx}, 89)`,
      });

      const moverGroup = svgEl('g', { class: 'pg-penguin-mover' });
      const bodyGroup = svgEl('g', {
        class: 'pg-penguin-body',
        style: `animation-delay: ${((i * 0.27) % 2.4).toFixed(2)}s`,
      });

      // Feet (orange)
      bodyGroup.appendChild(svgEl('ellipse', { cx: -5, cy: -1.5, rx: 4.5, ry: 2.2, fill: '#f97316' }));
      bodyGroup.appendChild(svgEl('ellipse', { cx: 5, cy: -1.5, rx: 4.5, ry: 2.2, fill: '#f97316' }));

      // Flippers
      bodyGroup.appendChild(svgEl('ellipse', {
        cx: -12,
        cy: -14,
        rx: 3.5,
        ry: 8,
        transform: 'rotate(16 -12 -14)',
        fill: '#1e293b',
      }));
      bodyGroup.appendChild(svgEl('ellipse', {
        cx: 12,
        cy: -14,
        rx: 3.5,
        ry: 8,
        transform: 'rotate(-16 12 -14)',
        fill: '#1e293b',
      }));

      // Main dark body
      bodyGroup.appendChild(svgEl('ellipse', { cx: 0, cy: -15, rx: 11, ry: 14, fill: '#1e293b' }));
      // White belly
      bodyGroup.appendChild(svgEl('ellipse', { cx: 0, cy: -12, rx: 7.2, ry: 10, fill: '#ffffff' }));
      // Head
      bodyGroup.appendChild(svgEl('circle', { cx: 0, cy: -28, r: 8.5, fill: '#1e293b' }));
      // White eye patches
      bodyGroup.appendChild(svgEl('circle', { cx: -3.2, cy: -29, r: 2.6, fill: '#ffffff' }));
      bodyGroup.appendChild(svgEl('circle', { cx: 3.2, cy: -29, r: 2.6, fill: '#ffffff' }));
      // Pupils
      bodyGroup.appendChild(svgEl('circle', { cx: -2.8, cy: -29, r: 1.3, fill: '#0f172a' }));
      bodyGroup.appendChild(svgEl('circle', { cx: 3.6, cy: -29, r: 1.3, fill: '#0f172a' }));
      // Orange beak
      bodyGroup.appendChild(svgEl('polygon', { points: '-3,-25 3,-25 0,-21', fill: '#f97316' }));

      // Panic "!" mark (hidden until falling)
      const panic = svgEl('text', {
        class: 'pg-panic',
        x: 0,
        y: -41,
        'text-anchor': 'middle',
        fill: '#dc2626',
        'font-size': '15',
        'font-weight': '900',
        'font-family': 'system-ui, sans-serif',
      });
      panic.textContent = '!';
      bodyGroup.appendChild(panic);

      moverGroup.appendChild(bodyGroup);
      slotGroup.appendChild(moverGroup);
      this._slotsLayer.appendChild(slotGroup);

      this._penguinSlots.push({
        group: slotGroup,
        mover: moverGroup,
        x: cx,
      });
    }
  }

  /** @private */
  _showBubble(text) {
    if (!this._bearBubbleGroup || !this._bearBubbleText) return;
    this._bearBubbleText.textContent = text;
    this._bearBubbleGroup.classList.add('is-visible');
  }

  /** @private */
  _hideBubble() {
    if (!this._bearBubbleGroup) return;
    this._bearBubbleGroup.classList.remove('is-visible');
  }

  /** @private */
  _triggerChomp(x) {
    if (this._bearGroup) {
      this._bearGroup.classList.remove('is-chomp');
      void this._bearGroup.getBoundingClientRect();
      this._bearGroup.classList.add('is-chomp');
    }

    if (this._snowBurstGroup) {
      this._snowBurstGroup.setAttribute('transform', `translate(${Math.round(x)}, 184)`);
      this._snowBurstGroup.classList.remove('is-active');
      void this._snowBurstGroup.getBoundingClientRect();
      this._snowBurstGroup.classList.add('is-active');
    }

    this._showBubble('NOM!');
    this._schedule(() => {
      if (this._bearGroup) {
        this._bearGroup.classList.remove('is-chomp');
      }
      if (this._fallingAnimations.size === 0) {
        this._hideBubble();
        this._state = { ...this._state, bearState: 'patrol' };
      }
    }, 920);
  }

  /** @private */
  _updateBearTransform() {
    if (!this._bearGroup || !this._bearFlipGroup) return;
    const bob = Math.abs(Math.sin(this._bearWalkPhase)) * -2.5;
    this._bearGroup.setAttribute('transform', `translate(${this._bearX.toFixed(1)}, ${(192 + bob).toFixed(1)})`);
    this._bearFlipGroup.setAttribute('transform', `scale(${this._bearDir}, 1)`);

    if (this._bearFrontLeg && this._bearBackLeg) {
      const stride = Math.sin(this._bearWalkPhase) * 3.2;
      this._bearFrontLeg.setAttribute('transform', `translate(${stride.toFixed(1)}, 0)`);
      this._bearBackLeg.setAttribute('transform', `translate(${(-stride).toFixed(1)}, 0)`);
    }
  }

  /** @private */
  _updateStatusUi() {
    const { remaining, eaten, total } = this._state;
    if (this._statusPill) {
      this._statusPill.textContent = `🐧 ${remaining} / ${total} pingviner trygge`;
      this._statusPill.dataset.danger = remaining <= Math.ceil(total * 0.3) ? 'true' : 'false';
    }
    if (this._statusNote) {
      if (remaining === 0) {
        this._statusNote.textContent = 'Isbjørnen er stappmett!';
      } else if (eaten === 0) {
        this._statusNote.textContent = 'Svar riktig for å redde alle pingvinene';
      } else {
        this._statusNote.textContent = `${eaten} spist av isbjørnen i ishulen`;
      }
    }
    if (this._svg) {
      this._svg.setAttribute(
        'aria-label',
        `Isrampe med ${remaining} av ${total} pingviner trygge. ${eaten} pingviner er spist av isbjørnen i ishulen.`
      );
    }
  }

  /** @private */
  _startLoop() {
    if (typeof requestAnimationFrame !== 'function') return;
    this._lastFrameTime = performance.now();

    const tick = (now) => {
      if (this._destroyed) return;
      const dt = Math.min(0.05, Math.max(0, (now - this._lastFrameTime) / 1000));
      this._lastFrameTime = now;

      if (!prefersReducedMotion()) {
        this._stepBear(now, dt);
        this._stepFallingPenguins(now);
      }

      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  /** @private */
  _stepBear(now, dt) {
    const minX = 95;
    const maxX = 545;

    if (this._bearTargetX !== null) {
      const dx = this._bearTargetX - this._bearX;
      if (Math.abs(dx) <= 6) {
        this._bearX = this._bearTargetX;
        this._bearTargetX = null;
        this._bearSpeed = 62;
      } else {
        this._bearDir = dx >= 0 ? 1 : -1;
        const step = Math.sign(dx) * Math.min(Math.abs(dx), this._bearSpeed * dt);
        this._bearX += step;
        this._bearWalkPhase += dt * 18;
      }
    } else if (now >= this._bearBusyUntil) {
      // Gentle hungry patrol in the ice cave
      this._bearX += this._bearDir * this._bearSpeed * dt;
      if (this._bearX >= maxX) {
        this._bearX = maxX;
        this._bearDir = -1;
      } else if (this._bearX <= minX) {
        this._bearX = minX;
        this._bearDir = 1;
      }
      this._bearWalkPhase += dt * 6;
    }

    this._updateBearTransform();
  }

  /** @private */
  _stepFallingPenguins(now) {
    if (this._fallingAnimations.size === 0) return;

    for (const [idx, anim] of this._fallingAnimations.entries()) {
      const progress = Math.min(1, (now - anim.startTime) / anim.duration);
      // Gravity-like ease-in curve
      const eased = progress * progress;
      const dy = eased * 106;
      const spin = progress * 220 * (idx % 2 === 0 ? 1 : -1);
      anim.slotInfo.mover.setAttribute('transform', `translate(0, ${dy.toFixed(1)}) rotate(${spin.toFixed(1)})`);

      if (progress >= 1) {
        this._fallingAnimations.delete(idx);
        anim.slotInfo.group.classList.remove('is-falling');
        anim.slotInfo.group.classList.add('is-eaten');
        this._triggerChomp(anim.targetX);
      }
    }
  }
}
