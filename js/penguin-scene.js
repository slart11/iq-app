/**
 * Penguin Ramp & Hungry Polar Bear Ice Cave — HD 2D Retina Canvas Animation Engine.
 *
 * Logical coordinate system: 800 × 360 with automatic devicePixelRatio scaling,
 * smooth anti-aliasing, anatomically rendered Emperor penguins & 4-limb articulated
 * polar bear, and cached procedural Arctic backdrop for silky 60 FPS performance.
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM/window dependencies and can be imported directly in Node.js unit tests.
 */

const STYLE_ID = 'iq-penguin-arena-styles';
const CANVAS_W = 800;
const CANVAS_H = 360;
const RAMP_Y = 142;
const RAMP_H = 20;
const CAVE_TOP = RAMP_Y + RAMP_H; // 162
const FLOOR_Y = 318;
const GRAVITY = 880; // px/s^2 in 800×360 logical space
const BEAR_HOME_X = 145;

/* ==========================================================================
   Pure State Helpers (Zero DOM Dependencies)
   ========================================================================== */

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

/* ==========================================================================
   Math & Geometry Helpers
   ========================================================================== */

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Deterministic pseudo-random helper for stars, snowflakes, and procedural details.
 */
function seededRand(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Computes evenly distributed X coordinates across the 800px wide ramp for `total` slots.
 */
function getSlotX(index, total) {
  if (total <= 1) {
    return 400;
  }
  const left = 92;
  const right = 708;
  const step = (right - left) / (total - 1);
  return Math.round(left + index * step);
}

/**
 * Computes trapdoor width that fits neatly under each penguin slot.
 */
function getTrapdoorWidth(total) {
  if (total <= 1) return 52;
  const step = (708 - 92) / (total - 1);
  return Math.max(34, Math.min(48, Math.floor(step - 14)));
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
 * Injects scoped CSS once into the document head.
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
  border: 2px solid #1e3a5f;
  background: #040b18;
  box-shadow: 0 12px 32px rgba(4, 11, 24, 0.42);
}

.penguin-arena-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 800 / 360;
  user-select: none;
  background: #040b18;
}

.penguin-status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  padding: 0.5rem 0.875rem;
  background: #0b1324;
  color: #f8fafc;
  font-size: 0.875rem;
  font-weight: 600;
  border-top: 1px solid #1e293b;
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
  font-variant-numeric: tabular-nums;
}
`;
  document.head.appendChild(style);
}

/**
 * Helper to trace a rounded rectangle path cleanly across all browsers.
 */
function traceRoundedRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/* ==========================================================================
   PenguinArena HD Retina 2D Canvas Controller (800 × 360)
   ========================================================================== */

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
    this._elapsed = 0;
    this._destroyed = false;
    this._dpr = 1;

    // Scenic ambient elements
    this._stars = this._createStars();
    this._snowflakes = this._createSnowflakes();
    this._frostMotes = this._createFrostMotes();
    this._waterDrops = this._createWaterDrops();
    this._crystals = this._createCrystals();
    this._particles = [];
    this._pawprints = [];
    this._breathClouds = [];

    // Per-slot penguin & trapdoor state
    this._penguins = [];
    this._trapdoors = [];

    // Articulated hero polar bear state (stands & waits, watches falls, sprints after landing!)
    this._bear = this._createInitialBear();

    // Camera impact shake
    this._shakeTimer = 0;
    this._shakeIntensity = 0;

    // Cached static offscreen backdrop
    this._bgCache = null;

    // Cached DOM references
    this._canvas = null;
    this._ctx = null;
    this._statusPill = null;
    this._statusNote = null;

    ensureArenaStyles();
    this._buildDom();
    this._buildStaticBackdropCache();
    this.reset(totalPenguins);
    this._startLoop();
  }

  /** @private */
  _createInitialBear() {
    return {
      x: BEAR_HOME_X,
      yOffset: 0,
      dir: 1, // 1 = right, -1 = left
      mode: 'wait', // 'wait' | 'watch' | 'sprint' | 'chompOpen' | 'chompSnap' | 'chompChew' | 'chompLick' | 'grumble'
      modeTimer: 0,
      targetIndex: null,
      targetX: null,
      stridePhase: 0,
      headPitch: -0.24, // negative = looking up toward ramp
      jawOpen: 0,
      tongueOut: 0,
      blinkCooldown: 2.2,
      blinkTimer: 0,
      breathTimer: 1.4,
      dustTimer: 0,
      pawprintCooldown: 0,
      pawStamp: 0,
      hitFlashTimer: 0,
      bubbleText: null,
      bubbleColor: '#be123c',
      bubbleBg: '#ffffff',
      bubbleTimer: 0,
      bubbleScale: 1,
      bubbleJagged: false,
    };
  }

  /**
   * Resets all penguins onto the ramp, closes trapdoors, and resets the bear to waiting on the left.
   * @param {number} [totalPenguins]
   */
  reset(totalPenguins = this._state ? this._state.total : 10) {
    this._clearTimers();
    this._state = createPenguinState(totalPenguins);
    this._particles = [];
    this._pawprints = [];
    this._breathClouds = [];
    this._shakeTimer = 0;
    this._shakeIntensity = 0;

    const total = this._state.total;
    const doorW = getTrapdoorWidth(total);

    this._penguins = [];
    this._trapdoors = [];

    for (let i = 0; i < total; i += 1) {
      const slotX = getSlotX(i, total);
      this._trapdoors.push({
        x: slotX,
        width: doorW,
        angle: 0,
        targetAngle: 0,
        vel: 0,
        crackGlow: 0,
      });

      this._penguins.push({
        index: i,
        x: slotX,
        y: RAMP_Y - 2, // feet contact on snow blanket
        vy: 0,
        vx: 0,
        rotation: 0,
        rotSpeed: 0,
        status: 'idle', // 'idle' | 'cheer' | 'panic' | 'falling' | 'landed' | 'eaten'
        timer: 0,
        landedTimer: 0,
        cheerDelay: 0,
        breathPhase: seededRand(i * 13 + 5) * Math.PI * 2,
        swayPhase: seededRand(i * 17 + 11) * Math.PI * 2,
        headTilt: (seededRand(i * 23 + 3) - 0.5) * 0.14,
        blinkCooldown: 1.4 + seededRand(i * 29 + 7) * 3.8,
        blinkTimer: 0,
        facingDir: slotX > BEAR_HOME_X ? -1 : 1,
        squashY: 1,
      });
    }

    this._bear = this._createInitialBear();
    this._aimBearTowardRemaining();

    this._updateStatusUi();
    this._render();
  }

  /**
   * Triggers a trapdoor cracking open, penguin panic + gravity drop to the cave floor,
   * and the polar bear watching then sprinting over to eat it once it hits the snow.
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
        door.angle = 92;
        door.targetAngle = 92;
        door.crackGlow = 0;
      }
      if (penguin) {
        penguin.status = 'eaten';
      }
      this._bear.x = clamp(targetX - (targetX >= this._bear.x ? 34 : -34), 86, CANVAS_W - 86);
      this._bear.dir = targetX >= this._bear.x ? 1 : -1;
      this._bear.mode = 'chompLick';
      this._bear.tongueOut = 1;
      this._bear.bubbleText = 'NOM!';
      this._bear.bubbleColor = '#be123c';
      this._bear.bubbleBg = '#fff1f2';
      this._bear.bubbleTimer = 1.0;
      this._bear.bubbleJagged = false;
      this._render();

      this._schedule(() => {
        this._bear.bubbleText = null;
        this._bear.tongueOut = 0;
        this._bear.mode = 'wait';
        this._aimBearTowardRemaining();
        this._state = { ...this._state, bearState: 'patrol' };
        this._render();
      }, 1000);

      return { ...this._state };
    }

    // Crack & swing open hinged ice-and-timber trapdoor with ice shards
    if (door) {
      door.targetAngle = 92;
      door.vel = 520;
      door.crackGlow = 1.0;
      this._spawnIceShards(targetX, RAMP_Y + 8);
    }

    // 280ms dramatic panic beat before falling
    if (penguin) {
      penguin.status = 'panic';
      penguin.timer = 0.28;
      penguin.vy = 0;
      penguin.vx = 0;
      penguin.rotation = 0;
      penguin.y = RAMP_Y - 2;
      this._spawnSweatBurst(targetX, RAMP_Y - 36);
    }

    // Bear watches attentively from its current spot (does NOT run until penguin hits the floor!)
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
   * Celebrates a correct answer: remaining penguins hop and flap joyfully, while the bear grumbles.
   */
  onCorrectAnswer() {
    this._state = celebratePenguins(this._state);
    const reduced = prefersReducedMotion();

    for (let i = 0; i < this._state.remaining; i += 1) {
      const p = this._penguins[i];
      if (!p || p.status === 'panic' || p.status === 'falling' || p.status === 'landed' || p.status === 'eaten') {
        continue;
      }
      if (!reduced) {
        p.status = 'cheer';
        p.cheerDelay = i * 0.036;
        p.timer = 0.72;
        this._spawnCheerSparkles(p.x, RAMP_Y - 46);
      }
    }

    // Bear pauses, lowers head, stamps heavy paw & grumbles (unless currently hunting/eating)
    if (this._bear.mode === 'wait' || this._bear.mode === 'grumble') {
      this._bear.mode = 'grumble';
      this._bear.modeTimer = 1.05;
      this._bear.pawStamp = 1.0;
      this._bear.bubbleText = 'Grrr...';
      this._bear.bubbleColor = '#b45309';
      this._bear.bubbleBg = '#fef3c7';
      this._bear.bubbleTimer = 1.05;
      this._bear.bubbleJagged = true;
      if (!reduced) {
        this._spawnSnowSpray(this._bear.x + this._bear.dir * 34, FLOOR_Y, -this._bear.dir, 9);
        this._spawnBreathCloud(true);
      }
    }

    this._updateStatusUi();

    if (reduced) {
      this._render();
      this._schedule(() => {
        if (this._state.bearState === 'grumble') {
          this._bear.mode = 'wait';
          this._bear.bubbleText = null;
          this._state = { ...this._state, bearState: 'patrol' };
          this._render();
        }
      }, 950);
    }

    return { ...this._state };
  }

  /**
   * Returns a snapshot of the current arena state.
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Stops animation loop, clears timers, and cleans up DOM nodes.
   */
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
    this._bgCache = null;
  }

  /* ------------------------------------------------------------------------
     Private Setup, Scenic Generators & Offscreen Static Backdrop Cache
     ------------------------------------------------------------------------ */

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
  _aimBearTowardRemaining() {
    const remaining = this._state.remaining;
    if (remaining <= 0) return;
    // Face toward the middle/rightmost remaining penguin so bear watches the ramp eagerly
    const targetPenguin = this._penguins[remaining - 1];
    if (targetPenguin) {
      if (Math.abs(targetPenguin.x - this._bear.x) > 12) {
        this._bear.dir = targetPenguin.x >= this._bear.x ? 1 : -1;
      }
    }
  }

  /** @private */
  _createStars() {
    const stars = [];
    for (let i = 0; i < 64; i += 1) {
      const x = 14 + seededRand(i * 3 + 1) * (CANVAS_W - 28);
      const y = 8 + seededRand(i * 3 + 2) * 84;
      if (Math.hypot(x - 665, y - 44) < 38) continue;
      stars.push({
        x,
        y,
        r: 0.7 + seededRand(i * 5 + 4) * 1.35,
        phase: seededRand(i * 3 + 3) * Math.PI * 2,
        speed: 1.0 + seededRand(i * 7 + 9) * 2.4,
      });
    }
    return stars;
  }

  /** @private */
  _createSnowflakes() {
    const flakes = [];
    for (let i = 0; i < 66; i += 1) {
      const layer = i < 28 ? 0 : i < 50 ? 1 : 2;
      flakes.push({
        x: seededRand(i * 7 + 1) * CANVAS_W,
        y: seededRand(i * 7 + 2) * (RAMP_Y + 24),
        layer,
        r: layer === 0 ? 1.1 : layer === 1 ? 2.0 : 3.2,
        speed: layer === 0 ? 12 + seededRand(i * 7 + 3) * 8 : layer === 1 ? 22 + seededRand(i * 7 + 3) * 12 : 36 + seededRand(i * 7 + 3) * 16,
        drift: layer === 0 ? 6 : layer === 1 ? 13 : 20,
        phase: seededRand(i * 7 + 4) * Math.PI * 2,
        alpha: layer === 0 ? 0.35 : layer === 1 ? 0.55 : 0.75,
      });
    }
    return flakes;
  }

  /** @private */
  _createFrostMotes() {
    const motes = [];
    for (let i = 0; i < 24; i += 1) {
      motes.push({
        x: 60 + seededRand(i * 11 + 2) * (CANVAS_W - 120),
        y: CAVE_TOP + 18 + seededRand(i * 11 + 5) * (FLOOR_Y - CAVE_TOP - 32),
        r: 0.9 + seededRand(i * 11 + 8) * 1.4,
        phase: seededRand(i * 11 + 9) * Math.PI * 2,
        speed: 0.8 + seededRand(i * 11 + 3) * 1.4,
      });
    }
    return motes;
  }

  /** @private */
  _createWaterDrops() {
    const xs = [54, 152, 266, 398, 526, 650, 744];
    return xs.map((x, i) => ({
      x,
      y: CAVE_TOP + 14,
      vy: 0,
      active: false,
      cooldown: 1.2 + seededRand(i * 19 + 4) * 5.2,
    }));
  }

  /** @private */
  _createCrystals() {
    return [
      { x: 34, y: 238, angle: 0.38, scale: 1.05, phase: 0.4 },
      { x: 46, y: 286, angle: 0.52, scale: 0.82, phase: 2.1 },
      { x: 766, y: 232, angle: -0.38, scale: 1.08, phase: 1.3 },
      { x: 754, y: 282, angle: -0.5, scale: 0.85, phase: 3.5 },
      { x: 218, y: 264, angle: 0.14, scale: 0.62, phase: 2.7, bg: true },
      { x: 586, y: 256, angle: -0.18, scale: 0.65, phase: 0.9, bg: true },
    ];
  }

  /** @private */
  _buildDom() {
    this._container.replaceChildren();

    const wrap = document.createElement('div');
    wrap.className = 'penguin-arena-wrap';

    const dpr = typeof window !== 'undefined' ? clamp(window.devicePixelRatio || 1, 1, 2) : 1;
    this._dpr = dpr;

    const canvas = document.createElement('canvas');
    canvas.className = 'penguin-arena-canvas';
    canvas.width = Math.round(CANVAS_W * dpr);
    canvas.height = Math.round(CANVAS_H * dpr);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Isrampe med pingviner og sulten isbjørn i ishulen');
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');

    wrap.appendChild(canvas);

    // Accessible Norwegian status bar
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
  _buildStaticBackdropCache() {
    if (typeof document === 'undefined') return;

    const bg = document.createElement('canvas');
    bg.width = Math.round(CANVAS_W * this._dpr);
    bg.height = Math.round(CANVAS_H * this._dpr);
    const ctx = bg.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    this._renderStaticArcticSky(ctx);
    this._renderStaticGlacierMountains(ctx);
    this._renderStaticIceCave(ctx);
    this._bgCache = bg;
  }

  /** @private */
  _renderStaticArcticSky(ctx) {
    // Rich Arctic twilight-to-midnight gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, RAMP_Y + 8);
    skyGrad.addColorStop(0, '#030917');
    skyGrad.addColorStop(0.38, '#08162d');
    skyGrad.addColorStop(0.75, '#10294d');
    skyGrad.addColorStop(1, '#1b4372');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_W, RAMP_Y + 8);

    // Soft polar horizon haze
    const horizonGlow = ctx.createRadialGradient(400, RAMP_Y + 12, 30, 400, RAMP_Y + 12, 420);
    horizonGlow.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    horizonGlow.addColorStop(0.5, 'rgba(30, 64, 175, 0.10)');
    horizonGlow.addColorStop(1, 'rgba(3, 9, 23, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 20, CANVAS_W, RAMP_Y);

    // Glowing crescent moon at (665, 44)
    const mx = 665;
    const my = 44;

    const haloOuter = ctx.createRadialGradient(mx, my, 8, mx, my, 74);
    haloOuter.addColorStop(0, 'rgba(254, 249, 195, 0.34)');
    haloOuter.addColorStop(0.35, 'rgba(186, 230, 253, 0.16)');
    haloOuter.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = haloOuter;
    ctx.beginPath();
    ctx.arc(mx, my, 74, 0, Math.PI * 2);
    ctx.fill();

    // Moon disc clipped to crescent shape
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI * 2);
    ctx.clip();

    const moonGrad = ctx.createRadialGradient(mx - 6, my - 5, 2, mx, my, 20);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.55, '#fef9c3');
    moonGrad.addColorStop(1, '#fde047');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(mx - 20, my - 20, 40, 40);

    // Subtle lunar craters
    ctx.fillStyle = 'rgba(202, 138, 4, 0.18)';
    ctx.beginPath();
    ctx.arc(mx - 7, my + 4, 3.2, 0, Math.PI * 2);
    ctx.arc(mx - 9, my - 6, 2.2, 0, Math.PI * 2);
    ctx.arc(mx - 2, my + 9, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Carve dark night-side shadow to form crisp crescent
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(mx + 8.5, my - 4.5, 16.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** @private */
  _renderStaticGlacierMountains(ctx) {
    // Far glacier range (cool slate-blue silhouettes)
    const farPeaks = [
      [0, 146], [42, 102], [96, 118], [156, 78], [218, 114], [288, 86],
      [352, 116], [424, 72], [492, 108], [556, 82], [622, 116], [696, 88],
      [756, 108], [800, 92], [800, 148], [0, 148],
    ];
    ctx.beginPath();
    ctx.moveTo(farPeaks[0][0], farPeaks[0][1]);
    for (let i = 1; i < farPeaks.length; i += 1) {
      ctx.lineTo(farPeaks[i][0], farPeaks[i][1]);
    }
    ctx.closePath();
    const farGrad = ctx.createLinearGradient(0, 70, 0, 148);
    farGrad.addColorStop(0, '#1e3a5f');
    farGrad.addColorStop(0.55, '#132a47');
    farGrad.addColorStop(1, '#0b1c33');
    ctx.fillStyle = farGrad;
    ctx.fill();

    // Moonlit snow facets on far peaks (right slopes catch moonlight)
    const farLit = [
      [[156, 78], [182, 104], [154, 112]],
      [[288, 86], [314, 112], [286, 118]],
      [[424, 72], [454, 104], [422, 114]],
      [[556, 82], [584, 110], [554, 116]],
      [[696, 88], [724, 112], [692, 118]],
    ];
    ctx.fillStyle = 'rgba(186, 230, 253, 0.16)';
    for (let i = 0; i < farLit.length; i += 1) {
      const tri = farLit[i];
      ctx.beginPath();
      ctx.moveTo(tri[0][0], tri[0][1]);
      ctx.lineTo(tri[1][0], tri[1][1]);
      ctx.lineTo(tri[2][0], tri[2][1]);
      ctx.closePath();
      ctx.fill();
    }

    // Closer faceted glacial ridges
    const nearPeaks = [
      [0, 148], [64, 108], [128, 128], [202, 96], [272, 130], [344, 102],
      [414, 126], [496, 94], [574, 128], [648, 98], [726, 124], [800, 104],
      [800, 148], [0, 148],
    ];
    ctx.beginPath();
    ctx.moveTo(nearPeaks[0][0], nearPeaks[0][1]);
    for (let i = 1; i < nearPeaks.length; i += 1) {
      ctx.lineTo(nearPeaks[i][0], nearPeaks[i][1]);
    }
    ctx.closePath();
    const nearGrad = ctx.createLinearGradient(0, 92, 0, 148);
    nearGrad.addColorStop(0, '#274c77');
    nearGrad.addColorStop(0.5, '#163254');
    nearGrad.addColorStop(1, '#0d223d');
    ctx.fillStyle = nearGrad;
    ctx.fill();

    // Crisp glacial ridge highlights
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 1; i <= 11; i += 2) {
      ctx.moveTo(nearPeaks[i][0], nearPeaks[i][1]);
      ctx.lineTo(nearPeaks[i + 1][0], nearPeaks[i + 1][1]);
    }
    ctx.stroke();

    // Soft misty valley fog right above the ice ramp
    const mistGrad = ctx.createLinearGradient(0, 118, 0, 148);
    mistGrad.addColorStop(0, 'rgba(186, 230, 253, 0)');
    mistGrad.addColorStop(1, 'rgba(186, 230, 253, 0.18)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 118, CANVAS_W, 30);
  }

  /** @private */
  _renderStaticIceCave(ctx) {
    // Deep cavern interior gradient
    const caveGrad = ctx.createLinearGradient(0, CAVE_TOP, 0, FLOOR_Y + 12);
    caveGrad.addColorStop(0, '#040b18');
    caveGrad.addColorStop(0.35, '#07162b');
    caveGrad.addColorStop(0.75, '#0c2342');
    caveGrad.addColorStop(1, '#13345e');
    ctx.fillStyle = caveGrad;
    ctx.fillRect(0, CAVE_TOP, CANVAS_W, CANVAS_H - CAVE_TOP);

    // Subtle deep-cave faceted ice rock ribs
    const backWalls = [
      { x: 96, y: 174, w: 94, h: 146 },
      { x: 248, y: 184, w: 112, h: 136 },
      { x: 446, y: 180, w: 108, h: 140 },
      { x: 604, y: 172, w: 98, h: 148 },
    ];
    for (let i = 0; i < backWalls.length; i += 1) {
      const b = backWalls[i];
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.h);
      ctx.lineTo(b.x + 14, b.y + 16);
      ctx.lineTo(b.x + b.w * 0.45, b.y);
      ctx.lineTo(b.x + b.w - 10, b.y + 22);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.closePath();
      const wg = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      wg.addColorStop(0, 'rgba(30, 68, 114, 0.34)');
      wg.addColorStop(0.5, 'rgba(15, 42, 76, 0.22)');
      wg.addColorStop(1, 'rgba(7, 20, 38, 0.12)');
      ctx.fillStyle = wg;
      ctx.fill();

      // Subtle glacier vein highlight
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.11)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.45, b.y + 4);
      ctx.lineTo(b.x + b.w * 0.36, b.y + b.h * 0.55);
      ctx.lineTo(b.x + b.w * 0.48, b.y + b.h);
      ctx.stroke();
    }

    // Subtle carved ice plaque "ISHULEN" on upper back wall
    const px = 342;
    const py = 180;
    const pw = 116;
    const ph = 24;
    traceRoundedRect(ctx, px, py, pw, ph, 6);
    ctx.fillStyle = 'rgba(8, 22, 42, 0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.24)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.font = '700 11px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.46)';
    ctx.fillText('ISHULEN', 400, py + ph / 2 + 0.5);

    // Sculpted arched ice-cave pillars framing left and right edges
    this._drawCavePillar(ctx, true);
    this._drawCavePillar(ctx, false);

    // Dramatic dark cavern vignette (makes white bear & penguins pop!)
    const vig = ctx.createRadialGradient(400, 248, 120, 400, 248, 430);
    vig.addColorStop(0, 'rgba(4, 11, 24, 0)');
    vig.addColorStop(0.7, 'rgba(3, 8, 18, 0.24)');
    vig.addColorStop(1, 'rgba(2, 6, 14, 0.56)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, CAVE_TOP, CANVAS_W, FLOOR_Y - CAVE_TOP + 6);

    // Contoured multi-layered snow cave floor (y = 312..360)
    const floorGrad = ctx.createLinearGradient(0, FLOOR_Y - 6, 0, CANVAS_H);
    floorGrad.addColorStop(0, '#f0f9ff');
    floorGrad.addColorStop(0.2, '#bae6fd');
    floorGrad.addColorStop(0.62, '#7dd3fc');
    floorGrad.addColorStop(0.88, '#0284c7');
    floorGrad.addColorStop(1, '#075985');

    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H);
    ctx.lineTo(0, FLOOR_Y - 4);
    for (let x = 0; x <= CANVAS_W; x += 20) {
      const wave = Math.sin(x * 0.015) * 3.2 + Math.cos(x * 0.038) * 1.4;
      ctx.lineTo(x, FLOOR_Y - 2 + wave);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.closePath();
    ctx.fillStyle = floorGrad;
    ctx.fill();

    // Soft bright snow crest highlight along top edge of floor
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_W; x += 16) {
      const wave = Math.sin(x * 0.015) * 3.2 + Math.cos(x * 0.038) * 1.4;
      if (x === 0) ctx.moveTo(x, FLOOR_Y - 2 + wave);
      else ctx.lineTo(x, FLOOR_Y - 2 + wave);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle secondary foreground snowdrift ridge
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H);
    for (let x = 0; x <= CANVAS_W; x += 25) {
      const wave = Math.sin(x * 0.012 + 1.7) * 4.5;
      ctx.lineTo(x, FLOOR_Y + 22 + wave);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14, 116, 144, 0.16)';
    ctx.fill();

    // Small shaded ice stones scattered on the floor
    const pebbles = [
      { x: 108, y: FLOOR_Y + 18, rx: 6, ry: 2.8 },
      { x: 274, y: FLOOR_Y + 24, rx: 5, ry: 2.3 },
      { x: 512, y: FLOOR_Y + 20, rx: 6.5, ry: 3 },
      { x: 678, y: FLOOR_Y + 23, rx: 5.5, ry: 2.5 },
    ];
    for (let i = 0; i < pebbles.length; i += 1) {
      const p = pebbles[i];
      ctx.fillStyle = 'rgba(7, 89, 133, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x + 1, p.y + 1.5, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx * 0.88, p.ry * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** @private */
  _drawCavePillar(ctx, isLeft) {
    ctx.save();
    if (!isLeft) {
      ctx.translate(CANVAS_W, 0);
      ctx.scale(-1, 1);
    }

    // Outer dark glacial arch
    ctx.beginPath();
    ctx.moveTo(0, CAVE_TOP);
    ctx.lineTo(74, CAVE_TOP);
    ctx.bezierCurveTo(46, CAVE_TOP + 36, 36, CAVE_TOP + 108, 58, FLOOR_Y + 6);
    ctx.lineTo(0, FLOOR_Y + 6);
    ctx.closePath();

    const pGrad = ctx.createLinearGradient(0, CAVE_TOP, 72, CAVE_TOP);
    pGrad.addColorStop(0, '#07172b');
    pGrad.addColorStop(0.55, '#12345c');
    pGrad.addColorStop(0.85, '#25639c');
    pGrad.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = pGrad;
    ctx.fill();

    // Inner specular ice rim
    ctx.beginPath();
    ctx.moveTo(72, CAVE_TOP);
    ctx.bezierCurveTo(44, CAVE_TOP + 36, 34, CAVE_TOP + 108, 56, FLOOR_Y + 4);
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hanging stalactite icicles at arch shoulder
    const icicles = [
      { x: 40, len: 36, w: 10 },
      { x: 56, len: 26, w: 8 },
      { x: 72, len: 18, w: 6 },
    ];
    for (let i = 0; i < icicles.length; i += 1) {
      const ic = icicles[i];
      this._draw3DIcicle(ctx, ic.x, CAVE_TOP, ic.w, ic.len);
    }

    ctx.restore();
  }

  /** @private */
  _draw3DIcicle(ctx, x, y, width, length) {
    const hw = width / 2;
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.quadraticCurveTo(x - hw * 0.55, y + length * 0.55, x, y + length);
    ctx.quadraticCurveTo(x + hw * 0.55, y + length * 0.55, x + hw, y);
    ctx.closePath();

    const grad = ctx.createLinearGradient(x - hw, y, x + hw, y);
    grad.addColorStop(0, '#f0f9ff');
    grad.addColorStop(0.35, '#bae6fd');
    grad.addColorStop(0.75, '#38bdf8');
    grad.addColorStop(1, '#0369a1');
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp specular edge
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.45, y + 1);
    ctx.lineTo(x - hw * 0.1, y + length * 0.72);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
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
        `Isrampe med ${remaining} av ${total} pingviner trygge. ${eaten} pingviner er spist av isbjørnen i ishulen.`
      );
    }
  }

  /* ------------------------------------------------------------------------
     Particle & Effect Emitters
     ------------------------------------------------------------------------ */

  /** @private */
  _spawnIceShards(x, y) {
    const colors = ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#bae6fd'];
    for (let i = 0; i < 18; i += 1) {
      const spread = (seededRand(i * 5 + this._elapsed * 13) - 0.5) * 190;
      this._particles.push({
        kind: 'shard',
        x: x + (seededRand(i * 3 + 1) - 0.5) * 34,
        y: y + (seededRand(i * 3 + 2) - 0.5) * 8,
        vx: spread,
        vy: -40 - seededRand(i * 7 + 2) * 90,
        gravity: 460,
        rot: seededRand(i * 9) * Math.PI * 2,
        rotSpeed: (seededRand(i * 11) - 0.5) * 14,
        size: 3 + seededRand(i * 13) * 4.5,
        life: 0.55 + seededRand(i * 5 + 3) * 0.35,
        maxLife: 0.9,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnSweatBurst(x, y) {
    for (let i = 0; i < 5; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      this._particles.push({
        kind: 'droplet',
        x: x + side * (12 + i * 2),
        y: y - 4,
        vx: side * (36 + i * 14),
        vy: -55 - i * 12,
        gravity: 260,
        size: 2.6,
        life: 0.42,
        maxLife: 0.42,
        color: '#bae6fd',
      });
    }
  }

  /** @private */
  _spawnSnowSpray(x, y, dir, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const r = seededRand(i * 17 + this._elapsed * 29);
      this._particles.push({
        kind: 'snowPuff',
        x: x + (r - 0.5) * 18,
        y: y - 2 - r * 6,
        vx: dir * (45 + r * 95) + (seededRand(i * 7) - 0.5) * 30,
        vy: -38 - seededRand(i * 13 + 2) * 68,
        gravity: 195,
        size: 3.5 + seededRand(i * 19) * 5.5,
        life: 0.38 + r * 0.28,
        maxLife: 0.66,
        color: i % 2 === 0 ? '#ffffff' : '#e0f2fe',
      });
    }
  }

  /** @private */
  _spawnLandingSplash(x, y) {
    for (let i = 0; i < 16; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const r = seededRand(i * 11 + this._elapsed * 23);
      this._particles.push({
        kind: 'snowPuff',
        x: x + side * (4 + r * 14),
        y: y - 2,
        vx: side * (35 + r * 95),
        vy: -45 - r * 85,
        gravity: 240,
        size: 3.5 + r * 5,
        life: 0.42 + r * 0.26,
        maxLife: 0.68,
        color: i % 3 === 0 ? '#bae6fd' : '#ffffff',
      });
    }
  }

  /** @private */
  _spawnChompBurst(x, y) {
    // Billowing snow powder
    for (let i = 0; i < 18; i += 1) {
      const angle = seededRand(i * 7 + this._elapsed * 19) * Math.PI * 2;
      const speed = 45 + seededRand(i * 13) * 120;
      this._particles.push({
        kind: 'snowPuff',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7 - 48,
        gravity: 200,
        size: 4 + seededRand(i * 5) * 6,
        life: 0.48 + seededRand(i * 3) * 0.3,
        maxLife: 0.78,
        color: i % 3 === 0 ? '#bae6fd' : '#ffffff',
      });
    }
    // Floating Emperor penguin feathers (dark charcoal, white, golden amber)
    const featherColors = ['#0f172a', '#ffffff', '#f59e0b', '#334155', '#fef3c7'];
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI * 0.15 - seededRand(i * 17 + 3) * Math.PI * 0.7;
      const speed = 55 + seededRand(i * 19) * 90;
      this._particles.push({
        kind: 'feather',
        x: x + (seededRand(i * 3) - 0.5) * 20,
        y: y - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        gravity: 52,
        rot: seededRand(i * 23) * Math.PI * 2,
        rotSpeed: (seededRand(i * 29) - 0.5) * 6,
        swayPhase: seededRand(i * 31) * Math.PI * 2,
        size: 5 + seededRand(i * 7) * 3,
        life: 1.1 + seededRand(i * 11) * 0.55,
        maxLife: 1.65,
        color: featherColors[i % featherColors.length],
      });
    }
  }

  /** @private */
  _spawnCheerSparkles(x, y) {
    const colors = ['#fde047', '#ffffff', '#7dd3fc', '#fbbf24'];
    for (let i = 0; i < 6; i += 1) {
      const r = seededRand(i * 13 + x + this._elapsed * 11);
      this._particles.push({
        kind: 'sparkle',
        x: x + (r - 0.5) * 28,
        y: y + (seededRand(i * 17) - 0.5) * 14,
        vx: (r - 0.5) * 36,
        vy: -32 - seededRand(i * 19) * 44,
        gravity: 20,
        size: 3 + seededRand(i * 7) * 3,
        life: 0.6 + r * 0.35,
        maxLife: 0.95,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnBreathCloud(heavy = false) {
    const bear = this._bear;
    const noseX = bear.x + bear.dir * 66;
    const noseY = FLOOR_Y - 56 + bear.headPitch * 14;
    const count = heavy ? 4 : 2;
    for (let i = 0; i < count; i += 1) {
      this._breathClouds.push({
        x: noseX + bear.dir * (4 + i * 5),
        y: noseY + (i - 0.5) * 3,
        vx: bear.dir * (heavy ? 36 + i * 10 : 16 + i * 6),
        vy: -14 - i * 4,
        r: heavy ? 6 + i * 2.5 : 4.5 + i * 2,
        life: heavy ? 1.15 : 0.95,
        maxLife: heavy ? 1.15 : 0.95,
      });
    }
  }

  /* ------------------------------------------------------------------------
     Animation Loop & Physics Update
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

    // Camera shake decay
    if (this._shakeTimer > 0) {
      this._shakeTimer = Math.max(0, this._shakeTimer - dt);
    }

    // Snowfall update
    for (let i = 0; i < this._snowflakes.length; i += 1) {
      const f = this._snowflakes[i];
      f.y += f.speed * dt;
      f.x += Math.sin(this._elapsed * 1.1 + f.phase) * f.drift * dt;
      if (f.y > RAMP_Y + 26) {
        f.y = -6;
        f.x = seededRand(i * 19 + this._elapsed) * CANVAS_W;
      }
      if (f.x < -8) f.x = CANVAS_W + 8;
      if (f.x > CANVAS_W + 8) f.x = -8;
    }

    // Dripping water drops from icicles
    for (let i = 0; i < this._waterDrops.length; i += 1) {
      const d = this._waterDrops[i];
      if (!d.active) {
        d.cooldown -= dt;
        if (d.cooldown <= 0) {
          d.active = true;
          d.y = CAVE_TOP + 12;
          d.vy = 20;
        }
      } else {
        d.vy += 420 * dt;
        d.y += d.vy * dt;
        if (d.y >= FLOOR_Y) {
          d.active = false;
          d.cooldown = 2.8 + seededRand(i * 31 + this._elapsed * 7) * 5.2;
          // Tiny water splash ring particles
          for (let s = -1; s <= 1; s += 2) {
            this._particles.push({
              kind: 'droplet',
              x: d.x,
              y: FLOOR_Y - 1,
              vx: s * 22,
              vy: -32,
              gravity: 220,
              size: 1.6,
              life: 0.24,
              maxLife: 0.24,
              color: '#bae6fd',
            });
          }
        }
      }
    }

    // Trapdoor spring physics (0° -> 92° with smooth bounce)
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      if (door.crackGlow > 0) {
        door.crackGlow = Math.max(0, door.crackGlow - dt * 2.2);
      }
      if (door.targetAngle > 0 && (Math.abs(door.angle - door.targetAngle) > 0.2 || Math.abs(door.vel) > 1)) {
        const springK = 140;
        const damping = 12;
        const accel = (door.targetAngle - door.angle) * springK - door.vel * damping;
        door.vel += accel * dt;
        door.angle += door.vel * dt;
        if (door.angle < 0) {
          door.angle = 0;
          door.vel = 0;
        }
      }
    }

    // Penguins update
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      p.breathPhase += dt * 2.4;
      p.swayPhase += dt * 1.45;

      // Natural blinking
      if (p.blinkTimer > 0) {
        p.blinkTimer = Math.max(0, p.blinkTimer - dt);
      } else {
        p.blinkCooldown -= dt;
        if (p.blinkCooldown <= 0) {
          p.blinkTimer = 0.13;
          p.blinkCooldown = 2.0 + seededRand(i * 41 + this._elapsed * 3) * 4.2;
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
          p.vy = 20;
          p.rotSpeed = (p.index % 2 === 0 ? 1 : -1) * 5.8;
        }
      } else if (p.status === 'falling') {
        p.timer += dt;
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;

        // Occasional falling feather trail
        if (Math.random() < dt * 7) {
          this._particles.push({
            kind: 'feather',
            x: p.x + (Math.random() - 0.5) * 14,
            y: p.y - 16,
            vx: (Math.random() - 0.5) * 35,
            vy: -20,
            gravity: 40,
            rot: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 5,
            swayPhase: Math.random() * Math.PI * 2,
            size: 4.2,
            life: 0.75,
            maxLife: 0.75,
            color: Math.random() < 0.5 ? '#ffffff' : '#1e293b',
          });
        }

        // Hit the snow floor!
        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = 0;
          p.rotation = 0;
          p.status = 'landed';
          p.landedTimer = 0;
          p.squashY = 0.72;
          this._spawnLandingSplash(p.x, FLOOR_Y);
        }
      } else if (p.status === 'landed') {
        p.landedTimer += dt;
        p.squashY = lerp(p.squashY, 1.0, Math.min(1, dt * 10));
      }
    }

    // Polar bear AI & kinematic animation update
    this._updatePolarBear(dt);

    // Particles update
    for (let i = this._particles.length - 1; i >= 0; i -= 1) {
      const pt = this._particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this._particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.gravity * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.kind === 'feather') {
        pt.x += Math.sin(this._elapsed * 5 + pt.swayPhase) * 24 * dt;
        pt.vx *= 0.96;
        pt.rot += pt.rotSpeed * dt;
      } else if (pt.kind === 'shard') {
        pt.rot += pt.rotSpeed * dt;
      }
    }

    // Breath clouds update
    for (let i = this._breathClouds.length - 1; i >= 0; i -= 1) {
      const bc = this._breathClouds[i];
      bc.life -= dt;
      if (bc.life <= 0) {
        this._breathClouds.splice(i, 1);
        continue;
      }
      bc.x += bc.vx * dt;
      bc.y += bc.vy * dt;
      bc.vx *= 0.96;
      bc.r += dt * 7.5;
    }

    // Pawprints fade update
    for (let i = this._pawprints.length - 1; i >= 0; i -= 1) {
      const pp = this._pawprints[i];
      pp.life -= dt;
      if (pp.life <= 0) {
        this._pawprints.splice(i, 1);
      }
    }
  }

  /**
   * Finds the next penguin waiting on the snow floor (`landed`) or currently falling/panicking.
   * @private
   */
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

    // Timers
    if (bear.hitFlashTimer > 0) {
      bear.hitFlashTimer = Math.max(0, bear.hitFlashTimer - dt);
    }
    if (bear.bubbleTimer > 0) {
      bear.bubbleTimer -= dt;
      if (bear.bubbleTimer <= 0) {
        bear.bubbleText = null;
      }
    }
    if (bear.pawStamp > 0) {
      bear.pawStamp = Math.max(0, bear.pawStamp - dt * 2.6);
    }

    // Natural blinking
    if (bear.blinkTimer > 0) {
      bear.blinkTimer = Math.max(0, bear.blinkTimer - dt);
    } else {
      bear.blinkCooldown -= dt;
      if (bear.blinkCooldown <= 0) {
        bear.blinkTimer = 0.14;
        bear.blinkCooldown = 2.4 + seededRand(this._elapsed * 11 + 5) * 3.6;
      }
    }

    // Cold cave misty breath puffs while standing/watching
    if (bear.mode === 'wait' || bear.mode === 'watch') {
      bear.breathTimer -= dt;
      if (bear.breathTimer <= 0) {
        this._spawnBreathCloud(false);
        bear.breathTimer = bear.mode === 'watch' ? 1.1 : 2.3;
      }
    }

    const { landed, airborne } = this._findActiveDropTarget();

    // State machine: STAND STILL & WAIT -> WATCH FALL -> SPRINT AFTER LANDING -> CHOMP -> STAND STILL & WAIT
    if (bear.mode === 'wait') {
      bear.yOffset = lerp(bear.yOffset, 0, Math.min(1, dt * 8));
      bear.jawOpen = lerp(bear.jawOpen, 0, Math.min(1, dt * 10));
      bear.tongueOut = lerp(bear.tongueOut, 0, Math.min(1, dt * 10));
      bear.headPitch = lerp(bear.headPitch, -0.24 + Math.sin(this._elapsed * 1.3) * 0.04, Math.min(1, dt * 5));
      this._aimBearTowardRemaining();

      if (landed) {
        if (landed.landedTimer >= 0.14) {
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
      // Stand still and look up eagerly while the penguin falls!
      const focus = landed || airborne;
      if (!focus) {
        bear.mode = 'wait';
      } else {
        bear.targetIndex = focus.index;
        bear.targetX = focus.x;
        if (Math.abs(focus.x - bear.x) > 10) {
          bear.dir = focus.x >= bear.x ? 1 : -1;
        }
        // Track vertical position of falling penguin smoothly
        const dy = focus.y - (FLOOR_Y - 52);
        const dx = Math.max(40, Math.abs(focus.x - bear.x));
        const desiredPitch = clamp(Math.atan2(dy, dx) * 0.6, -0.45, 0.12);
        bear.headPitch = lerp(bear.headPitch, desiredPitch, Math.min(1, dt * 10));
        bear.jawOpen = lerp(bear.jawOpen, 0.24, Math.min(1, dt * 6));
        bear.yOffset = lerp(bear.yOffset, 2.5, Math.min(1, dt * 8)); // slight crouch anticipation

        // ONLY start sprinting AFTER the penguin has hit the ground (with 140ms landing splash beat)!
        if (landed && landed.landedTimer >= 0.14) {
          this._beginBearSprint(landed);
        }
      }
    } else if (bear.mode === 'sprint') {
      const target = (bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null) || landed;
      if (!target || target.status === 'eaten') {
        bear.mode = 'wait';
        return;
      }

      const stopDist = 56;
      const dx = target.x - bear.x;
      const dist = Math.abs(dx);
      bear.dir = dx >= 0 ? 1 : -1;

      const sprintSpeed = 420; // powerful bounding gallop across 800px cave
      bear.stridePhase += dt * 13.5;
      bear.headPitch = lerp(bear.headPitch, 0.12, Math.min(1, dt * 10));
      bear.jawOpen = lerp(bear.jawOpen, 0.52, Math.min(1, dt * 8));
      bear.yOffset = -Math.abs(Math.sin(bear.stridePhase)) * 6.5;

      // Snow spray & pawprints during gallop
      bear.dustTimer -= dt;
      if (bear.dustTimer <= 0) {
        this._spawnSnowSpray(bear.x - bear.dir * 32, FLOOR_Y, -bear.dir, 5);
        bear.dustTimer = 0.085;
      }
      bear.pawprintCooldown -= dt;
      if (bear.pawprintCooldown <= 0) {
        this._pawprints.push({
          x: bear.x - bear.dir * 20,
          y: FLOOR_Y + 4 + (Math.random() - 0.5) * 4,
          life: 4.5,
          maxLife: 4.5,
        });
        bear.pawprintCooldown = 0.13;
      }

      if (dist <= stopDist) {
        // Reached the fallen penguin -> lunge & chomp!
        bear.mode = 'chompOpen';
        bear.modeTimer = 0.16;
        bear.targetIndex = target.index;
      } else {
        const step = Math.min(dist - stopDist + 2, sprintSpeed * dt);
        bear.x = clamp(bear.x + bear.dir * step, 86, CANVAS_W - 86);
      }
    } else if (bear.mode === 'chompOpen') {
      bear.modeTimer -= dt;
      bear.headPitch = lerp(bear.headPitch, 0.24, Math.min(1, dt * 16));
      bear.jawOpen = lerp(bear.jawOpen, 1.0, Math.min(1, dt * 22));
      bear.yOffset = lerp(bear.yOffset, -5, Math.min(1, dt * 14));

      if (bear.modeTimer <= 0) {
        // SNAP! Penguin is eaten!
        const target = bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null;
        const burstX = target ? target.x : bear.x + bear.dir * 54;
        if (target && target.status !== 'eaten') {
          target.status = 'eaten';
        }
        bear.mode = 'chompSnap';
        bear.modeTimer = 0.18;
        bear.hitFlashTimer = 0.12;
        bear.bubbleText = 'NOM!';
        bear.bubbleColor = '#be123c';
        bear.bubbleBg = '#fff1f2';
        bear.bubbleTimer = 1.15;
        bear.bubbleJagged = false;
        this._shakeTimer = 0.26;
        this._shakeIntensity = 6.5;
        this._spawnChompBurst(burstX, FLOOR_Y - 16);
      }
    } else if (bear.mode === 'chompSnap') {
      bear.modeTimer -= dt;
      bear.jawOpen = lerp(bear.jawOpen, 0.02, Math.min(1, dt * 28));
      bear.yOffset = lerp(bear.yOffset, 3, Math.min(1, dt * 18));
      if (bear.modeTimer <= 0) {
        bear.mode = 'chompChew';
        bear.modeTimer = 0.56;
      }
    } else if (bear.mode === 'chompChew') {
      bear.modeTimer -= dt;
      bear.headPitch = lerp(bear.headPitch, 0.04, Math.min(1, dt * 8));
      bear.jawOpen = 0.06 + Math.abs(Math.sin(this._elapsed * 18)) * 0.26;
      bear.yOffset = lerp(bear.yOffset, 0, Math.min(1, dt * 10));
      if (bear.modeTimer <= 0) {
        bear.mode = 'chompLick';
        bear.modeTimer = 0.42;
      }
    } else if (bear.mode === 'chompLick') {
      bear.modeTimer -= dt;
      bear.jawOpen = lerp(bear.jawOpen, 0.22, Math.min(1, dt * 12));
      bear.tongueOut = Math.sin((1 - bear.modeTimer / 0.42) * Math.PI);
      if (bear.modeTimer <= 0) {
        bear.tongueOut = 0;
        bear.jawOpen = 0;
        bear.targetIndex = null;
        bear.targetX = null;

        // Check if another penguin already landed or is falling; otherwise stand still & wait!
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
      bear.headPitch = lerp(bear.headPitch, 0.2, Math.min(1, dt * 10));
      bear.jawOpen = lerp(bear.jawOpen, 0.14 + Math.abs(Math.sin(this._elapsed * 14)) * 0.1, Math.min(1, dt * 10));
      bear.yOffset = Math.sin(this._elapsed * 22) * 1.2;
      if (bear.modeTimer <= 0) {
        bear.mode = 'wait';
        bear.jawOpen = 0;
        this._state = { ...this._state, bearState: 'patrol' };
      }
    }
  }

  /** @private */
  _beginBearSprint(targetPenguin) {
    const bear = this._bear;
    bear.mode = 'sprint';
    bear.targetIndex = targetPenguin.index;
    bear.targetX = targetPenguin.x;
    bear.dir = targetPenguin.x >= bear.x ? 1 : -1;
    bear.bubbleText = null;
    bear.dustTimer = 0;
    bear.pawprintCooldown = 0;
    this._spawnSnowSpray(bear.x - bear.dir * 26, FLOOR_Y, -bear.dir, 8);
  }

  /* ------------------------------------------------------------------------
     Main HD Render Pipeline (800 × 360 Logical Space, DPR Scaled)
     ------------------------------------------------------------------------ */

  /** @private */
  _render() {
    const ctx = this._ctx;
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    // Camera impact shake on chomp
    if (this._shakeTimer > 0) {
      const mag = (this._shakeTimer / 0.26) * this._shakeIntensity;
      const sx = (Math.random() - 0.5) * 2 * mag;
      const sy = (Math.random() - 0.5) * 2 * mag;
      ctx.translate(sx, sy);
    }

    // 1. Cached static Arctic sky, crescent moon, glaciers, ice cave & snow floor
    if (this._bgCache) {
      ctx.drawImage(this._bgCache, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = '#040b18';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // 2. Animated twinkling stars & translucent Aurora Borealis ribbons
    this._drawStars(ctx);
    this._drawAurora(ctx);

    // 3. Far & mid snowfall (behind ramp/penguins)
    this._drawSnowfall(ctx, 0, 1);

    // 4. Glowing turquoise cave crystals & twinkling frost motes
    this._drawGlowingCrystals(ctx);
    this._drawFrostMotes(ctx);

    // 5. Fading snowy pawprints & dripping icicle droplets
    this._drawPawprints(ctx);
    this._drawWaterDrops(ctx);

    // 6. Crystalline ice ramp, snow blanket, hanging icicles, trapdoors & warm lanterns
    this._drawIceRampAndTrapdoors(ctx);
    this._drawLanternPosts(ctx);

    // 7. Anatomically realistic Emperor penguins (standing, cheering, panicking, falling, landed)
    this._drawPenguins(ctx);

    // 8. Anatomically realistic articulated Polar Bear + misty breath clouds
    this._drawPolarBear(ctx);
    this._drawBreathClouds(ctx);

    // 9. Particles (ice shards, snow puffs, feathers, sparkles)
    this._drawParticles(ctx);

    // 10. Foreground bokeh snowfall & warm lantern radial light halos
    this._drawSnowfall(ctx, 2, 2);
    this._drawLanternGlows(ctx);

    // 11. Styled comic callout badge ("NOM!" / "Grrr...")
    this._drawCalloutBadge(ctx);

    ctx.restore();
  }

  /** @private */
  _drawStars(ctx) {
    for (let i = 0; i < this._stars.length; i += 1) {
      const s = this._stars[i];
      const twinkle = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(this._elapsed * s.speed + s.phase));
      ctx.fillStyle = `rgba(224, 242, 254, ${twinkle.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** @private */
  _drawAurora(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const ribbons = [
      { yBase: 38, amp: 14, freq: 0.0085, speed: 0.48, height: 56, c0: 'rgba(52, 211, 153, 0.22)', c1: 'rgba(56, 189, 248, 0.14)' },
      { yBase: 54, amp: 11, freq: 0.011, speed: -0.36, height: 48, c0: 'rgba(45, 212, 191, 0.18)', c1: 'rgba(167, 139, 250, 0.13)' },
    ];

    for (let r = 0; r < ribbons.length; r += 1) {
      const rb = ribbons[r];
      const grad = ctx.createLinearGradient(0, rb.yBase - 14, 0, rb.yBase + rb.height);
      grad.addColorStop(0, 'rgba(52, 211, 153, 0)');
      grad.addColorStop(0.35, rb.c0);
      grad.addColorStop(0.75, rb.c1);
      grad.addColorStop(1, 'rgba(167, 139, 250, 0)');

      ctx.beginPath();
      ctx.moveTo(40, rb.yBase + rb.height);
      for (let x = 40; x <= 740; x += 24) {
        const y = rb.yBase + Math.sin(x * rb.freq + this._elapsed * rb.speed) * rb.amp
          + Math.cos(x * rb.freq * 1.7 - this._elapsed * 0.3) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(740, rb.yBase + rb.height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  /** @private */
  _drawSnowfall(ctx, minLayer, maxLayer) {
    for (let i = 0; i < this._snowflakes.length; i += 1) {
      const f = this._snowflakes[i];
      if (f.layer < minLayer || f.layer > maxLayer) continue;

      if (f.layer === 2) {
        // Soft bokeh glow for near snowflakes
        const grad = ctx.createRadialGradient(f.x, f.y, 0.2, f.x, f.y, f.r * 1.5);
        grad.addColorStop(0, `rgba(255, 255, 255, ${f.alpha})`);
        grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(240, 249, 255, ${f.alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** @private */
  _drawGlowingCrystals(ctx) {
    for (let i = 0; i < this._crystals.length; i += 1) {
      const cr = this._crystals[i];
      const pulse = 0.65 + 0.35 * Math.sin(this._elapsed * 1.9 + cr.phase);

      ctx.save();
      ctx.translate(cr.x, cr.y);
      ctx.rotate(cr.angle);
      ctx.scale(cr.scale, cr.scale);

      // Soft turquoise bioluminescent glow
      const glow = ctx.createRadialGradient(0, -10, 2, 0, -10, cr.bg ? 24 : 34);
      glow.addColorStop(0, `rgba(34, 211, 238, ${(cr.bg ? 0.22 : 0.34) * pulse})`);
      glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -10, cr.bg ? 24 : 34, 0, Math.PI * 2);
      ctx.fill();

      // Main faceted crystal spire
      const drawSpire = (ox, oy, w, h, rot) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.lineTo(-w * 0.65, -h * 0.72);
        ctx.lineTo(0, -h);
        ctx.lineTo(w * 0.65, -h * 0.72);
        ctx.lineTo(w, 0);
        ctx.closePath();
        const cg = ctx.createLinearGradient(-w, 0, w, -h);
        cg.addColorStop(0, '#0e7490');
        cg.addColorStop(0.5, '#22d3ee');
        cg.addColorStop(1, '#cffafe');
        ctx.fillStyle = cg;
        ctx.fill();

        // Highlight facet
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(-w * 0.65, -h * 0.72);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.35 * pulse).toFixed(2)})`;
        ctx.fill();
        ctx.restore();
      };

      drawSpire(0, 0, 6, 26, 0);
      drawSpire(6, 2, 4.2, 16, 0.36);
      drawSpire(-6, 3, 3.8, 13, -0.34);

      ctx.restore();
    }
  }

  /** @private */
  _drawFrostMotes(ctx) {
    for (let i = 0; i < this._frostMotes.length; i += 1) {
      const m = this._frostMotes[i];
      const alpha = 0.14 + 0.28 * (0.5 + 0.5 * Math.sin(this._elapsed * m.speed + m.phase));
      const mx = m.x + Math.sin(this._elapsed * 0.6 + m.phase) * 6;
      const my = m.y + Math.cos(this._elapsed * 0.5 + m.phase) * 4;
      ctx.fillStyle = `rgba(186, 230, 253, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** @private */
  _drawPawprints(ctx) {
    for (let i = 0; i < this._pawprints.length; i += 1) {
      const p = this._pawprints[i];
      const alpha = clamp((p.life / p.maxLife) * 0.36, 0, 0.36);
      ctx.fillStyle = `rgba(14, 116, 144, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 7.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Toe pads
      for (let t = -1; t <= 1; t += 1) {
        ctx.beginPath();
        ctx.arc(p.x + t * 4.5, p.y - 3.2, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** @private */
  _drawWaterDrops(ctx) {
    for (let i = 0; i < this._waterDrops.length; i += 1) {
      const d = this._waterDrops[i];
      if (!d.active) continue;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - 4);
      ctx.quadraticCurveTo(d.x + 2.4, d.y + 1, d.x, d.y + 3);
      ctx.quadraticCurveTo(d.x - 2.4, d.y + 1, d.x, d.y - 4);
      ctx.closePath();
      ctx.fillStyle = '#7dd3fc';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(d.x - 0.6, d.y + 0.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** @private */
  _drawIceRampAndTrapdoors(ctx) {
    const drawIceBridgeSegment = (x, width) => {
      if (width <= 0.5) return;

      // Translucent multi-layered glacial ice block
      const iceGrad = ctx.createLinearGradient(0, RAMP_Y, 0, RAMP_Y + RAMP_H);
      iceGrad.addColorStop(0, '#e0f2fe');
      iceGrad.addColorStop(0.28, '#7dd3fc');
      iceGrad.addColorStop(0.7, '#38bdf8');
      iceGrad.addColorStop(1, '#0369a1');
      ctx.fillStyle = iceGrad;
      ctx.fillRect(x, RAMP_Y, width, RAMP_H);

      // Internal diagonal crystal fracture lines
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, RAMP_Y, width, RAMP_H);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.2;
      for (let fx = x + 10; fx < x + width; fx += 24) {
        ctx.beginPath();
        ctx.moveTo(fx, RAMP_Y + 2);
        ctx.lineTo(fx - 7, RAMP_Y + RAMP_H - 2);
        ctx.stroke();
      }
      ctx.restore();

      // Thick sculpted snow blanket along top edge
      const snowGrad = ctx.createLinearGradient(0, RAMP_Y - 4, 0, RAMP_Y + 6);
      snowGrad.addColorStop(0, '#ffffff');
      snowGrad.addColorStop(0.65, '#f0f9ff');
      snowGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = snowGrad;
      traceRoundedRect(ctx, x - 0.5, RAMP_Y - 3, width + 1, 7.5, 3);
      ctx.fill();

      // Bottom dark glacial rim shadow
      ctx.fillStyle = 'rgba(7, 25, 48, 0.55)';
      ctx.fillRect(x, RAMP_Y + RAMP_H - 2, width, 2);
    };

    // Draw solid glacial bridge segments & hanging 3D icicles between trapdoors
    let cursor = 0;
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      const leftEdge = door.x - door.width / 2;
      drawIceBridgeSegment(cursor, leftEdge - cursor);

      if (leftEdge - cursor >= 14) {
        const icicleX = cursor + (leftEdge - cursor) / 2;
        const len = 14 + (i % 3) * 7;
        this._draw3DIcicle(ctx, icicleX, CAVE_TOP, 6.5, len);
      }

      cursor = leftEdge + door.width;
    }
    drawIceBridgeSegment(cursor, CANVAS_W - cursor);

    // Draw ice-and-timber hinged trapdoors under each penguin
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      const hingeX = door.x - door.width / 2;
      const hingeY = RAMP_Y + 4;

      ctx.save();
      ctx.translate(hingeX, hingeY);
      ctx.rotate((door.angle * Math.PI) / 180);

      // Timber & iron trapdoor panel
      const woodGrad = ctx.createLinearGradient(0, -3, 0, 14);
      woodGrad.addColorStop(0, '#b45309');
      woodGrad.addColorStop(0.45, '#92400e');
      woodGrad.addColorStop(1, '#5c2808');
      traceRoundedRect(ctx, 0, -2, door.width, 15, 2.5);
      ctx.fillStyle = woodGrad;
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Frost crust on top when closed
      if (door.angle < 12) {
        ctx.fillStyle = 'rgba(240, 249, 255, 0.88)';
        traceRoundedRect(ctx, 1, -4, door.width - 2, 4.5, 2);
        ctx.fill();
      }

      // Iron reinforcement bar across middle
      ctx.fillStyle = '#334155';
      ctx.fillRect(1, 4, door.width - 2, 4);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(1, 4, door.width - 2, 1.4);

      // Metallic brass rivets
      const rivets = [5, door.width / 2, door.width - 5];
      for (let r = 0; r < rivets.length; r += 1) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(rivets[r], 6, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(rivets[r] - 0.5, 5.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing cyan frost fracture flash when cracking open
      if (door.crackGlow > 0.02) {
        ctx.strokeStyle = `rgba(125, 211, 252, ${door.crackGlow.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(door.width * 0.2, -2);
        ctx.lineTo(door.width * 0.45, 5);
        ctx.lineTo(door.width * 0.75, 11);
        ctx.stroke();
      }

      ctx.restore();

      // Brass hinge pin at pivot
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(hingeX + 1, hingeY + 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(hingeX + 0.3, hingeY + 0.3, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** @private */
  _drawLanternPosts(ctx) {
    const posts = [
      { x: 24, dir: 1 },
      { x: 776, dir: -1 },
    ];
    const flicker = Math.sin(this._elapsed * 12) * 0.5 + Math.cos(this._elapsed * 19) * 0.5;

    for (let i = 0; i < posts.length; i += 1) {
      const { x, dir } = posts[i];
      const baseY = RAMP_Y - 1;

      // Weathered timber post
      const postGrad = ctx.createLinearGradient(x - 4, baseY - 50, x + 4, baseY - 50);
      postGrad.addColorStop(0, '#451a03');
      postGrad.addColorStop(0.4, '#92400e');
      postGrad.addColorStop(1, '#5c2808');
      traceRoundedRect(ctx, x - 4, baseY - 50, 8, 52, 2);
      ctx.fillStyle = postGrad;
      ctx.fill();

      // Snow cap on post top
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(x, baseY - 50, 6.5, 3, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // Curved wrought-iron bracket arm
      const armEndX = x + dir * 18;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x + dir * 3, baseY - 43);
      ctx.quadraticCurveTo(x + dir * 13, baseY - 48, armEndX, baseY - 40);
      ctx.stroke();

      // Iron lantern housing
      const lx = armEndX;
      const ly = baseY - 38;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(lx - 7, ly + 3);
      ctx.lineTo(lx, ly - 3);
      ctx.lineTo(lx + 7, ly + 3);
      ctx.closePath();
      ctx.fill();

      // Glass chamber with warm golden flame
      const flameGrad = ctx.createRadialGradient(lx, ly + 9, 1, lx, ly + 9, 8);
      flameGrad.addColorStop(0, '#fef9c3');
      flameGrad.addColorStop(0.5, '#f59e0b');
      flameGrad.addColorStop(1, '#ea580c');
      traceRoundedRect(ctx, lx - 5, ly + 3, 10, 12, 2);
      ctx.fillStyle = flameGrad;
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Inner bright flickering flame tongue
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(lx, ly + 9.5, 1.8, 3.2 + flicker * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lantern base cap
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(lx - 6, ly + 15, 12, 2.5);
    }
  }

  /** @private */
  _drawLanternGlows(ctx) {
    const flicker = Math.sin(this._elapsed * 11) * 4 + Math.cos(this._elapsed * 17) * 2;
    const sources = [
      { x: 42, y: RAMP_Y - 29 },
      { x: 758, y: RAMP_Y - 29 },
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < sources.length; i += 1) {
      const s = sources[i];
      const rad = 76 + flicker;
      const glow = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, rad);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.36)');
      glow.addColorStop(0.35, 'rgba(245, 158, 11, 0.16)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------------
     Anatomically Realistic Emperor Penguins (HD Painted + Articulated)
     ------------------------------------------------------------------------ */

  /** @private */
  _drawPenguins(ctx) {
    const bear = this._bear;

    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      let drawX = p.x;
      let drawY = p.y;
      let rot = p.rotation;
      let scaleY = p.squashY;
      let flipperL = 0.18;
      let flipperR = -0.18;
      let beakOpen = 0;
      let eyeMode = 'normal'; // 'normal' | 'blink' | 'happy' | 'wide' | 'nervous'
      let headAngle = p.headTilt;

      if (p.status === 'idle') {
        const sway = Math.sin(p.swayPhase) * 0.045;
        rot = sway;
        scaleY = 1 + Math.sin(p.breathPhase) * 0.018;
        flipperL = 0.16 + Math.sin(p.swayPhase) * 0.08;
        flipperR = -0.16 + Math.sin(p.swayPhase) * 0.08;

        // Subtle nervous glance down if bear is near or watching below
        const bearNear = Math.abs(bear.x - p.x) < 110;
        if (bearNear && bear.mode !== 'grumble') {
          eyeMode = 'nervous';
          headAngle = 0.12;
        } else if (p.blinkTimer > 0) {
          eyeMode = 'blink';
        }
      } else if (p.status === 'cheer') {
        if (p.cheerDelay <= 0) {
          const prog = 1 - clamp(p.timer / 0.72, 0, 1);
          const hop = Math.sin(prog * Math.PI) * 24;
          drawY -= hop;
          const flap = Math.sin(this._elapsed * 26 + i) * 0.85;
          flipperL = -0.75 + flap * 0.45;
          flipperR = 0.75 - flap * 0.45;
          eyeMode = 'happy';
          headAngle = -0.1;
        }
      } else if (p.status === 'panic') {
        drawX += Math.sin(this._elapsed * 70) * 2.5;
        const flap = Math.sin(this._elapsed * 44) * 0.95;
        flipperL = -0.9 + flap * 0.5;
        flipperR = 0.9 - flap * 0.5;
        beakOpen = 0.75;
        eyeMode = 'wide';
        headAngle = -0.15;
      } else if (p.status === 'falling') {
        const flap = Math.sin(this._elapsed * 42) * 0.9;
        flipperL = -0.8 + flap * 0.4;
        flipperR = 0.8 - flap * 0.4;
        beakOpen = 0.85;
        eyeMode = 'wide';
      } else if (p.status === 'landed') {
        // Sits/flails startled on the snow floor while bear sprints over!
        drawX += Math.sin(this._elapsed * 32) * 1.4;
        const flap = Math.sin(this._elapsed * 34) * 0.85;
        flipperL = -0.65 + flap * 0.5;
        flipperR = 0.65 - flap * 0.5;
        beakOpen = 0.6;
        eyeMode = 'wide';
        rot = Math.sin(this._elapsed * 20) * 0.12;
      }

      // Soft contact shadow on snow (ramp or cave floor)
      if (p.status === 'idle' || p.status === 'cheer' || p.status === 'landed') {
        const shadowY = p.status === 'landed' ? FLOOR_Y + 1 : RAMP_Y + 0.5;
        const heightAbove = Math.max(0, shadowY - drawY);
        const shadowScale = clamp(1 - heightAbove / 45, 0.45, 1);
        ctx.fillStyle = `rgba(7, 25, 48, ${(0.32 * shadowScale).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(drawX, shadowY, 13 * shadowScale, 3.2 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw articulated Emperor Penguin
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(rot);
      ctx.scale(1, scaleY);
      this._drawEmperorPenguinAnatomy(ctx, {
        flipperL,
        flipperR,
        beakOpen,
        eyeMode,
        headAngle,
        facingDir: p.status === 'landed' ? (bear.x >= p.x ? 1 : -1) : p.facingDir,
      });
      ctx.restore();

      // Startled "!" indicator above panicking penguin
      if (p.status === 'panic') {
        const bounce = Math.abs(Math.sin(this._elapsed * 24)) * 5;
        const bx = drawX;
        const by = drawY - 56 - bounce;
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.font = '800 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', bx, by + 0.5);
        ctx.restore();
      }
    }
  }

  /**
   * Draws a single anatomically detailed Emperor Penguin (*Aptenodytes forsteri*)
   * anchored at feet center (0, 0), height ~46px, width ~30px.
   * @private
   */
  _drawEmperorPenguinAnatomy(ctx, pose) {
    const { flipperL, flipperR, beakOpen, eyeMode, headAngle, facingDir } = pose;

    // 1. Shaded webbed feet
    const drawFoot = (fx, dir) => {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(fx, -1.5, 6.2, 2.4, dir * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(fx - dir * 0.8, -2.1, 4.2, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawFoot(-5.8, -1);
    drawFoot(5.8, 1);

    // 2. Articulated flippers (drawn slightly behind torso seam)
    const drawFlipper = (side, angle) => {
      ctx.save();
      ctx.translate(side * 10.5, -28);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(side * 6, 4, side * 7.5, 14, side * 3.5, 22);
      ctx.bezierCurveTo(side * 0.5, 19, -side * 1.5, 10, 0, 0);
      ctx.closePath();
      const fg = ctx.createLinearGradient(0, 0, side * 6, 20);
      fg.addColorStop(0, '#0f172a');
      fg.addColorStop(0.65, '#1e293b');
      fg.addColorStop(1, '#334155');
      ctx.fillStyle = fg;
      ctx.fill();
      // Subtle icy-blue rim highlight on outer flipper edge
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    };
    drawFlipper(-1, flipperL);
    drawFlipper(1, flipperR);

    // 3. Smooth teardrop Emperor torso (glossy charcoal-navy back)
    ctx.beginPath();
    ctx.moveTo(0, -37);
    ctx.bezierCurveTo(11, -35, 15, -18, 12.5, -6);
    ctx.bezierCurveTo(10, -1, -10, -1, -12.5, -6);
    ctx.bezierCurveTo(-15, -18, -11, -35, 0, -37);
    ctx.closePath();

    const backGrad = ctx.createLinearGradient(-13, -36, 13, -4);
    backGrad.addColorStop(0, '#0a1222');
    backGrad.addColorStop(0.5, '#17253d');
    backGrad.addColorStop(0.88, '#263a59');
    backGrad.addColorStop(1, '#475569');
    ctx.fillStyle = backGrad;
    ctx.fill();

    // 4. Creamy white belly with authentic Emperor golden-amber upper chest fade
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(8, -32, 10.5, -18, 9, -6.5);
    ctx.bezierCurveTo(6.5, -2.5, -6.5, -2.5, -9, -6.5);
    ctx.bezierCurveTo(-10.5, -18, -8, -32, 0, -34);
    ctx.closePath();

    const bellyGrad = ctx.createLinearGradient(0, -34, 0, -3);
    bellyGrad.addColorStop(0, '#f59e0b'); // warm Emperor golden-amber throat
    bellyGrad.addColorStop(0.18, '#fde68a'); // soft butter-gold upper chest
    bellyGrad.addColorStop(0.36, '#fffbeb'); // warm cream transition
    bellyGrad.addColorStop(0.75, '#ffffff'); // pure snow-white belly
    bellyGrad.addColorStop(1, '#cbd5e1'); // cool ambient underbelly shade
    ctx.fillStyle = bellyGrad;
    ctx.fill();

    // 5. Velvety black Emperor head with golden-orange auricular ear patches
    ctx.save();
    ctx.translate(0, -35);
    ctx.rotate(headAngle);

    // Head silhouette
    ctx.beginPath();
    ctx.ellipse(0, -4.5, 8.6, 8.2, 0, 0, Math.PI * 2);
    const headGrad = ctx.createRadialGradient(-2.5, -8, 1, 0, -4, 10);
    headGrad.addColorStop(0, '#27364f');
    headGrad.addColorStop(0.45, '#0f172a');
    headGrad.addColorStop(1, '#060a14');
    ctx.fillStyle = headGrad;
    ctx.fill();

    // Authentic Emperor golden-amber to orange ear-patch gradients (both sides)
    const drawEarPatch = (side) => {
      const eg = ctx.createRadialGradient(side * 5.8, -3, 0.5, side * 5.5, -2.5, 5.5);
      eg.addColorStop(0, '#f97316');
      eg.addColorStop(0.55, '#fbbf24');
      eg.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(side * 5.6, -2.4, 3.6, 4.8, side * 0.2, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEarPatch(-1);
    drawEarPatch(1);

    // Expressive eyes
    const drawEye = (ex) => {
      if (eyeMode === 'blink') {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(ex - 2, -5.8);
        ctx.lineTo(ex + 2, -5.8);
        ctx.stroke();
      } else if (eyeMode === 'happy') {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ex, -5.2, 2.2, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        const r = eyeMode === 'wide' ? 2.5 : 1.9;
        // Sclera ring on wide/nervous eyes
        if (eyeMode === 'wide' || eyeMode === 'nervous') {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(ex, -6, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Glossy dark pupil
        const pupilOffsetY = eyeMode === 'nervous' ? 0.8 : 0;
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(ex, -6 + pupilOffsetY, eyeMode === 'wide' ? 1.3 : 1.65, 0, Math.PI * 2);
        ctx.fill();
        // Crisp white specular catchlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 0.6, -6.7 + pupilOffsetY * 0.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawEye(-3.4);
    drawEye(3.4);

    // Slender realistic Emperor curved beak with orange-pink lower mandible stripe
    const bDir = facingDir >= 0 ? 1 : -1;
    if (beakOpen > 0.1) {
      // Open squawking beak
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.moveTo(0, -3.5);
      ctx.lineTo(bDir * 7.5, -2.5 - beakOpen * 2.2);
      ctx.lineTo(bDir * 6.5, -0.5 + beakOpen * 2.8);
      ctx.closePath();
      ctx.fill();

      // Upper mandible
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-1, -4.5);
      ctx.quadraticCurveTo(bDir * 4.5, -5.5 - beakOpen * 2, bDir * 8.5, -2.8 - beakOpen * 2);
      ctx.lineTo(0, -3);
      ctx.closePath();
      ctx.fill();

      // Lower mandible with orange-pink Emperor stripe
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(-0.5, -2.8);
      ctx.lineTo(bDir * 7.2, -0.2 + beakOpen * 2.6);
      ctx.lineTo(0, -1.2);
      ctx.closePath();
      ctx.fill();
    } else {
      // Closed slender curved beak
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-1.2, -4.6);
      ctx.quadraticCurveTo(bDir * 4.8, -5.2, bDir * 8.2, -2.2);
      ctx.quadraticCurveTo(bDir * 3.5, -2.0, -1.0, -2.5);
      ctx.closePath();
      ctx.fill();

      // Signature Emperor orange-pink lower mandible stripe
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(bDir * 0.5, -2.5);
      ctx.lineTo(bDir * 6.0, -2.2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ------------------------------------------------------------------------
     Anatomically Realistic Articulated Polar Bear (4-Limb Kinematic Skeleton)
     ------------------------------------------------------------------------ */

  /** @private */
  _drawPolarBear(ctx) {
    const bear = this._bear;
    const isSprinting = bear.mode === 'sprint';
    const breath = Math.sin(this._elapsed * 2.1) * 1.4;

    // Kinematic 4-limb angles (in radians)
    let farBackHip = 0.06;
    let farBackKnee = -0.05;
    let nearBackHip = -0.04;
    let nearBackKnee = 0.04;
    let farFrontShoulder = -0.06;
    let farFrontElbow = 0.04;
    let nearFrontShoulder = 0.05;
    let nearFrontElbow = -0.04;
    let spineFlex = 0;

    if (isSprinting) {
      // Dynamic bounding gallop: front pair & hind pair stretch and gather cleanly
      const p = bear.stridePhase;
      const frontSwing = Math.sin(p) * 0.62;
      const frontSwing2 = Math.sin(p + 0.42) * 0.58;
      const backSwing = Math.sin(p + Math.PI + 0.25) * 0.64;
      const backSwing2 = Math.sin(p + Math.PI + 0.65) * 0.58;

      nearFrontShoulder = frontSwing;
      nearFrontElbow = Math.max(0, -frontSwing) * 0.72;
      farFrontShoulder = frontSwing2;
      farFrontElbow = Math.max(0, -frontSwing2) * 0.72;

      nearBackHip = backSwing;
      nearBackKnee = -Math.max(0, backSwing) * 0.55;
      farBackHip = backSwing2;
      farBackKnee = -Math.max(0, backSwing2) * 0.55;

      spineFlex = Math.sin(p) * 0.065;
    } else if (bear.mode === 'grumble' && bear.pawStamp > 0) {
      // Heavy front paw stamp on grumble
      const lift = Math.sin(bear.pawStamp * Math.PI) * 0.52;
      nearFrontShoulder = -lift;
      nearFrontElbow = lift * 0.85;
    } else if (bear.mode === 'chompOpen') {
      // Slight forward lunge
      nearFrontShoulder = -0.22;
      farFrontShoulder = -0.14;
      nearBackHip = 0.16;
    }

    // Soft elliptical snow contact shadow
    const shadowStretch = isSprinting ? 1.15 : 1.0;
    const shadowGrad = ctx.createRadialGradient(bear.x, FLOOR_Y + 2, 10, bear.x, FLOOR_Y + 2, 62 * shadowStretch);
    shadowGrad.addColorStop(0, 'rgba(7, 25, 48, 0.42)');
    shadowGrad.addColorStop(0.65, 'rgba(7, 25, 48, 0.18)');
    shadowGrad.addColorStop(1, 'rgba(7, 25, 48, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(bear.x, FLOOR_Y + 2, 62 * shadowStretch, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw articulated Polar Bear facing right in local space, flipped by bear.dir
    ctx.save();
    ctx.translate(bear.x, FLOOR_Y + bear.yOffset);
    ctx.scale(bear.dir, 1);

    // 1. Far-side limbs (shaded darker cool glacier-blue for 3D depth)
    this._drawBearLimb(ctx, -34, -34, farBackHip, farBackKnee, true, true);
    this._drawBearLimb(ctx, 22, -36, farFrontShoulder, farFrontElbow, true, false);

    // 2. Sculpted muscular torso (shoulder hump, sloping rump, fur shading, rounded tail)
    ctx.save();
    ctx.rotate(spineFlex);

    // Small rounded polar bear tail
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(-56, -42, 7.5, 5.5, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Main body contour
    ctx.beginPath();
    ctx.moveTo(-54, -38);
    // Heavy sloping rump -> muscular shoulder hump
    ctx.bezierCurveTo(-52, -62, -24, -67, -2, -64);
    ctx.bezierCurveTo(14, -69, 32, -68, 42, -56);
    // Deep furred chest -> underbelly -> hind flank
    ctx.bezierCurveTo(46, -42, 36, -24, 18, -22);
    ctx.bezierCurveTo(-2, -20, -24, -21, -40, -24);
    ctx.bezierCurveTo(-52, -26, -56, -32, -54, -38);
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(0, -68 - breath, 0, -20);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.28, '#fdfbf7'); // warm ivory Arctic fur
    bodyGrad.addColorStop(0.65, '#e2e8f0'); // soft snow-blue midtone
    bodyGrad.addColorStop(0.9, '#cbd5e1'); // cool glacier-blue shadow
    bodyGrad.addColorStop(1, '#94a3b8'); // underbelly occlusion
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Subtle moonlight rim highlight along top back & shoulder hump
    ctx.beginPath();
    ctx.moveTo(-48, -48);
    ctx.bezierCurveTo(-36, -63, -12, -66, 18, -66);
    ctx.bezierCurveTo(28, -66, 36, -62, 40, -56);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Subtle fur-tuft shading strokes on flank & chest
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-26, -42);
    ctx.quadraticCurveTo(-20, -34, -24, -27);
    ctx.moveTo(8, -46);
    ctx.quadraticCurveTo(13, -36, 9, -28);
    ctx.moveTo(28, -44);
    ctx.quadraticCurveTo(32, -36, 29, -29);
    ctx.stroke();

    // 3. Long tapered Arctic neck & sculpted articulated head
    this._drawBearHeadAndJaw(ctx, bear, breath);

    ctx.restore();

    // 4. Near-side limbs (warm ivory highlights + dark curved claws)
    this._drawBearLimb(ctx, -38, -32, nearBackHip, nearBackKnee, false, true);
    this._drawBearLimb(ctx, 20, -34, nearFrontShoulder, nearFrontElbow, false, false);

    // Subtle white impact flash on chomp snap
    if (bear.hitFlashTimer > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.ellipse(6, -40, 62, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draws one articulated polar bear limb (upper segment + lower leg + broad furred paw + claws).
   * @private
   */
  _drawBearLimb(ctx, pivotX, pivotY, upperAngle, lowerAngle, isFar, isBack) {
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(upperAngle);

    const upperLen = isBack ? 18 : 19;
    const upperW = isBack ? 14 : 12.5;
    const lowerLen = isBack ? 15 : 16;

    // Upper muscular leg
    const uGrad = ctx.createLinearGradient(-upperW, 0, upperW, upperLen);
    if (isFar) {
      uGrad.addColorStop(0, '#94a3b8');
      uGrad.addColorStop(1, '#64748b');
    } else {
      uGrad.addColorStop(0, '#fdfbf7');
      uGrad.addColorStop(0.55, '#e2e8f0');
      uGrad.addColorStop(1, '#cbd5e1');
    }
    ctx.fillStyle = uGrad;
    ctx.beginPath();
    ctx.moveTo(-upperW * 0.72, -4);
    ctx.quadraticCurveTo(upperW * 0.8, -2, upperW * 0.62, upperLen);
    ctx.lineTo(-upperW * 0.55, upperLen);
    ctx.quadraticCurveTo(-upperW * 0.9, upperLen * 0.45, -upperW * 0.72, -4);
    ctx.closePath();
    ctx.fill();

    // Knee / elbow joint -> lower leg + broad snowshoe paw
    ctx.translate(0, upperLen - 2);
    ctx.rotate(lowerAngle);

    const lGrad = ctx.createLinearGradient(-8, 0, 10, lowerLen);
    if (isFar) {
      lGrad.addColorStop(0, '#94a3b8');
      lGrad.addColorStop(1, '#64748b');
    } else {
      lGrad.addColorStop(0, '#f1f5f9');
      lGrad.addColorStop(0.7, '#e2e8f0');
      lGrad.addColorStop(1, '#cbd5e1');
    }
    ctx.fillStyle = lGrad;
    ctx.beginPath();
    ctx.moveTo(-7.5, -2);
    ctx.lineTo(7.5, -2);
    ctx.lineTo(8.5, lowerLen - 2);
    ctx.quadraticCurveTo(13, lowerLen + 1, 10.5, lowerLen + 3.5);
    ctx.lineTo(-7.5, lowerLen + 3.5);
    ctx.quadraticCurveTo(-10, lowerLen + 1, -7.5, -2);
    ctx.closePath();
    ctx.fill();

    // Dark curved Arctic claws on paw front
    ctx.fillStyle = isFar ? '#1e293b' : '#0f172a';
    for (let c = 0; c < 3; c += 1) {
      ctx.beginPath();
      ctx.ellipse(9.5 + c * 1.4, lowerLen + 2.2 - c * 0.3, 2.2, 1.1, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draws the tapered Arctic neck, sculpted polar bear head, articulated lower jaw,
   * pink tongue, white canine teeth, dark wet nose, rounded ears, and expressive eyes.
   * @private
   */
  _drawBearHeadAndJaw(ctx, bear, breath) {
    ctx.save();
    ctx.translate(34, -52 - breath * 0.5);
    ctx.rotate(bear.headPitch);

    // Tapered muscular Arctic neck
    const neckGrad = ctx.createLinearGradient(-12, -16, 18, 16);
    neckGrad.addColorStop(0, '#fdfbf7');
    neckGrad.addColorStop(0.6, '#e2e8f0');
    neckGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.quadraticCurveTo(6, -16, 18, -12);
    ctx.lineTo(18, 10);
    ctx.quadraticCurveTo(4, 18, -12, 14);
    ctx.closePath();
    ctx.fill();

    // Far rounded fur-tufted ear
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(14, -15, 5.2, 0, Math.PI * 2);
    ctx.fill();

    // Open mouth interior (visible when jaw hinges open!)
    const jawAngle = bear.jawOpen * 0.58;
    if (bear.jawOpen > 0.04) {
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(38, -1);
      ctx.lineTo(35, 6 + bear.jawOpen * 13);
      ctx.lineTo(14, 7 + bear.jawOpen * 4);
      ctx.closePath();
      ctx.fill();

      // Pink tongue inside open mouth
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(26, 4 + bear.jawOpen * 6.5, 8.5, 3.6, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Articulated lower jaw
    ctx.save();
    ctx.translate(15, 3);
    ctx.rotate(jawAngle);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(22, 0);
    ctx.quadraticCurveTo(23, 5.5, 16, 6.5);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();

    // Lower white canine tooth
    if (bear.jawOpen > 0.14) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(18.5, -4.2);
      ctx.lineTo(20, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Pink licking tongue curling upward during chompLick
    if (bear.tongueOut > 0.05) {
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(36 + bear.tongueOut * 4, 2 - bear.tongueOut * 2, 5.5 * bear.tongueOut + 2, 3.2, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.ellipse(36.5 + bear.tongueOut * 4, 1.2 - bear.tongueOut * 2, 3 * bear.tongueOut + 1, 1.4, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Upper sculpted cranium & tapered Roman polar bear snout
    const headGrad = ctx.createLinearGradient(8, -18, 38, 6);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.55, '#fdfbf7');
    headGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(6, -14);
    ctx.bezierCurveTo(16, -18, 28, -13, 39, -7);
    ctx.quadraticCurveTo(42, -3, 38, 1.5);
    ctx.lineTo(15, 2.5);
    ctx.quadraticCurveTo(6, 0, 6, -14);
    ctx.closePath();
    ctx.fill();

    // Upper white canine fangs when mouth open
    if (bear.jawOpen > 0.14) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(31, 1);
      ctx.lineTo(33, 6.2);
      ctx.lineTo(35, 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(25, 1.2);
      ctx.lineTo(26.5, 4.4);
      ctx.lineTo(28, 1.2);
      ctx.closePath();
      ctx.fill();
    }

    // Dark mouth lip line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(19, 1.8);
    ctx.quadraticCurveTo(29, 2.4, 38, 1.0);
    ctx.stroke();

    // Near rounded fur-tufted ear
    ctx.fillStyle = '#fdfbf7';
    ctx.beginPath();
    ctx.arc(9.5, -13.5, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(10.5, -13.2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Dark leathery wet nose with crisp specular catchlight
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(39.2, -5.2, 4.0, 3.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
    ctx.beginPath();
    ctx.ellipse(38.4, -6.4, 1.5, 0.9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Expressive attentive eye + brow ridge
    const ex = 23.5;
    const ey = -7.8;
    if (bear.blinkTimer > 0 && bear.mode === 'wait') {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ex - 2.4, ey);
      ctx.lineTo(ex + 2.4, ey);
      ctx.stroke();
    } else if (bear.mode === 'chompChew' || bear.mode === 'chompLick') {
      // Satisfied squint while chewing/licking
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(ex, ey + 1, 2.6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 0.7, ey - 0.8, 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Furrowed brow on grumble
      if (bear.mode === 'grumble') {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex - 3.5, ey - 4.2);
        ctx.lineTo(ex + 3.2, ey - 2.0);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /** @private */
  _drawBreathClouds(ctx) {
    for (let i = 0; i < this._breathClouds.length; i += 1) {
      const bc = this._breathClouds[i];
      const alpha = clamp((bc.life / bc.maxLife) * 0.34, 0, 0.34);
      const grad = ctx.createRadialGradient(bc.x, bc.y, 1, bc.x, bc.y, bc.r);
      grad.addColorStop(0, `rgba(224, 242, 254, ${alpha.toFixed(2)})`);
      grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bc.x, bc.y, bc.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** @private */
  _drawParticles(ctx) {
    for (let i = 0; i < this._particles.length; i += 1) {
      const pt = this._particles[i];
      const alpha = clamp(pt.life / pt.maxLife, 0, 1);

      if (pt.kind === 'snowPuff') {
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0.5, pt.x, pt.y, pt.size);
        grad.addColorStop(0, pt.color);
        grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.kind === 'shard') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(0, -pt.size);
        ctx.lineTo(pt.size * 0.65, 0);
        ctx.lineTo(0, pt.size * 0.9);
        ctx.lineTo(-pt.size * 0.55, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (pt.kind === 'feather') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, pt.size, pt.size * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.kind === 'sparkle') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(pt.x, pt.y);
        ctx.fillStyle = pt.color;
        const r = pt.size;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /** @private */
  _drawCalloutBadge(ctx) {
    const bear = this._bear;
    if (!bear.bubbleText) return;

    const text = bear.bubbleText;
    ctx.save();
    ctx.font = '800 16px system-ui, -apple-system, Segoe UI, sans-serif';
    const textW = ctx.measureText(text).width;
    const boxW = Math.max(66, textW + 26);
    const boxH = 30;
    const cx = clamp(bear.x + bear.dir * 32, boxW / 2 + 12, CANVAS_W - boxW / 2 - 12);
    const bx = cx - boxW / 2;
    const by = FLOOR_Y - 106;

    // Soft drop shadow
    ctx.shadowColor = 'rgba(4, 11, 24, 0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    traceRoundedRect(ctx, bx, by, boxW, boxH, 12);
    ctx.fillStyle = bear.bubbleBg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = bear.bubbleColor;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Pointer tail
    ctx.beginPath();
    ctx.moveTo(cx - 7, by + boxH - 1);
    ctx.lineTo(cx, by + boxH + 8);
    ctx.lineTo(cx + 7, by + boxH - 1);
    ctx.closePath();
    ctx.fillStyle = bear.bubbleBg;
    ctx.fill();

    // Crisp callout text
    ctx.fillStyle = bear.bubbleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, by + boxH / 2 + 0.5);
    ctx.restore();
  }
}
