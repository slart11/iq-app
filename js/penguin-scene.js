/**
 * Penguin Ice Bridge & Hungry Polar Bear Torchlit Crystal Cavern (`ISHULEN`)
 *
 * Renders and animates the 16-bit studio pixel-art scene and sprite sheets from `./assets/`:
 * - `./assets/canva-bg.png` (198 × 112 px, rendered 2× at 396 × 224 logical canvas resolution)
 * - `./assets/canva-bear.png` (224 × 44 px = 4 horizontal cells of 56 × 44 px, rendered at 84 × 66 px)
 *   - Cell 0 (sx = 0): Standing idle on all four legs looking up at the penguins
 *   - Cell 1 (sx = 56): Running gallop stride 1 (extended front legs reaching forward)
 *   - Cell 2 (sx = 112): Running gallop stride 2 (gathered mid-air bound)
 *   - Cell 3 (sx = 168): Lunging forward with wide-open roaring/chomping jaw & fangs
 * - `./assets/canva-penguin.png` (204 × 68 px = 3 horizontal cells of 68 × 68 px, rendered at 30 × 30 px)
 *   - Cell 0 (sx = 0): Standing idle on the bridge
 *   - Cell 1 (sx = 68): Cheering happily with both flippers raised high
 *   - Cell 2 (sx = 136): Panicking / falling with wide shocked eyes, spiked feathers & flapping wings
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM/window dependencies and can be imported directly in Node.js tests.
 */

const STYLE_ID = 'iq-penguin-arena-styles-canva-16bit';
const W = 396;
const H = 224;

const BRIDGE_Y = 91; // Penguin feet level on top of the timber & ice bridge deck
const FLOOR_Y = 194; // Snow floor level inside ISHULEN where falling penguins land
const BEAR_FLOOR_Y = 198; // Polar bear paw contact level on the snowy cave floor
const GRAVITY = 520; // px/s² in 396×224 space
const BEAR_HOME_X = 88;
const BEAR_SPEED = 240; // px/s gallop sprint speed across the snow floor
const SLOT_L = 58;
const SLOT_R = 338;

const ASSET_URLS = {
  bg: './assets/canva-bg.png?v=3',
  bear: './assets/canva-bear.png?v=3',
  penguin: './assets/canva-penguin.png?v=3',
};

const BEAR_CELL_W = 76;
const BEAR_CELL_H = 56;
const BEAR_DRAW_W = 76;
const BEAR_DRAW_H = 56;

const PENGUIN_CELL_W = 32;
const PENGUIN_CELL_H = 34;
const PENGUIN_DRAW_W = 32;
const PENGUIN_DRAW_H = 34;

// Bridge lantern coordinates in 396×224 space
const BRIDGE_LANTERNS = [
  { x: 20, y: 66 },
  { x: 376, y: 66 },
];

// Cave wall torch coordinates in 396×224 space
const CAVE_TORCHES = [
  { x: 33, y: 132 },
  { x: 318, y: 148 },
  { x: 364, y: 132 },
];

// Glowing cyan crystal clusters in 396×224 space
const CAVE_CRYSTALS = [
  { x: 55, y: 165 },
  { x: 32, y: 182 },
  { x: 350, y: 175 },
  { x: 376, y: 182 },
];

/* ==========================================================================
   Pure State Helpers (Zero DOM Dependencies)
   ========================================================================== */

/**
 * Creates the initial pure state for the penguin ice bridge arena.
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
 * Returns a new state with one penguin dropped through a trapdoor to the polar bear.
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

/* ==========================================================================
   Palette & 5×5 Pixel Font for Crisp Overlays ("NOM!", "GRRR!", "!")
   ========================================================================== */

const PAL = {
  outline: '#141020',
  skyFallback: '#0c1938',
  caveGap: '#0d1b30',
  oakDark: '#3b2010',
  oakMid: '#6e3d21',
  oakWarm: '#9c5b34',
  oakHi: '#c98253',
  boltHi: '#a9b8cf',
  boltLo: '#4a576e',
  snowHi: '#fffdf5',
  snowMid: '#cde0f5',
  snowLo: '#92b1d6',
  snowDeep: '#5b7aa6',
  fireCore: '#fff799',
  fireGold: '#ffbb33',
  fireOrange: '#f26419',
  crystalCore: '#e0ffff',
  crystalHi: '#5ceeff',
  pNavyLo: '#1d284d',
  pNavyHi: '#4b67ab',
  pGoldHi: '#ffe066',
  pBeakHi: '#ffb733',
};

const PIXEL_FONT = {
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  G: ['01111', '10000', '10111', '10001', '01111'],
  R: ['11110', '10001', '11110', '10010', '10001'],
  '!': ['1', '1', '1', '0', '1'],
};

/* ==========================================================================
   Small Utility & Drawing Helpers
   ========================================================================== */

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function seededRand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function getSlotX(index, total) {
  if (total <= 1) return Math.round((SLOT_L + SLOT_R) / 2);
  const step = (SLOT_R - SLOT_L) / (total - 1);
  return Math.round(SLOT_L + index * step);
}

function getTrapdoorWidth(total) {
  if (total <= 1) return 24;
  const step = (SLOT_R - SLOT_L) / (total - 1);
  return clamp(Math.floor(step - 7), 18, 24);
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function fillRectPx(ctx, x, y, w, h, color) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
}

function fillEllipsePx(ctx, cx, cy, rx, ry, color) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const irx = Math.max(0.5, rx);
  const iry = Math.max(0.5, ry);
  const maxDy = Math.ceil(iry);
  ctx.fillStyle = color;
  for (let dy = -maxDy; dy <= maxDy; dy += 1) {
    const ny = dy / (iry + 0.35);
    if (Math.abs(ny) > 1) continue;
    const span = Math.floor(irx * Math.sqrt(Math.max(0, 1 - ny * ny)));
    ctx.fillRect(icx - span, icy + dy, span * 2 + 1, 1);
  }
}

function drawPixelText(ctx, text, x0, y0, color) {
  let cursorX = Math.round(x0);
  const topY = Math.round(y0);
  ctx.fillStyle = color;
  for (let i = 0; i < text.length; i += 1) {
    const glyph = PIXEL_FONT[text[i]];
    if (!glyph) {
      cursorX += 4;
      continue;
    }
    const gw = glyph[0].length;
    for (let r = 0; r < glyph.length; r += 1) {
      const row = glyph[r];
      for (let c = 0; c < gw; c += 1) {
        if (row[c] === '1') {
          ctx.fillRect(cursorX + c, topY + r, 1, 1);
        }
      }
    }
    cursorX += gw + 1;
  }
}

function measurePixelText(text) {
  let w = 0;
  for (let i = 0; i < text.length; i += 1) {
    const glyph = PIXEL_FONT[text[i]];
    w += (glyph ? glyph[0].length : 3) + 1;
  }
  return Math.max(1, w - 1);
}

function drawSpeechBubble(ctx, text, cx, cy, bgCol, borderCol, outlineCol) {
  const tw = measurePixelText(text);
  const bw = tw + 8;
  const bh = 11;
  const x0 = Math.round(cx - bw / 2);
  const y0 = Math.round(cy - bh / 2);

  // Outer dark pixel outline
  fillRectPx(ctx, x0 - 1, y0, bw + 2, bh, outlineCol);
  fillRectPx(ctx, x0, y0 - 1, bw, bh + 2, outlineCol);
  // Inner border & fill
  fillRectPx(ctx, x0, y0, bw, bh, borderCol);
  fillRectPx(ctx, x0 + 1, y0 + 1, bw - 2, bh - 2, bgCol);

  // Small pointer triangle at bottom center
  const px = Math.round(cx);
  fillRectPx(ctx, px - 2, y0 + bh, 4, 2, outlineCol);
  fillRectPx(ctx, px - 1, y0 + bh + 2, 2, 1, outlineCol);
  fillRectPx(ctx, px - 1, y0 + bh - 1, 2, 2, bgCol);

  // Crisp pixel text
  drawPixelText(ctx, text, x0 + 4, y0 + 3, outlineCol);
}

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
  border: 2px solid #2b436e;
  background: #0d1b30;
  box-shadow: 0 14px 32px rgba(10, 12, 24, 0.45);
}
.penguin-arena-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 396 / 224;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  background: #0c1938;
}
.penguin-status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  padding: 0.55rem 0.9rem;
  background: #141020;
  color: #fffdf5;
  font-size: 0.875rem;
  font-weight: 600;
  border-top: 2px solid #382115;
}
.penguin-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.22rem 0.7rem;
  border-radius: 999px;
  background: #234b91;
  color: #fffdf5;
  font-variant-numeric: tabular-nums;
}
.penguin-status-pill[data-danger="true"] {
  background: #b82914;
  color: #fff799;
}
.penguin-status-note {
  color: #ffd042;
  font-weight: 600;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
`;
  document.head.appendChild(style);
}

/* ==========================================================================
   PenguinArena Interactive Canvas Component (396 × 224 Canva 16-Bit Scene)
   ========================================================================== */

export class PenguinArena {
  /**
   * @param {HTMLElement} container
   * @param {{ totalPenguins?: number }} [options]
   */
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('PenguinArena krever et gyldig HTML-element som container.');
    }

    ensureArenaStyles();

    this._container = container;
    this._initialTotal = options.totalPenguins ?? 10;
    this._state = createPenguinState(this._initialTotal);
    this._destroyed = false;
    this._rafId = null;
    this._timers = new Set();
    this._lastFrameTime = 0;
    this._elapsed = 0;
    this._shakeTimer = 0;

    this._flakes = this._createSnowflakes();
    this._particles = [];
    this._pawprints = [];
    this._penguins = [];
    this._trapdoors = [];
    this._bear = this._createInitialBear();

    this._sprites = {
      bg: null,
      bear: null,
      penguin: null,
    };
    this._loadSprites();

    this._buildDom();
    this.reset(this._initialTotal);
    this._startLoop();
  }

  /** @private */
  _loadSprites() {
    if (typeof Image === 'undefined') return;

    const entries = Object.entries(ASSET_URLS);
    for (let i = 0; i < entries.length; i += 1) {
      const [key, url] = entries[i];
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (this._destroyed) return;
        this._sprites[key] = img;
        this._render();
      };
      img.src = url;
    }
  }

  /** @private */
  _createInitialBear() {
    return {
      x: BEAR_HOME_X,
      dir: 1, // 1 = facing right (+1 in sprite sheet), -1 = flipped facing left
      mode: 'wait', // 'wait' | 'watch' | 'sprint' | 'chompOpen' | 'chompChew' | 'grumble'
      modeTimer: 0,
      chewDuration: 0.44,
      targetIndex: null,
      targetX: null,
      runTime: 0,
      breathCycleTime: 0.85, // starts near first inhale peak so user sees breathing immediately
      breathStreamTimer: 0,
      isExhaling: false,
      breathPhase: 0, // 0..1 normalized cycle: 0..0.42 inhale, 0.42..0.72 exhale frost stream, 0.72..1.0 rest
      dustTimer: 0,
      pawprintCooldown: 0,
      pawSide: 0,
      bubbleText: null,
      bubbleTimer: 0,
    };
  }

  /**
   * Resets all penguins onto the bridge, closes trapdoors, and places the bear at home (`x = 88`).
   * @param {number} [totalPenguins]
   */
  reset(totalPenguins = this._state ? this._state.total : 10) {
    this._clearTimers();
    this._state = createPenguinState(totalPenguins);
    this._particles = [];
    this._pawprints = [
      { x: 56, y: BEAR_FLOOR_Y + 2, life: 999 },
      { x: 70, y: BEAR_FLOOR_Y + 5, life: 999 },
      { x: 82, y: BEAR_FLOOR_Y + 2, life: 999 },
    ];
    this._shakeTimer = 0;

    const total = this._state.total;
    const doorW = getTrapdoorWidth(total);

    this._penguins = [];
    this._trapdoors = [];
    for (let i = 0; i < total; i += 1) {
      const slotX = getSlotX(i, total);
      this._trapdoors.push({
        slotX,
        x0: Math.round(slotX - doorW / 2),
        w: doorW,
        angle: 0,
        targetAngle: 0,
      });
      this._penguins.push({
        index: i,
        x: slotX,
        y: BRIDGE_Y,
        vy: 0,
        status: 'idle', // 'idle' | 'cheer' | 'panic' | 'falling' | 'landed' | 'eaten'
        timer: 0,
        landedTimer: 0,
        cheerDelay: 0,
        phase: seededRand(i * 13 + 5) * Math.PI * 2,
        facingDir: slotX > BEAR_HOME_X ? -1 : 1,
      });
    }

    this._bear = this._createInitialBear();
    this._aimBearTowardRemaining();
    this._updateStatusUi();
    this._render();
  }

  /**
   * Wrong answer choreography:
   * 1. Trapdoor under the rightmost remaining penguin swings open, cutting a dark gap in the bridge deck
   * 2. Penguin panics for 250ms (Cell 2 wide-eyed panic + shaking + `!` alert badge)
   * 3. Penguin falls with gravity into the torchlit ice cavern, wobbling with trailing feathers
   * 4. Penguin lands on the snow floor at `y = 194` (`landed` state + snow splash)
   * 5. ONLY AFTER landing, the polar bear gallops at 240 px/s across the cave floor (alternating Cell 1 & Cell 2 every 95ms)
   * 6. Bear lunges with wide-open jaws (Cell 3 `chompOpen`), triggering a 3px camera shake, 26+ snow/feather particles & `"NOM!"` badge
   * 7. Bear chews twice (`Cell 0` <-> `Cell 3` in `chompChew`), then waits right where it is (`Cell 0`), facing remaining penguins
   */
  onWrongAnswer() {
    const prevRemaining = this._state.remaining;
    const nextState = dropOnePenguin(this._state);
    this._state = nextState;

    if (nextState.remaining === prevRemaining) {
      return { ...this._state };
    }

    const idx = nextState.fallingIndex;
    const targetX = getSlotX(idx, nextState.total);
    const door = this._trapdoors[idx];
    const penguin = this._penguins[idx];

    this._updateStatusUi();

    if (prefersReducedMotion()) {
      if (door) {
        door.angle = 88;
        door.targetAngle = 88;
      }
      if (penguin) {
        penguin.status = 'eaten';
      }
      const bear = this._bear;
      bear.dir = targetX >= bear.x ? 1 : -1;
      bear.x = clamp(targetX - bear.dir * 28, 48, W - 48);
      bear.mode = 'chompOpen';
      bear.modeTimer = 0.5;
      this._setBubble('NOM!', 1.0);
      this._render();

      this._schedule(() => {
        bear.bubbleText = null;
        bear.mode = 'wait';
        this._aimBearTowardRemaining();
        this._state = { ...this._state, bearState: 'patrol' };
        this._render();
      }, 900);

      return { ...this._state };
    }

    if (door) {
      door.targetAngle = 88;
      this._spawnSnowBurst(targetX, BRIDGE_Y + 2, 8);
    }

    if (penguin) {
      penguin.status = 'panic';
      penguin.timer = 0.25; // 250ms panic hang-time as trapdoor snaps open
      penguin.vy = 0;
      penguin.y = BRIDGE_Y;
    }

    if (this._bear.mode === 'wait' || this._bear.mode === 'grumble') {
      this._bear.mode = 'watch';
      this._bear.targetIndex = idx;
      this._bear.targetX = targetX;
      this._bear.dir = targetX >= this._bear.x ? 1 : -1;
      this._bear.bubbleText = null;
    }

    return { ...this._state };
  }

  /**
   * Correct answer choreography:
   * - Remaining penguins jump (-7px) in a staggered wave showing Cell 1 (both flippers raised high!) + golden sparkles
   * - Polar bear roars/grumbles showing Cell 3 for 450ms with a paw-stomp snow puff & `"GRRR!"` pixel badge
   */
  onCorrectAnswer() {
    this._state = celebratePenguins(this._state);
    const reduced = prefersReducedMotion();

    for (let i = 0; i < this._state.remaining; i += 1) {
      const p = this._penguins[i];
      if (!p || (p.status !== 'idle' && p.status !== 'cheer')) continue;
      if (!reduced) {
        p.status = 'cheer';
        p.cheerDelay = i * 0.035;
        p.timer = 0.75;
        this._spawnSparkles(p.x, BRIDGE_Y - 28);
      }
    }

    const bear = this._bear;
    if (bear.mode === 'wait' || bear.mode === 'grumble') {
      bear.mode = 'grumble';
      bear.modeTimer = 0.45; // 450ms Cell 3 roar/grumble
      this._setBubble('GRRR!', 0.85);
      if (!reduced) {
        this._spawnSnowBurst(bear.x + bear.dir * 18, BEAR_FLOOR_Y, 8);
        this._spawnBreath(true);
      }
    }

    this._updateStatusUi();

    if (reduced) {
      this._render();
      this._schedule(() => {
        if (this._state.bearState === 'grumble') {
          bear.mode = 'wait';
          bear.bubbleText = null;
          this._state = { ...this._state, bearState: 'patrol' };
          this._render();
        }
      }, 850);
    }

    return { ...this._state };
  }

  /** Returns a snapshot of the current arena state. */
  getState() {
    return { ...this._state };
  }

  /** Stops the animation loop, clears timers, and removes DOM nodes. */
  destroy() {
    this._destroyed = true;
    this._clearTimers();
    if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._container) {
      this._container.replaceChildren();
    }
    this._canvas = null;
    this._ctx = null;
  }

  /* ------------------------------------------------------------------------
     Setup & DOM Builders
     ------------------------------------------------------------------------ */

  /** @private */
  _schedule(fn, delayMs) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      if (!this._destroyed) fn();
    }, delayMs);
    this._timers.add(id);
    return id;
  }

  /** @private */
  _clearTimers() {
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();
  }

  /** @private */
  _setBubble(text, duration) {
    this._bear.bubbleText = text;
    this._bear.bubbleTimer = duration;
  }

  /** @private */
  _aimBearTowardRemaining() {
    const remaining = this._state.remaining;
    if (remaining <= 0) return;
    let sum = 0;
    for (let i = 0; i < remaining; i += 1) {
      sum += this._penguins[i] ? this._penguins[i].x : 0;
    }
    const avgX = sum / remaining;
    if (Math.abs(avgX - this._bear.x) > 8) {
      this._bear.dir = avgX >= this._bear.x ? 1 : -1;
    }
  }

  /** @private */
  _createSnowflakes() {
    const flakes = [];
    for (let i = 0; i < 36; i += 1) {
      const front = i >= 22;
      flakes.push({
        x: seededRand(i * 7 + 1) * W,
        y: seededRand(i * 7 + 2) * H,
        speed: front ? 16 + seededRand(i * 7 + 3) * 9 : 8 + seededRand(i * 7 + 3) * 5,
        drift: front ? 7 : 3.5,
        phase: seededRand(i * 7 + 4) * Math.PI * 2,
        front,
      });
    }
    return flakes;
  }

  /** @private */
  _buildDom() {
    this._container.replaceChildren();

    const wrap = document.createElement('div');
    wrap.className = 'penguin-arena-wrap';

    const canvas = document.createElement('canvas');
    canvas.className = 'penguin-arena-canvas';
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Isbro med pingviner over en ishule med en sulten isbjørn');
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    if (this._ctx) {
      this._ctx.imageSmoothingEnabled = false;
    }

    wrap.appendChild(canvas);

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
  _updateStatusUi() {
    const { remaining, eaten, total } = this._state;
    if (this._statusPill) {
      this._statusPill.textContent = `🐧 ${remaining} / ${total} pingviner trygge`;
      this._statusPill.dataset.danger = remaining <= Math.ceil(total * 0.3) ? 'true' : 'false';
    }
    if (this._statusNote) {
      this._statusNote.textContent = `🐻‍❄️ ${eaten} spist i ishulen`;
    }
    if (this._canvas) {
      this._canvas.setAttribute(
        'aria-label',
        `Isbro med ${remaining} av ${total} pingviner trygge. ${eaten} pingviner er spist av isbjørnen i ishulen.`
      );
    }
  }

  /* ------------------------------------------------------------------------
     Particle Emitters (Snow, Feathers, Crystal Sparkles, Breath, Embers)
     ------------------------------------------------------------------------ */

  /** @private */
  _addParticle(p) {
    if (this._particles.length < 240) {
      this._particles.push(p);
    }
  }

  /** @private */
  _spawnSnowBurst(x, y, count = 10) {
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const r = Math.random();
      this._addParticle({
        kind: 'snow',
        x: x + (Math.random() - 0.5) * 12,
        y: y - 1,
        vx: side * (18 + r * 52),
        vy: -22 - r * 44,
        g: 150,
        size: r < 0.55 ? 2 : 1,
        life: 0.42 + r * 0.28,
        max: 0.7,
        color: i % 3 === 0 ? PAL.snowMid : PAL.snowHi,
        floor: BEAR_FLOOR_Y + 3,
      });
    }
  }

  /** @private */
  _spawnLandingPuff(x, y) {
    this._spawnSnowBurst(x, y, 16);
    for (let i = -1; i <= 1; i += 1) {
      this._addParticle({
        kind: 'puff',
        x: x + i * 6,
        y: y - 2,
        vx: i * 16,
        vy: -7,
        g: 0,
        r: 3.5,
        life: 0.44,
        max: 0.44,
        color: PAL.snowHi,
      });
    }
  }

  /** @private */
  _spawnChompBurst(x, y) {
    // 26+ snow and feather particles on chomp!
    this._spawnSnowBurst(x, y, 18);
    const featherColors = [PAL.pNavyLo, PAL.snowHi, PAL.pGoldHi, PAL.pNavyHi, PAL.pBeakHi];
    for (let i = 0; i < 14; i += 1) {
      const ang = -Math.PI * 0.12 - Math.random() * Math.PI * 0.76;
      const sp = 30 + Math.random() * 58;
      this._addParticle({
        kind: 'feather',
        x: x + (Math.random() - 0.5) * 12,
        y: y - 8,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 16,
        g: 36,
        sway: Math.random() * Math.PI * 2,
        life: 0.92 + Math.random() * 0.45,
        max: 1.37,
        color: featherColors[i % featherColors.length],
      });
    }
  }

  /** @private */
  _spawnSparkles(x, y) {
    const colors = [PAL.fireCore, PAL.pGoldHi, PAL.crystalHi];
    for (let i = 0; i < 6; i += 1) {
      this._addParticle({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 20,
        vy: -16 - Math.random() * 20,
        g: 14,
        life: 0.54 + Math.random() * 0.25,
        max: 0.79,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnBreath(heavy = false) {
    const b = this._bear;
    // Exact mouth/snout coordinates on the 76×56 Cell 0 bear sprite
    const mouthX = b.x + b.dir * 27;
    const mouthY = BEAR_FLOOR_Y - 42;
    const count = heavy ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const spread = (Math.random() - 0.5) * 3;
      const speed = (heavy ? 9 : 5.5) + i * 2.5 + Math.random() * 3.5;
      this._addParticle({
        kind: 'frostBreath',
        x: mouthX + b.dir * (i * 1.5),
        y: mouthY + spread * 0.2,
        vx: b.dir * speed,
        vy: -2.2 - i * 0.9 + spread * 0.4,
        g: -3.8, // gentle upward curl
        r0: 1.0,
        r1: (heavy ? 3.4 : 2.5) + Math.random() * 0.8,
        life: (heavy ? 0.72 : 0.62) + Math.random() * 0.12,
        max: heavy ? 0.82 : 0.72,
      });
    }
  }

  /* ------------------------------------------------------------------------
     Animation Loop & Choreography Simulation
     ------------------------------------------------------------------------ */

  /** @private */
  _startLoop() {
    if (typeof requestAnimationFrame !== 'function') return;
    this._lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = (now) => {
      if (this._destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this._lastFrameTime) / 1000));
      this._lastFrameTime = now;
      if (!prefersReducedMotion()) {
        this._update(dt);
        this._render();
      }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  /** @private */
  _update(dt) {
    this._elapsed += dt;
    const t = this._elapsed;

    if (this._shakeTimer > 0) {
      this._shakeTimer = Math.max(0, this._shakeTimer - dt);
    }

    // Gentle snowfall
    for (let i = 0; i < this._flakes.length; i += 1) {
      const f = this._flakes[i];
      f.y += f.speed * dt;
      f.x += Math.sin(t * 1.1 + f.phase) * f.drift * dt;
      if (f.y > H + 2) {
        f.y = -2;
        f.x = Math.random() * W;
      }
      if (f.x < -2) f.x = W + 2;
      if (f.x > W + 2) f.x = -2;
    }

    // Rising warm ember pixels from the 3 cave wall torches
    if (Math.random() < dt * 8) {
      const torch = CAVE_TORCHES[Math.floor(Math.random() * CAVE_TORCHES.length)];
      this._addParticle({
        kind: 'ember',
        x: torch.x + (Math.random() - 0.5) * 5,
        y: torch.y - 6,
        vx: (Math.random() - 0.5) * 10,
        vy: -15 - Math.random() * 14,
        g: -4,
        life: 0.55 + Math.random() * 0.35,
        max: 0.9,
        color: Math.random() < 0.5 ? PAL.fireCore : PAL.fireGold,
      });
    }

    // Rising tiny cyan sparkle pixels above the glowing cyan cave crystals
    if (Math.random() < dt * 7) {
      const crystal = CAVE_CRYSTALS[Math.floor(Math.random() * CAVE_CRYSTALS.length)];
      this._addParticle({
        kind: 'crystalSpark',
        x: crystal.x + (Math.random() - 0.5) * 14,
        y: crystal.y - 4 + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 6,
        vy: -10 - Math.random() * 10,
        g: 0,
        life: 0.65 + Math.random() * 0.4,
        max: 1.05,
        color: Math.random() < 0.5 ? PAL.crystalCore : PAL.crystalHi,
      });
    }

    // Hinged wooden trapdoors
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      if (door.angle < door.targetAngle) {
        door.angle = Math.min(door.targetAngle, door.angle + 380 * dt);
      }
    }

    // Penguins update
    const bear = this._bear;
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      if (p.status === 'idle' || p.status === 'cheer') {
        const dx = bear.x - p.x;
        if (Math.abs(dx) > 18) {
          p.facingDir = dx > 0 ? 1 : -1;
        }
      }

      if (p.status === 'cheer') {
        if (p.cheerDelay > 0) {
          p.cheerDelay -= dt;
        } else {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.status = 'idle';
            p.timer = 0;
          }
        }
      } else if (p.status === 'panic') {
        p.timer -= dt;
        if (p.timer <= 0) {
          p.status = 'falling';
          p.timer = 0;
          p.vy = 25;
        }
      } else if (p.status === 'falling') {
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;

        // Trailing white/navy feather pixels while falling
        if (Math.random() < dt * 26) {
          this._addParticle({
            kind: 'feather',
            x: p.x + (Math.random() - 0.5) * 10,
            y: p.y - 14,
            vx: (Math.random() - 0.5) * 24,
            vy: -12 - Math.random() * 15,
            g: 28,
            sway: Math.random() * Math.PI * 2,
            life: 0.55 + Math.random() * 0.25,
            max: 0.8,
            color: Math.random() < 0.5 ? PAL.snowHi : PAL.pNavyHi,
          });
        }

        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = 0;
          p.status = 'landed';
          p.landedTimer = 0;
          this._spawnLandingPuff(p.x, FLOOR_Y);
          this._shakeTimer = Math.max(this._shakeTimer, 0.09);
        }
      } else if (p.status === 'landed') {
        p.landedTimer += dt;
      }
    }

    // Polar bear choreography
    this._updatePolarBear(dt);

    // Particles update
    for (let i = this._particles.length - 1; i >= 0; i -= 1) {
      const pt = this._particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this._particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.g * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.kind === 'feather') {
        pt.x += Math.sin(t * 5 + pt.sway) * 12 * dt;
        pt.vx *= 0.96;
      }
      if (pt.floor && pt.y > pt.floor) {
        pt.y = pt.floor;
        pt.vy = 0;
        pt.vx *= 0.5;
      }
    }
  }

  /** @private */
  _findActiveDropTarget() {
    let landed = null;
    let airborne = null;
    for (let i = this._penguins.length - 1; i >= 0; i -= 1) {
      const p = this._penguins[i];
      if (p.status === 'landed') {
        landed = p;
        break;
      }
      if ((p.status === 'falling' || p.status === 'panic') && !airborne) {
        airborne = p;
      }
    }
    return { landed, airborne };
  }

  /** @private */
  _updatePolarBear(dt) {
    const bear = this._bear;

    if (bear.bubbleTimer > 0) {
      bear.bubbleTimer -= dt;
      if (bear.bubbleTimer <= 0) {
        bear.bubbleText = null;
      }
    }

    if (bear.mode === 'wait' || bear.mode === 'watch') {
      // Rhythmic breathing cycle: 2.3s calm cycle in 'wait', 1.35s excited panting in 'watch'
      const cycleDuration = bear.mode === 'watch' ? 1.35 : 2.3;
      bear.breathCycleTime = (bear.breathCycleTime + dt) % cycleDuration;
      bear.breathPhase = bear.breathCycleTime / cycleDuration;

      // Exhale window (0.42 -> 0.66 of cycle): chest compresses while a subtle wisp of frost breath drifts out
      const inExhaleWindow = bear.breathPhase >= 0.42 && bear.breathPhase <= 0.66;
      if (inExhaleWindow) {
        bear.isExhaling = true;
        bear.breathStreamTimer -= dt;
        if (bear.breathStreamTimer <= 0) {
          this._spawnBreath(bear.mode === 'watch');
          bear.breathStreamTimer = 0.13; // delicate, spaced-out wisps during exhale
        }
      } else {
        bear.isExhaling = false;
        bear.breathStreamTimer = 0;
      }
    } else {
      bear.isExhaling = false;
    }

    const { landed, airborne } = this._findActiveDropTarget();

    if (bear.mode === 'wait') {
      // Polar bear stands still waiting (does NOT patrol back and forth!)
      this._aimBearTowardRemaining();
      if (landed) {
        if (landed.landedTimer >= 0.08) {
          this._beginBearSprint(landed);
        } else {
          bear.mode = 'watch';
          bear.targetIndex = landed.index;
          bear.targetX = landed.x;
        }
      } else if (airborne) {
        bear.mode = 'watch';
        bear.targetIndex = airborne.index;
        bear.targetX = airborne.x;
      }
    } else if (bear.mode === 'watch') {
      // Watches falling penguin; starts galloping ONLY AFTER penguin lands on the snow floor at y = 194!
      const focus = landed || airborne;
      if (!focus) {
        bear.mode = 'wait';
      } else {
        bear.targetIndex = focus.index;
        bear.targetX = focus.x;
        if (Math.abs(focus.x - bear.x) > 6) {
          bear.dir = focus.x >= bear.x ? 1 : -1;
        }
        if (landed && landed.landedTimer >= 0.08) {
          this._beginBearSprint(landed);
        }
      }
    } else if (bear.mode === 'sprint') {
      const target = (bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null) || landed;
      if (!target || target.status === 'eaten') {
        bear.mode = 'wait';
        return;
      }
      const stopDist = 28;
      const dx = target.x - bear.x;
      const dist = Math.abs(dx);
      bear.dir = dx >= 0 ? 1 : -1;
      bear.runTime += dt;

      bear.dustTimer -= dt;
      if (bear.dustTimer <= 0) {
        this._spawnSnowBurst(bear.x - bear.dir * 22, BEAR_FLOOR_Y, 5);
        bear.dustTimer = 0.08;
      }

      bear.pawprintCooldown -= dt;
      if (bear.pawprintCooldown <= 0) {
        bear.pawSide = 1 - bear.pawSide;
        this._pawprints.push({
          x: Math.round(bear.x - bear.dir * 16),
          y: BEAR_FLOOR_Y + 2 + bear.pawSide * 3,
          life: 10,
        });
        if (this._pawprints.length > 32) {
          this._pawprints.shift();
        }
        bear.pawprintCooldown = 0.095;
      }

      if (dist <= stopDist) {
        // Lunge with wide-open jaws (Cell 3) over the penguin!
        bear.mode = 'chompOpen';
        bear.modeTimer = 0.16;
        bear.targetIndex = target.index;
      } else {
        const step = Math.min(dist - stopDist + 1, BEAR_SPEED * dt);
        bear.x = clamp(bear.x + bear.dir * step, 44, W - 44);
      }
    } else if (bear.mode === 'chompOpen') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        const target = bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null;
        const burstX = target ? target.x : bear.x + bear.dir * 28;
        if (target && target.status !== 'eaten') {
          target.status = 'eaten';
        }
        // Transition to chompChew (alternates Cell 0 <-> Cell 3 twice)
        bear.mode = 'chompChew';
        bear.chewDuration = 0.48;
        bear.modeTimer = bear.chewDuration;
        this._setBubble('NOM!', 1.15);
        this._shakeTimer = 0.22; // 3px camera shake
        this._spawnChompBurst(burstX, FLOOR_Y - 8);
      }
    } else if (bear.mode === 'chompChew') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        bear.targetIndex = null;
        bear.targetX = null;
        const next = this._findActiveDropTarget();
        if (next.landed) {
          this._beginBearSprint(next.landed);
        } else if (next.airborne) {
          bear.mode = 'watch';
          bear.targetIndex = next.airborne.index;
          bear.targetX = next.airborne.x;
        } else {
          bear.mode = 'wait';
          this._aimBearTowardRemaining();
          this._state = { ...this._state, bearState: 'patrol' };
        }
      }
    } else if (bear.mode === 'grumble') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        bear.mode = 'wait';
        this._state = { ...this._state, bearState: 'patrol' };
      }
    }
  }

  /** @private */
  _beginBearSprint(target) {
    const bear = this._bear;
    bear.mode = 'sprint';
    bear.targetIndex = target.index;
    bear.targetX = target.x;
    bear.dir = target.x >= bear.x ? 1 : -1;
    bear.runTime = 0;
    bear.bubbleText = null;
    bear.dustTimer = 0;
    bear.pawprintCooldown = 0;
    this._spawnSnowBurst(bear.x - bear.dir * 20, BEAR_FLOOR_Y, 7);
  }

  /* ------------------------------------------------------------------------
     Rendering Pipeline (396 × 224 Canva 16-Bit Pixel-Art Scene)
     ------------------------------------------------------------------------ */

  /** @private */
  _render() {
    const ctx = this._ctx;
    if (!ctx) return;

    const t = this._elapsed;
    ctx.imageSmoothingEnabled = false;

    let shakeX = 0;
    let shakeY = 0;
    if (this._shakeTimer > 0) {
      shakeX = Math.round((Math.random() * 2 - 1) * 3);
      shakeY = Math.round((Math.random() * 2 - 1) * 3);
    }

    ctx.save();
    if (shakeX || shakeY) {
      ctx.translate(shakeX, shakeY);
    }

    // 1. Canva 16-bit background (`198×112` scaled 2× to `396×224`) + atmospheric glow overlays
    this._drawBackgroundAndAtmosphere(ctx, t);

    // 2. Background drifting snowflakes
    this._drawSnowflakes(ctx, false);

    // 3. Trapdoor bridge cutouts & swinging wooden trapdoor leaves
    this._drawTrapdoorCutouts(ctx);

    // 4. Bear pawprints on the snowy cave floor
    this._drawPawprints(ctx);

    // 5. 10 Penguins on the Bridge (or falling / landed) from `./assets/canva-penguin.png`
    this._drawPenguins(ctx, t);

    // 6. Hungry Polar Bear in the Cave from `./assets/canva-bear.png` (84 × 66 px)
    this._drawPolarBear(ctx, t);

    // 7. Particles & foreground snowflakes
    this._drawParticles(ctx);
    this._drawSnowflakes(ctx, true);

    // 8. Pixel speech badges ("NOM!", "GRRR!")
    this._drawBearSpeechBubble(ctx);

    ctx.restore();
  }

  /** @private */
  _drawBackgroundAndAtmosphere(ctx, t) {
    const bgImg = this._sprites.bg;
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      // Instant first-millisecond dark blue fallback before image decode finishes
      fillRectPx(ctx, 0, 0, W, 92, PAL.skyFallback);
      fillRectPx(ctx, 0, 92, W, H - 92, PAL.caveGap);
    }

    // Soft flickering warm golden glow pulses over the 2 bridge lanterns
    ctx.save();
    for (let i = 0; i < BRIDGE_LANTERNS.length; i += 1) {
      const L = BRIDGE_LANTERNS[i];
      const alpha = 0.12 + 0.06 * Math.sin(t * 5.2 + i * 2.1);
      ctx.globalAlpha = alpha;
      fillEllipsePx(ctx, L.x, L.y, 18, 14, PAL.fireGold);
      ctx.globalAlpha = alpha * 0.85;
      fillEllipsePx(ctx, L.x, L.y, 9, 7, PAL.fireCore);
    }

    // Soft flickering warm golden glow pulses over the 3 cave wall torches
    for (let i = 0; i < CAVE_TORCHES.length; i += 1) {
      const torch = CAVE_TORCHES[i];
      const alpha = 0.13 + 0.07 * Math.sin(t * 7.8 + i * 1.9);
      ctx.globalAlpha = alpha;
      fillEllipsePx(ctx, torch.x, torch.y - 2, 22, 18, PAL.fireOrange);
      ctx.globalAlpha = alpha * 0.9;
      fillEllipsePx(ctx, torch.x, torch.y - 3, 10, 8, PAL.fireCore);
    }

    // Subtle cyan shimmer pulse over the cave crystal clusters
    for (let i = 0; i < CAVE_CRYSTALS.length; i += 1) {
      const c = CAVE_CRYSTALS[i];
      const alpha = 0.08 + 0.05 * Math.sin(t * 3.1 + i * 1.5);
      ctx.globalAlpha = alpha;
      fillEllipsePx(ctx, c.x, c.y, 14, 10, PAL.crystalHi);
    }
    ctx.restore();
  }

  /** @private */
  _drawTrapdoorCutouts(ctx) {
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const d = this._trapdoors[i];
      if (d.angle <= 5) continue;

      const gapX = Math.round(d.slotX - 10);
      const gapY = 91;
      const gapW = 20;
      const gapH = 8;

      // Dark cavern gap cut flush inside the timber bridge beam at (slotX - 10, 91)
      fillRectPx(ctx, gapX, gapY, gapW, gapH, '#122238');
      fillRectPx(ctx, gapX, gapY, gapW, 1, PAL.oakDark);

      // Wooden plank side borders framing the open trapdoor cutout
      fillRectPx(ctx, gapX - 1, gapY, 1, gapH, PAL.oakDark);
      fillRectPx(ctx, gapX + gapW, gapY, 1, gapH, PAL.oakDark);

      // Swinging wooden trapdoor leaf rotating downward into the cavern
      const rad = (d.angle * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const hx = gapX + 1;
      const hy = gapY + gapH - 1;
      const leafLen = gapW - 3;

      for (let u = 0; u < leafLen; u += 1) {
        const px = Math.round(hx + u * cosA);
        const py = Math.round(hy + u * sinA);
        fillRectPx(ctx, px - 1, py - 1, 3, 3, PAL.outline);
        fillRectPx(ctx, px, py, 2, 2, u % 4 === 0 ? PAL.oakMid : PAL.oakWarm);
      }
      // Iron hinge bolt
      fillRectPx(ctx, hx, hy - 1, 1, 1, PAL.boltHi);
    }
  }

  /** @private */
  _drawPawprints(ctx) {
    for (let i = 0; i < this._pawprints.length; i += 1) {
      const pp = this._pawprints[i];
      fillRectPx(ctx, pp.x, pp.y, 4, 2, PAL.snowDeep);
      fillRectPx(ctx, pp.x - 1, pp.y - 1, 1, 1, PAL.snowLo);
      fillRectPx(ctx, pp.x + 1, pp.y - 1, 1, 1, PAL.snowLo);
      fillRectPx(ctx, pp.x + 3, pp.y - 1, 1, 1, PAL.snowLo);
    }
  }

  /** @private */
  _drawPenguins(ctx, t) {
    const pImg = this._sprites.penguin;

    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      let cellIndex = 0; // 0 = idle, 1 = cheer, 2 = panic/fall/landed
      let yOffset = 0;
      let xOffset = 0;
      let rotAngle = 0;

      if (p.status === 'idle') {
        cellIndex = 0;
        yOffset = Math.round(Math.sin(t * 3.2 + p.phase) * 0.75);
      } else if (p.status === 'cheer') {
        if (p.cheerDelay <= 0) {
          cellIndex = 1;
          const el = 0.75 - p.timer;
          yOffset = -Math.round(Math.abs(Math.sin((el * Math.PI) / 0.375)) * 7);
        } else {
          cellIndex = 0;
        }
      } else if (p.status === 'panic') {
        cellIndex = 2;
        xOffset = Math.floor(t * 30) % 2 === 0 ? -1 : 1;
      } else if (p.status === 'falling') {
        cellIndex = 2;
        xOffset = Math.round(Math.sin(t * 18 + p.phase) * 1.5);
      } else if (p.status === 'landed') {
        cellIndex = 2;
        xOffset = Math.floor(t * 14) % 2 === 0 ? -1 : 0;
      }

      const drawX = Math.round(p.x + xOffset);
      const drawY = Math.round(p.y + yOffset);

      // Soft oval contact shadow (16 × 4 px, rgba(10, 18, 35, 0.45)) on bridge deck or snow floor
      if (p.status === 'idle' || p.status === 'cheer') {
        fillEllipsePx(ctx, drawX, BRIDGE_Y, 8, 2, 'rgba(10, 18, 35, 0.45)');
      } else if (p.status === 'landed') {
        fillEllipsePx(ctx, drawX, FLOOR_Y, 9, 2, 'rgba(10, 18, 35, 0.45)');
      }

      if (pImg && pImg.complete && pImg.naturalWidth > 0) {
        const sx = cellIndex * PENGUIN_CELL_W;
        const flipDir = p.status === 'falling'
          ? (Math.floor(t * 10 + i) % 2 === 0 ? 1 : -1)
          : p.facingDir;
        ctx.save();
        // Exact 1:1 integer pixel placement (zero fractional rotation shearing!)
        ctx.translate(drawX, drawY + 2 - PENGUIN_DRAW_H);
        if (flipDir < 0) {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(
          pImg,
          sx,
          0,
          PENGUIN_CELL_W,
          PENGUIN_CELL_H,
          -Math.round(PENGUIN_DRAW_W / 2),
          0,
          PENGUIN_DRAW_W,
          PENGUIN_DRAW_H
        );
        ctx.restore();
      } else {
        // Minimal fallback silhouette if image is still decoding
        fillRectPx(ctx, drawX - 6, drawY - 22, 12, 22, PAL.pNavyLo);
      }
    }
  }

  /** @private */
  _drawPolarBear(ctx, t) {
    const b = this._bear;
    const bImg = this._sprites.bear;

    let cellIndex = 0; // 0 = idle, 1 = gallop stride 1, 2 = gallop bound 2, 3 = chomp/roar
    let yOffset = 0;

    if (b.mode === 'sprint') {
      // Alternates between Cell 1 (sx = 56) and Cell 2 (sx = 112) every 95ms, with -4px vertical hop on Cell 2
      const stridePhase = Math.floor(b.runTime / 0.095) % 2;
      if (stridePhase === 0) {
        cellIndex = 1;
        yOffset = 0;
      } else {
        cellIndex = 2;
        yOffset = -4;
      }
    } else if (b.mode === 'chompOpen') {
      cellIndex = 3;
      yOffset = -1;
    } else if (b.mode === 'chompChew') {
      // Alternates Cell 0 <-> Cell 3 twice while chewing
      const elapsedChew = Math.max(0, b.chewDuration - b.modeTimer);
      const step = Math.floor((elapsedChew / b.chewDuration) * 4);
      cellIndex = step % 2 === 0 ? 0 : 3;
    } else if (b.mode === 'grumble') {
      cellIndex = 3;
    } else {
      // Stand & Wait (Cell 0): paws stay 100% planted while 3-slice chest & head breathe
      cellIndex = 0;
      yOffset = 0;
    }

    const drawX = Math.round(b.x);
    const drawY = BEAR_FLOOR_Y + yOffset;

    // Soft dark contact shadow (54 × 8 px) under the polar bear's paws
    fillEllipsePx(ctx, drawX, BEAR_FLOOR_Y + 1, 27, 4, 'rgba(10, 18, 35, 0.5)');

    if (bImg && bImg.complete && bImg.naturalWidth > 0) {
      const sx = cellIndex * BEAR_CELL_W;
      ctx.save();
      ctx.translate(drawX, drawY + 2 - BEAR_DRAW_H);
      if (b.dir < 0) {
        ctx.scale(-1, 1);
      }

      if (cellIndex === 0 && (b.mode === 'wait' || b.mode === 'watch')) {
        // 3-Slice Synchronized Breathing Animation (paws stay 100% planted on snow floor!):
        // Phase 0.00..0.42 = Inhale (chest & head swell up -2px, chest expands +1px forward)
        // Phase 0.42..0.70 = Exhale (chest compresses back down while snout pushes +1px forward blowing icy frost!)
        // Phase 0.70..1.00 = Calm rest
        const ph = b.breathPhase || 0;
        let inhaleAmount = 0; // 0..1
        let exhalePush = 0;   // 0..1
        if (ph < 0.42) {
          inhaleAmount = Math.sin((ph / 0.42) * (Math.PI * 0.5));
        } else if (ph < 0.72) {
          const exT = (ph - 0.42) / 0.30;
          inhaleAmount = Math.cos(exT * (Math.PI * 0.5));
          exhalePush = Math.sin(exT * Math.PI);
        }

        const chestLiftY = -Math.round(inhaleAmount * 2);     // 0 to -2px upward chest heave
        const chestExpandX = Math.round(inhaleAmount * 1);    // 0 to +1px chest expansion
        const headLiftY = -Math.round(inhaleAmount * 2) + Math.round(exhalePush * 1); // rises on inhale, dips slightly on exhale
        const headForwardX = Math.round(exhalePush * 1);      // pushes +1px forward while blowing frost breath!

        const halfW = Math.round(BEAR_DRAW_W / 2);

        // Slice 1 (Bottom legs & paws: sy = 38..56) — 100% stationary planted on snow floor!
        ctx.drawImage(
          bImg,
          sx, 38, BEAR_CELL_W, 18,
          -halfW, 38, BEAR_DRAW_W, 18
        );

        // Slice 2 (Mid ribcage, belly & shoulder hump: sy = 18..39) — heaves up & expands on inhale!
        ctx.drawImage(
          bImg,
          sx, 18, BEAR_CELL_W, 21,
          -halfW, 18 + chestLiftY, BEAR_DRAW_W + chestExpandX, 21 - chestLiftY
        );

        // Slice 3 (Upper shoulder, neck, head & snout: sy = 0..19) — rises on inhale, pushes forward on icy exhale!
        ctx.drawImage(
          bImg,
          sx, 0, BEAR_CELL_W, 19,
          -halfW + headForwardX, headLiftY, BEAR_DRAW_W, 19
        );
      } else {
        ctx.drawImage(
          bImg,
          sx,
          0,
          BEAR_CELL_W,
          BEAR_CELL_H,
          -Math.round(BEAR_DRAW_W / 2),
          0,
          BEAR_DRAW_W,
          BEAR_DRAW_H
        );
      }
      ctx.restore();
    } else {
      // Minimal fallback silhouette if image is still decoding
      fillRectPx(ctx, drawX - 30, drawY - 42, 60, 42, PAL.snowHi);
    }
  }

  /** @private */
  _drawSnowflakes(ctx, frontLayer) {
    for (let i = 0; i < this._flakes.length; i += 1) {
      const f = this._flakes[i];
      if (f.front !== frontLayer) continue;
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      if (frontLayer) {
        fillRectPx(ctx, x, y, 2, 1, PAL.snowHi);
        fillRectPx(ctx, x, y + 1, 1, 1, PAL.snowMid);
      } else {
        fillRectPx(ctx, x, y, 1, 1, PAL.snowMid);
      }
    }
  }

  /** @private */
  _drawParticles(ctx) {
    for (let i = 0; i < this._particles.length; i += 1) {
      const pt = this._particles[i];
      const x = Math.round(pt.x);
      const y = Math.round(pt.y);

      if (pt.kind === 'snow') {
        fillRectPx(ctx, x, y, pt.size, pt.size, pt.color);
      } else if (pt.kind === 'ember' || pt.kind === 'crystalSpark') {
        fillRectPx(ctx, x, y, 1, 1, pt.color);
      } else if (pt.kind === 'feather') {
        fillRectPx(ctx, x - 1, y - 1, 4, 3, PAL.outline);
        fillRectPx(ctx, x, y, 2, 1, pt.color);
        fillRectPx(ctx, x + 1, y + 1, 1, 1, pt.color);
      } else if (pt.kind === 'spark') {
        fillRectPx(ctx, x, y, 1, 1, pt.color);
        if (pt.life / pt.max > 0.45) {
          fillRectPx(ctx, x - 1, y, 3, 1, pt.color);
          fillRectPx(ctx, x, y - 1, 1, 3, pt.color);
        }
      } else if (pt.kind === 'frostBreath') {
        // Subtle, delicate wisp of cold breath fading softly into the cavern air
        const age = 1 - pt.life / pt.max; // 0 (at mouth) -> 1 (dissipated)
        const r = Math.max(1, Math.round(pt.r0 + (pt.r1 - pt.r0) * Math.pow(age, 0.75)));
        const alpha = age < 0.2 ? age / 0.2 : Math.max(0, Math.pow((1 - age) / 0.8, 1.3));
        ctx.save();
        ctx.globalAlpha = alpha * 0.16;
        fillEllipsePx(ctx, x, y, r, Math.max(1, Math.round(r * 0.7)), '#9ad9f5');
        ctx.globalAlpha = alpha * 0.24;
        fillEllipsePx(ctx, x - Math.sign(pt.vx || 1), y, Math.max(1, Math.round(r * 0.55)), Math.max(1, Math.round(r * 0.45)), '#e4f7ff');
        ctx.restore();
      } else if (pt.kind === 'puff') {
        const r = Math.max(1, Math.round(pt.r * (pt.life / pt.max)));
        fillEllipsePx(ctx, x, y, r, r, pt.color);
      }
    }
  }

  /** @private */
  _drawBearSpeechBubble() {
    // Speech bubbles disabled for clean, pure visual animation
  }
}
