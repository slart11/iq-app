/**
 * Penguin Ramp & Hungry Polar Bear Ice Cave — 16-bit Pixel-Art Canvas Engine.
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM/window dependencies and can be imported directly in Node.js unit tests.
 * `PenguinArena` renders and animates a crisp 320×128 retro pixel-art scene on HTML5 <canvas>.
 */

const STYLE_ID = 'iq-penguin-arena-styles';
const CANVAS_W = 320;
const CANVAS_H = 128;
const RAMP_Y = 48;
const RAMP_H = 7;
const FLOOR_Y = 112;

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
   Pixel-Art Palettes, Sprites & Bitmap Font
   ========================================================================== */

const PENGUIN_PALETTE = {
  K: '#0c1324', // crisp dark outline
  D: '#1e293b', // dark slate-navy plumage
  M: '#475569', // crown highlight
  W: '#f8fafc', // bright white belly
  S: '#cbd5e1', // belly shadow
  E: '#0f172a', // eye pupil
  H: '#ffffff', // eye glint
  P: '#fb7185', // rosy cheek
  O: '#f97316', // orange beak & feet
  Y: '#fbbf24', // bright beak & feet highlight
};

/** 12×14 pixel-art penguin frames */
const PENGUIN_SPRITES = {
  idle0: [
    '....KKKK....',
    '...KMMMMK...',
    '..KDDDDDDK..',
    '..KHEKKHEK..',
    '..KPWYYWPK..',
    '..KDWOOWDK..',
    '.KKDWWWWDKK.',
    '.KDDWWWWDDK.',
    '.KDDWWWWDDK.',
    '.KKDWWWWDKK.',
    '..KDSWWSDK..',
    '..KKSSSSKK..',
    '...KO..OK...',
    '..KYY..YYK..',
  ],
  idle1: [
    '....KKKK....',
    '...KMMMMK...',
    '..KDDDDDDK..',
    '..KHEKKHEK..',
    '..KPWYYWPK..',
    '..KDWOOWDK..',
    '.KKDWWWWDKK.',
    'KDDDWWWWDDDK',
    '.KKDWWWWDKK.',
    '..KDWWWWDK..',
    '..KDSWWSDK..',
    '..KKSSSSKK..',
    '..KO....OK..',
    '.KYY....KK..',
  ],
  blink: [
    '....KKKK....',
    '...KMMMMK...',
    '..KDDDDDDK..',
    '..KDDKKDDK..',
    '..KPWYYWPK..',
    '..KDWOOWDK..',
    '.KKDWWWWDKK.',
    '.KDDWWWWDDK.',
    '.KDDWWWWDDK.',
    '.KKDWWWWDKK.',
    '..KDSWWSDK..',
    '..KKSSSSKK..',
    '...KO..OK...',
    '..KYY..YYK..',
  ],
  cheer: [
    '....KKKK....',
    '...KMMMMK...',
    'K.KDDDDDDK.K',
    'KDKKEKKEKKDK',
    'KKKPWYYWPKKK',
    '.KKDWOOWDKK.',
    '..KDWWWWDK..',
    '..KDWWWWDK..',
    '..KDWWWWDK..',
    '..KDSWWSDK..',
    '..KKSSSSKK..',
    '...KO..OK...',
    '...KY..YK...',
    '............',
  ],
  panic: [
    '....KKKK....',
    '...KMMMMK...',
    '..KDDDDDDK..',
    '..KHHKKHHK..',
    '..KHEYYEHK..',
    'KKKDOKKODKKK',
    'KDDDWWWWDDDK',
    '.KKDWWWWDKK.',
    '..KDWWWWDK..',
    '..KDWWWWDK..',
    '..KDSWWSDK..',
    '..KKSSSSKK..',
    '..KO....OK..',
    '..KY....YK..',
  ],
  fall0: [
    '..KYY..YYK..',
    '...KO..OK...',
    '..KKSSSSKK..',
    '.KKDSWWSDKK.',
    'KDDDWWWWDDDK',
    '.KKDWWWWDKK.',
    '..KDWWWWDK..',
    '..KDWOOWDK..',
    '..KPWYYWPK..',
    '..KHHKKHHK..',
    '..KDDDDDDK..',
    '...KMMMMK...',
    '....KKKK....',
    '............',
  ],
  fall1: [
    '....KYYK....',
    '...KKOOKK...',
    '..KSSWWSDK..',
    '.KDDWWWWDDK.',
    'KDDWWWWWWDDK',
    'KDDWWOOOWDDK',
    '.KKDWYYWDKK.',
    '..KDKHHKDK..',
    '..KDKEEKDK..',
    '...KDDDDK...',
    '....KKKK....',
    '............',
    '............',
    '............',
  ],
};

const BEAR_PALETTE = {
  K: '#0b1324', // crisp dark outline
  W: '#ffffff', // pure sunlit fur highlight
  F: '#f1f5f9', // primary white fur
  B: '#dbeafe', // ice-blue fur mid-shade
  S: '#93c5fd', // cool shadow / far legs
  N: '#0f172a', // nose, eye, claws
  M: '#e11d48', // open mouth interior
  P: '#fda4af', // tongue / inner ear
  T: '#ffffff', // sharp white fangs
};

/** 28×18 pixel-art polar bear frames (facing RIGHT by default) */
const BEAR_SPRITES = {
  walk0: [
    '..................KKK.......',
    '.................KFPWK......',
    '......KKKKKKKKKKKWWWWKK.....',
    '....KKWWWWWWWWWWWWWWFFWK....',
    '...KWWFFFFFFFFFFFFFFFNFKK...',
    '..KWWFFFFFFFFFFFFFFFFFFFNNK.',
    '.KWFBBBBFFFFFFFFFFFFFFFNNNK.',
    'KWWFFBBBBFFFFFFFFFFFFFBFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBSK...',
    '.KKBBBBBBBBBBBBBBBBBBBKK....',
    '..KBBBBSSSSSSSSSSSBBBBK.....',
    '..KBBBKKSSSSSSSSSKKBBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '.KBBK...KSSK..KSSK..KBBK....',
    '.KBBK...KSSK..KSSK..KBBK....',
    '.KFFK...KNNK..KNNK..KFFK....',
    '.KNNK....KK....KK...KNNK....',
    '..KK.................KK.....',
  ],
  walk1: [
    '..................KKK.......',
    '......KKKKKKKKKK.KFPWK......',
    '....KKWWWWWWWWWWKWWWWKK.....',
    '...KWWFFFFFFFFFFFFFFFWWK....',
    '..KWWFFFFFFFFFFFFFFFFNFKK...',
    '.KWFBBBBFFFFFFFFFFFFFFFFNNK.',
    'KWWFFBBBBFFFFFFFFFFFFFFNNNK.',
    'KFFBBBBBBBBBBBBBBBBBBBBSKK..',
    '.KKBBBBBBBBBBBBBBBBBBBKK....',
    '..KBBBBSSSSSSSSSSSBBBBK.....',
    '...KBBBKKSSSSSSSKKBBBK......',
    '...KBBK..KSSKKSSK.KBBK......',
    '...KBBK..KSSKKSSK.KBBK......',
    '...KBBK..KSSKKSSK.KBBK......',
    '...KFFK..KNNKKNNK.KFFK......',
    '...KNNK...KK..KK..KNNK......',
    '....KK.............KK.......',
    '............................',
  ],
  walk2: [
    '..................KKK.......',
    '.................KFPWK......',
    '......KKKKKKKKKKKWWWWKK.....',
    '....KKWWWWWWWWWWWWWWFFWK....',
    '...KWWFFFFFFFFFFFFFFFNFKK...',
    '..KWWFFFFFFFFFFFFFFFFFFFNNK.',
    '.KWFBBBBFFFFFFFFFFFFFFFNNNK.',
    'KWWFFBBBBFFFFFFFFFFFFFBFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBSK...',
    '.KKBBBBBBBBBBBBBBBBBBBKK....',
    '..KBBBBSSSSSSSSSSSBBBBK.....',
    '...KBBBKKSSSSSSSKKBBBK......',
    '....KBBKKSSK..KSSKKBBK......',
    '....KBBKKSSK..KSSKKBBK......',
    '....KBBKKSSK..KSSK.KBBK.....',
    '....KFFKKNNK..KNNK.KFFK.....',
    '....KNNK.KK....KK..KNNK.....',
    '.....KK.............KK......',
  ],
  walk3: [
    '..................KKK.......',
    '......KKKKKKKKKK.KFPWK......',
    '....KKWWWWWWWWWWKWWWWKK.....',
    '...KWWFFFFFFFFFFFFFFFWWK....',
    '..KWWFFFFFFFFFFFFFFFFNFKK...',
    '.KWFBBBBFFFFFFFFFFFFFFFFNNK.',
    'KWWFFBBBBFFFFFFFFFFFFFFNNNK.',
    'KFFBBBBBBBBBBBBBBBBBBBBSKK..',
    '.KKBBBBBBBBBBBBBBBBBBBKK....',
    '..KBBBBSSSSSSSSSSSBBBBK.....',
    '...KBBBKKSSSSSSSKKBBBK......',
    '...KBBK.KSSKKSSK..KBBK......',
    '...KBBK.KSSKKSSK..KBBK......',
    '...KBBK.KSSKKSSK..KBBK......',
    '...KFFK.KNNKKNNK..KFFK......',
    '...KNNK..KK..KK...KNNK......',
    '....KK.............KK.......',
    '............................',
  ],
  sprint0: [
    '...................KKK......',
    '..................KFPWK.....',
    '.......KKKKKKKKKKKWWWWKK....',
    '....KKKWWWWWWWWWWWWWWFFWK...',
    '..KKWWFFFFFFFFFFFFFFFFNFKK..',
    '.KWWFBBBBFFFFFFFFFFFFFFFNNK.',
    'KWWFFBBBBFFFFFFFFFFFFFFNNNK.',
    '.KKBBBBBBBBBBBBBBBBBBTMMMK..',
    '..KBBBBBBBBBBBBBBBBBBMPMMK..',
    '..KBBBSSSSSSSSSSSSBBBBTKK...',
    '.KBBBK.KKKKKKKKKK..KBBBK....',
    'KBBBK..KSSK...KSSK..KBBBK...',
    'KFFK..KSSK.....KSSK..KFFK...',
    'KNNK..KNNK.....KNNK..KNNK...',
    '.KK....KK.......KK....KK....',
    '............................',
    '............................',
    '............................',
  ],
  sprint1: [
    '...................KKK......',
    '.......KKKKKKKKKK.KFPWK.....',
    '....KKKWWWWWWWWWWKWWWWKK....',
    '..KKWWFFFFFFFFFFFFFFFWWWK...',
    '.KWWFBBBBFFFFFFFFFFFFFNFKK..',
    'KWWFFBBBBFFFFFFFFFFFFFFFNNK.',
    '.KKBBBBBBBBBBBBBBBBBBBBNNNK.',
    '..KBBBBBBBBBBBBBBBBBBTMMMK..',
    '..KBBBBSSSSSSSSSSSBBBMPMMK..',
    '...KBBBKKSSSSSSSKKBBBTKK....',
    '....KBBK.KSSKKSSK.KBBK......',
    '.....KBBKKSSKKSSKKBBK.......',
    '.....KFFKKNNKKNNKKFFK.......',
    '.....KNNK.KK..KK.KNNK.......',
    '......KK..........KK........',
    '............................',
    '............................',
    '............................',
  ],
  chompOpen: [
    '.................KKK........',
    '................KFPWK..KK...',
    '......KKKKKKKKKKWWWWKKFFNK..',
    '....KKWWWWWWWWWWWWWWFFFFNNK.',
    '...KWWFFFFFFFFFFFFFFFNFTTNK.',
    '..KWWFFFFFFFFFFFFFFFFFFMMMK.',
    '.KWFBBBBFFFFFFFFFFFFFFPMMMK.',
    'KWWFFBBBBFFFFFFFFFFFFFPMMK..',
    'KFFBBBBBBBBBBBBBBBBBBBTMMK..',
    '.KKBBBBBBBBBBBBBBBBBBBTFFK..',
    '..KBBBBSSSSSSSSSSSBBBBKKK...',
    '..KBBBKKSSSSSSSSSKKBBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KFFK..KNNK.KNNK..KFFK.....',
    '..KNNK...KK...KK...KNNK.....',
    '...KK...............KK......',
  ],
  chompSnap: [
    '............................',
    '..................KKK.......',
    '.................KFPWK......',
    '......KKKKKKKKKKKWWWWKK.....',
    '....KKWWWWWWWWWWWWWWFFWK....',
    '...KWWFFFFFFFFFFFFFFNNFKK...',
    '..KWWFFFFFFFFFFFFFFFFFFFNNK.',
    '.KWFBBBBFFFFFFFFFFFFFFFNNNK.',
    'KWWFFBBBBFFFFFFFFFFFFFFFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBKK...',
    '.KKBBBBBBBBBBBBBBBBBBBKK....',
    '..KBBBBSSSSSSSSSSSBBBBK.....',
    '..KBBBKKSSSSSSSSSKKBBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KFFK..KNNK.KNNK..KFFK.....',
    '..KNNK...KK...KK...KNNK.....',
    '...KK...............KK......',
  ],
  chompLick: [
    '..................KKK.......',
    '.................KFPWK......',
    '......KKKKKKKKKKKWWWWKK.....',
    '....KKWWWWWWWWWWWWWWFFWK....',
    '...KWWFFFFFFFFFFFFFFNNFKK...',
    '..KWWFFFFFFFFFFFFFFFFFFFNNK.',
    '.KWFBBBBFFFFFFFFFFFFFFPPNNK.',
    'KWWFFBBBBFFFFFFFFFFFFPMMKK..',
    'KFFBBBBBBBBBBBBBBBBBBBKK....',
    '.KKBBBBBBBBBBBBBBBBBBBKK....',
    '..KBBBBSSSSSSSSSSSBBBBK.....',
    '..KBBBKKSSSSSSSSSKKBBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KBBK..KSSK.KSSK..KBBK.....',
    '..KFFK..KNNK.KNNK..KFFK.....',
    '..KNNK...KK...KK...KNNK.....',
    '...KK...............KK......',
  ],
  grumble: [
    '..................KKK.......',
    '.................KFPWK......',
    '......KKKKKKKKKKKWWWWKK.....',
    '....KKWWWWWWWWWWWWNNFFWK....',
    '...KWWFFFFFFFFFFFFFFNNFKK...',
    '..KWWFFFFFFFFFFFFFFFFFFFNNK.',
    '.KWFBBBBFFFFFFFFFFFFFFFNNNK.',
    'KWWFFBBBBFFFFFFFFFFFFFKKK...',
    'KFFBBBBBBBBBBBBBBBBBBBBSK...',
    '.KKBBBBBBBBBBBBBBBBBBBKK....',
    '..KBBBBSSSSSSSSSSSBBBBK.....',
    '..KBBBKKSSSSSSSSSKKBBBK.....',
    '..KBBK..KSSK.KSSK...KBBK....',
    '..KBBK..KSSK.KSSK...KBBK....',
    '..KBBK..KSSK.KSSK...KFFK....',
    '..KFFK..KNNK.KNNK...KNNK....',
    '..KNNK...KK...KK.....KK.....',
    '...KK.......................',
  ],
};

/** 3×5 crisp pixel bitmap font for cave signage and comic bubbles */
const PIXEL_FONT_3X5 = {
  A: ['010', '101', '111', '101', '101'],
  E: ['111', '100', '110', '100', '111'],
  G: ['111', '100', '101', '101', '111'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['111', '101', '101', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  U: ['101', '101', '101', '101', '111'],
  '!': ['010', '010', '010', '000', '010'],
  '.': ['000', '000', '000', '000', '010'],
  ' ': ['000', '000', '000', '000', '000'],
};

/* ==========================================================================
   Rendering Helpers
   ========================================================================== */

/**
 * Draws a pixel-art sprite grid onto the canvas at integer coordinates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} grid
 * @param {Record<string, string>} palette
 * @param {number} x
 * @param {number} y
 * @param {boolean} [flipX=false]
 */
function drawSprite(ctx, grid, palette, x, y, flipX = false) {
  const ox = Math.round(x);
  const oy = Math.round(y);
  const rows = grid.length;

  for (let r = 0; r < rows; r += 1) {
    const row = grid[r];
    const cols = row.length;
    for (let c = 0; c < cols; c += 1) {
      const ch = row[c];
      if (ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      const px = flipX ? ox + (cols - 1 - c) : ox + c;
      ctx.fillStyle = color;
      ctx.fillRect(px, oy + r, 1, 1);
    }
  }
}

/**
 * Draws crisp 3×5 bitmap pixel text.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} [scale=1]
 * @param {boolean} [center=false]
 */
function drawPixelText(ctx, text, x, y, color, scale = 1, center = false) {
  const upper = text.toUpperCase();
  const charW = 3 * scale;
  const gap = 1 * scale;
  const totalW = upper.length * charW + Math.max(0, upper.length - 1) * gap;
  let cursorX = Math.round(center ? x - totalW / 2 : x);
  const oy = Math.round(y);

  ctx.fillStyle = color;
  for (let i = 0; i < upper.length; i += 1) {
    const glyph = PIXEL_FONT_3X5[upper[i]] || PIXEL_FONT_3X5[' '];
    for (let r = 0; r < glyph.length; r += 1) {
      const row = glyph[r];
      for (let c = 0; c < row.length; c += 1) {
        if (row[c] === '1') {
          ctx.fillRect(cursorX + c * scale, oy + r * scale, scale, scale);
        }
      }
    }
    cursorX += charW + gap;
  }
}

/**
 * Computes evenly distributed X coordinates on the 320px wide ramp for `total` slots.
 * @param {number} index
 * @param {number} total
 * @returns {number}
 */
function getSlotX(index, total) {
  if (total <= 1) {
    return 160;
  }
  const left = 40;
  const right = 280;
  const step = (right - left) / (total - 1);
  return Math.round(left + index * step);
}

/**
 * Computes trapdoor width that fits neatly between adjacent slots.
 * @param {number} total
 * @returns {number}
 */
function getTrapdoorWidth(total) {
  if (total <= 1) return 22;
  const step = (280 - 40) / (total - 1);
  return Math.max(12, Math.min(20, Math.floor(step - 4)));
}

/**
 * Deterministic pseudo-random helper for scenic stars/snowflakes/glaciers.
 */
function seededRand(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
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
  background: #0b162c;
  box-shadow: 0 8px 24px rgba(11, 22, 44, 0.22);
}

.penguin-arena-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 320 / 128;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  background: #0b162c;
}

.penguin-status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  padding: 0.5rem 0.875rem;
  background: #0f172a;
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

/* ==========================================================================
   PenguinArena Pixel-Art Controller
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

    // Scenic elements (deterministic, crisp 16-bit backdrop)
    this._stars = this._createStars();
    this._snowflakes = this._createSnowflakes();
    this._particles = [];

    // Per-slot penguin & trapdoor animation state
    this._penguins = [];
    this._trapdoors = [];

    // Polar bear state in 320×128 logical coordinates
    this._bear = {
      x: 160,
      dir: 1, // 1 = right, -1 = left
      targetX: null,
      mode: 'patrol', // 'patrol' | 'sprint' | 'chompOpen' | 'chompSnap' | 'chompLick' | 'grumble'
      modeTimer: 0,
      walkPhase: 0,
      dustTimer: 0,
      bubbleText: null,
      bubbleColor: '#0f172a',
      bubbleTimer: 0,
    };

    // Camera micro-shake on bear chomp
    this._shakeTimer = 0;
    this._shakeIntensity = 0;

    // Cached DOM references
    this._canvas = null;
    this._ctx = null;
    this._statusPill = null;
    this._statusNote = null;

    ensureArenaStyles();
    this._buildDom();
    this.reset(totalPenguins);
    this._startLoop();
  }

  /**
   * Resets all penguins onto the ramp, closes trapdoors, and resets the bear to patrol.
   * @param {number} [totalPenguins]
   */
  reset(totalPenguins = this._state ? this._state.total : 10) {
    this._clearTimers();
    this._state = createPenguinState(totalPenguins);
    this._particles = [];
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
      });

      this._penguins.push({
        index: i,
        x: slotX,
        y: RAMP_Y - 14,
        vy: 0,
        status: 'idle', // 'idle' | 'cheer' | 'panic' | 'falling' | 'eaten'
        timer: 0,
        cheerDelay: 0,
        waddlePhase: seededRand(i + 11) * Math.PI * 2,
        blinkCooldown: 1.4 + seededRand(i + 37) * 3.6,
        blinkTimer: 0,
      });
    }

    this._bear = {
      x: 160,
      dir: 1,
      targetX: null,
      mode: 'patrol',
      modeTimer: 0,
      walkPhase: 0,
      dustTimer: 0,
      bubbleText: null,
      bubbleColor: '#0f172a',
      bubbleTimer: 0,
    };

    this._updateStatusUi();
    this._render();
  }

  /**
   * Triggers a trapdoor opening, penguin panic + fall into the ice cave, and the polar bear
   * sprinting over to chomp it.
   * @returns {{ total: number, remaining: number, eaten: number, fallingIndex: number | null, bearState: string, bearSlot: number }}
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
        door.angle = 85;
        door.targetAngle = 85;
      }
      if (penguin) {
        penguin.status = 'eaten';
      }
      this._bear.x = targetX;
      this._bear.targetX = null;
      this._bear.mode = 'chompLick';
      this._bear.bubbleText = 'NOM!';
      this._bear.bubbleColor = '#be123c';
      this._bear.bubbleTimer = 0.9;
      this._render();

      this._schedule(() => {
        this._bear.bubbleText = null;
        this._bear.mode = 'patrol';
        this._state = { ...this._state, bearState: 'patrol' };
        this._render();
      }, 900);

      return { ...this._state };
    }

    // Open hinged trapdoor + spawn glistening ice shards
    if (door) {
      door.targetAngle = 85;
      door.vel = 420;
      this._spawnIceShards(targetX, RAMP_Y + 4);
    }

    // Penguin cartoon hang-time panic (220ms) before gravity drop
    if (penguin) {
      penguin.status = 'panic';
      penguin.timer = 0.22;
      penguin.vy = 0;
      penguin.y = RAMP_Y - 14;
    }

    // Polar bear sprints straight to the falling penguin's X coordinate
    this._bear.targetX = targetX;
    this._bear.mode = 'sprint';
    this._bear.modeTimer = 0;
    this._bear.bubbleText = null;
    this._bear.dir = targetX >= this._bear.x ? 1 : -1;

    return { ...this._state };
  }

  /**
   * Celebrates a correct answer: remaining penguins jump with sparkles and the bear grumbles.
   * @returns {{ total: number, remaining: number, eaten: number, fallingIndex: number | null, bearState: string, bearSlot: number }}
   */
  onCorrectAnswer() {
    this._state = celebratePenguins(this._state);
    const reduced = prefersReducedMotion();

    for (let i = 0; i < this._state.remaining; i += 1) {
      const p = this._penguins[i];
      if (!p || p.status === 'panic' || p.status === 'falling' || p.status === 'eaten') {
        continue;
      }
      if (!reduced) {
        p.status = 'cheer';
        p.cheerDelay = i * 0.03;
        p.timer = 0.56;
        this._spawnSparkles(p.x, RAMP_Y - 16);
      }
    }

    // Bear grumbles (unless currently mid-sprint/chomp)
    if (this._bear.mode === 'patrol' || this._bear.mode === 'grumble') {
      this._bear.mode = 'grumble';
      this._bear.modeTimer = 0.85;
      this._bear.bubbleText = 'GRRR!';
      this._bear.bubbleColor = '#b45309';
      this._bear.bubbleTimer = 0.85;
    }

    this._updateStatusUi();

    if (reduced) {
      this._render();
      this._schedule(() => {
        if (this._state.bearState === 'grumble') {
          this._bear.mode = 'patrol';
          this._bear.bubbleText = null;
          this._state = { ...this._state, bearState: 'patrol' };
          this._render();
        }
      }, 850);
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
  }

  /* ------------------------------------------------------------------------
     Private Setup & Timers
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
  _createStars() {
    const stars = [];
    for (let i = 0; i < 28; i += 1) {
      stars.push({
        x: Math.floor(6 + seededRand(i * 3 + 1) * (CANVAS_W - 12)),
        y: Math.floor(3 + seededRand(i * 3 + 2) * 24),
        phase: seededRand(i * 3 + 3) * Math.PI * 2,
        speed: 1.4 + seededRand(i * 5 + 7) * 2.4,
        hero: i % 7 === 0,
      });
    }
    return stars;
  }

  /** @private */
  _createSnowflakes() {
    const flakes = [];
    for (let i = 0; i < 24; i += 1) {
      flakes.push({
        x: seededRand(i * 7 + 1) * CANVAS_W,
        y: seededRand(i * 7 + 2) * (RAMP_Y - 2),
        speed: 6 + seededRand(i * 7 + 3) * 10,
        swayPhase: seededRand(i * 7 + 4) * Math.PI * 2,
        size: i % 5 === 0 ? 2 : 1,
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
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Isrampe med pingviner og sulten isbjørn i ishulen');
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');

    wrap.appendChild(canvas);

    // Accessible status bar below canvas
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
        `Isrampe med ${remaining} av ${total} pingviner trygge. ${eaten} pingviner er spist av isbjørnen i ishulen.`
      );
    }
  }

  /* ------------------------------------------------------------------------
     Particle Emitters
     ------------------------------------------------------------------------ */

  /** @private */
  _spawnIceShards(x, y) {
    const colors = ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8'];
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 0.15) + seededRand(i + this._elapsed * 13) * (Math.PI * 0.7);
      const speed = 18 + seededRand(i * 3 + 2) * 34;
      this._particles.push({
        x: x + (i - 3.5) * 2.2,
        y,
        vx: Math.cos(angle) * speed * (i % 2 === 0 ? 1 : -1),
        vy: Math.sin(angle) * speed * 0.5 - 10,
        gravity: 130,
        life: 0.42 + seededRand(i + 5) * 0.2,
        maxLife: 0.62,
        size: i % 3 === 0 ? 2 : 1,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnSnowDust(x, y, dir) {
    const colors = ['#ffffff', '#e0f2fe', '#bae6fd'];
    for (let i = 0; i < 3; i += 1) {
      this._particles.push({
        x: x - dir * (10 + i * 2),
        y: y - 1 - (i % 2),
        vx: -dir * (14 + i * 8),
        vy: -14 - i * 6,
        gravity: 55,
        life: 0.28 + i * 0.06,
        maxLife: 0.4,
        size: i === 0 ? 2 : 1,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnChompBurst(x, y) {
    const colors = ['#ffffff', '#e0f2fe', '#bae6fd', '#1e293b', '#334155', '#f97316'];
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = 22 + seededRand(i * 11 + 3) * 44;
      this._particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 22,
        gravity: 120,
        life: 0.36 + seededRand(i * 7 + 1) * 0.32,
        maxLife: 0.68,
        size: i % 4 === 0 ? 2 : 1,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnSparkles(x, y) {
    const colors = ['#fef08a', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 3; i += 1) {
      this._particles.push({
        x: x + (i - 1) * 5,
        y: y - (i % 2) * 3,
        vx: (i - 1) * 10,
        vy: -22 - i * 4,
        gravity: 28,
        life: 0.45,
        maxLife: 0.45,
        size: 1,
        color: colors[i % colors.length],
      });
    }
  }

  /* ------------------------------------------------------------------------
     60 FPS Loop & Simulation
     ------------------------------------------------------------------------ */

  /** @private */
  _startLoop() {
    if (typeof requestAnimationFrame !== 'function') return;
    this._lastFrameTime = performance.now();

    const tick = (now) => {
      if (this._destroyed) return;
      const dt = Math.min(0.05, Math.max(0, (now - this._lastFrameTime) / 1000));
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

    // 1. Update drifting snowflakes
    for (let i = 0; i < this._snowflakes.length; i += 1) {
      const f = this._snowflakes[i];
      f.y += f.speed * dt;
      f.x += Math.sin(this._elapsed * 1.4 + f.swayPhase) * 4 * dt;
      if (f.y >= RAMP_Y - 1) {
        f.y = 0;
        f.x = (f.x + 37) % CANVAS_W;
      }
      if (f.x < 0) f.x += CANVAS_W;
      if (f.x >= CANVAS_W) f.x -= CANVAS_W;
    }

    // 2. Update hinged trapdoors (spring-damped swing 0° -> 85°)
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const d = this._trapdoors[i];
      if (d.angle !== d.targetAngle || Math.abs(d.vel) > 0.5) {
        const diff = d.targetAngle - d.angle;
        d.vel += diff * 180 * dt;
        d.vel *= Math.max(0, 1 - 11 * dt);
        d.angle += d.vel * dt;
        if (d.angle > 94) {
          d.angle = 94;
          d.vel *= -0.35;
        }
        if (Math.abs(diff) < 0.4 && Math.abs(d.vel) < 2) {
          d.angle = d.targetAngle;
          d.vel = 0;
        }
      }
    }

    // 3. Update penguins
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      if (p.status === 'idle') {
        p.waddlePhase += dt * 2.6;
        if (p.blinkTimer > 0) {
          p.blinkTimer -= dt;
        } else {
          p.blinkCooldown -= dt;
          if (p.blinkCooldown <= 0) {
            p.blinkTimer = 0.14;
            p.blinkCooldown = 2.0 + seededRand(i + this._elapsed * 3) * 3.8;
          }
        }
      } else if (p.status === 'cheer') {
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
          p.vy = 24;
          p.timer = 0;
        }
      } else if (p.status === 'falling') {
        p.timer += dt;
        p.vy += 420 * dt;
        p.y += p.vy * dt;

        // Impact at polar bear mouth height
        if (p.y >= FLOOR_Y - 22) {
          p.status = 'eaten';
          this._triggerBearChomp(p.x);
        }
      }
    }

    // 4. Update hungry polar bear
    this._updateBear(dt);

    // 5. Update particles
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
    }

    // 6. Camera micro-shake decay
    if (this._shakeTimer > 0) {
      this._shakeTimer = Math.max(0, this._shakeTimer - dt);
    }
  }

  /** @private */
  _updateBear(dt) {
    const bear = this._bear;
    const minX = 44;
    const maxX = 276;

    if (bear.bubbleTimer > 0) {
      bear.bubbleTimer -= dt;
      if (bear.bubbleTimer <= 0) {
        bear.bubbleText = null;
      }
    }

    if (bear.mode === 'sprint' && bear.targetX !== null) {
      const dx = bear.targetX - bear.x;
      const sprintSpeed = 240;
      if (Math.abs(dx) <= 4) {
        bear.x = bear.targetX;
        bear.targetX = null;
        bear.mode = 'chompOpen';
        bear.modeTimer = 0.6;
      } else {
        bear.dir = dx >= 0 ? 1 : -1;
        bear.x += Math.sign(dx) * Math.min(Math.abs(dx), sprintSpeed * dt);
        bear.walkPhase += dt * 16;
        bear.dustTimer -= dt;
        if (bear.dustTimer <= 0) {
          bear.dustTimer = 0.065;
          this._spawnSnowDust(bear.x, FLOOR_Y, bear.dir);
        }
      }
    } else if (bear.mode === 'chompOpen') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        bear.mode = 'patrol';
        this._state = { ...this._state, bearState: 'patrol' };
      }
    } else if (bear.mode === 'chompSnap') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        bear.mode = 'chompLick';
        bear.modeTimer = 0.48;
      }
    } else if (bear.mode === 'chompLick') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        bear.mode = 'patrol';
        this._state = { ...this._state, bearState: 'patrol' };
      }
    } else if (bear.mode === 'grumble') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        bear.mode = 'patrol';
        if (this._state.bearState === 'grumble') {
          this._state = { ...this._state, bearState: 'patrol' };
        }
      }
    } else {
      // Patrol walk cycle inside the ice cave
      const patrolSpeed = 28;
      bear.x += bear.dir * patrolSpeed * dt;
      if (bear.x >= maxX) {
        bear.x = maxX;
        bear.dir = -1;
      } else if (bear.x <= minX) {
        bear.x = minX;
        bear.dir = 1;
      }
      bear.walkPhase += dt * 5.2;
    }
  }

  /** @private */
  _triggerBearChomp(targetX) {
    const bear = this._bear;
    bear.x = targetX;
    bear.targetX = null;
    bear.mode = 'chompSnap';
    bear.modeTimer = 0.22;
    bear.bubbleText = 'NOM!';
    bear.bubbleColor = '#be123c';
    bear.bubbleTimer = 0.85;

    this._shakeTimer = 0.22;
    this._shakeIntensity = 2;
    this._spawnChompBurst(targetX, FLOOR_Y - 12);
  }

  /* ------------------------------------------------------------------------
     Pixel-Art Canvas Rendering (320 × 128)
     ------------------------------------------------------------------------ */

  /** @private */
  _render() {
    const ctx = this._ctx;
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.save();

    // Apply 2px camera micro-shake on bear chomp impact
    if (this._shakeTimer > 0 && !prefersReducedMotion()) {
      const mag = Math.ceil((this._shakeTimer / 0.22) * this._shakeIntensity);
      const sx = Math.round(Math.sin(this._elapsed * 95) * mag);
      const sy = Math.round(Math.cos(this._elapsed * 110) * mag);
      ctx.translate(sx, sy);
    }

    this._drawNightSky(ctx);
    this._drawAurora(ctx);
    this._drawStars(ctx);
    this._drawGlaciers(ctx);
    this._drawSnowflakes(ctx);
    this._drawIceCave(ctx);
    this._drawRampAndTrapdoors(ctx);
    this._drawPenguins(ctx);
    this._drawPolarBear(ctx);
    this._drawParticles(ctx);
    this._drawSpeechBubble(ctx);

    ctx.restore();
  }

  /** @private */
  _drawNightSky(ctx) {
    // Stepped 16-bit arctic night-sky gradient
    ctx.fillStyle = '#0b162c';
    ctx.fillRect(0, 0, CANVAS_W, 13);

    ctx.fillStyle = '#10203e';
    ctx.fillRect(0, 13, CANVAS_W, 10);

    ctx.fillStyle = '#13264a';
    ctx.fillRect(0, 23, CANVAS_W, 11);

    ctx.fillStyle = '#1d3b6b';
    ctx.fillRect(0, 34, CANVAS_W, 15);

    // Subtle 1px horizontal checkerboard dither seams between sky bands
    ctx.fillStyle = '#10203e';
    for (let x = 0; x < CANVAS_W; x += 2) {
      ctx.fillRect(x, 12, 1, 1);
    }
    ctx.fillStyle = '#13264a';
    for (let x = 1; x < CANVAS_W; x += 2) {
      ctx.fillRect(x, 22, 1, 1);
    }
    ctx.fillStyle = '#1d3b6b';
    for (let x = 0; x < CANVAS_W; x += 2) {
      ctx.fillRect(x, 33, 1, 1);
    }
  }

  /** @private */
  _drawAurora(ctx) {
    const t = this._elapsed;
    // Two gently rippling vertical-curtain aurora ribbons across the night sky
    for (let x = 14; x < CANVAS_W - 14; x += 2) {
      const wave1 = Math.sin(x * 0.032 + t * 0.85) * 4 + Math.cos(x * 0.015 - t * 0.45) * 2.5;
      const top1 = Math.round(9 + wave1);
      const h1 = Math.round(7 + Math.sin(x * 0.05 + t * 1.1) * 3);

      // Emerald bottom glow -> cyan mid -> violet crest
      ctx.fillStyle = 'rgba(45, 212, 191, 0.24)';
      ctx.fillRect(x, top1 + 3, 2, Math.max(2, h1 - 2));

      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.fillRect(x, top1 + 1, 2, 3);

      if ((x + Math.floor(t * 2)) % 4 === 0) {
        ctx.fillStyle = 'rgba(167, 139, 250, 0.20)';
        ctx.fillRect(x, top1 - 1, 2, 2);
      }
    }
  }

  /** @private */
  _drawStars(ctx) {
    const palette = ['#475569', '#94a3b8', '#e2e8f0', '#fef08a'];
    for (let i = 0; i < this._stars.length; i += 1) {
      const s = this._stars[i];
      const wave = 0.5 + 0.5 * Math.sin(this._elapsed * s.speed + s.phase);
      const idx = Math.min(3, Math.floor(wave * 4));
      ctx.fillStyle = palette[idx];
      ctx.fillRect(s.x, s.y, 1, 1);

      // Hero stars twinkle with a 3px pixel cross
      if (s.hero && idx === 3) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
        ctx.fillRect(s.x - 1, s.y, 1, 1);
        ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1);
        ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    }
  }

  /** @private */
  _drawGlaciers(ctx) {
    // Distant shaded snow-capped glacier peaks
    const peaks = [
      { cx: 34, top: 27, halfW: 36 },
      { cx: 92, top: 22, halfW: 42 },
      { cx: 158, top: 25, halfW: 48 },
      { cx: 224, top: 21, halfW: 44 },
      { cx: 286, top: 26, halfW: 42 },
    ];

    for (let i = 0; i < peaks.length; i += 1) {
      const p = peaks[i];
      const baseY = RAMP_Y;
      const height = baseY - p.top;

      for (let dy = 0; dy < height; dy += 1) {
        const y = p.top + dy;
        const span = Math.max(1, Math.round((dy / height) * p.halfW));
        const snowCap = dy < Math.round(height * 0.34);

        // Sunlit left slope
        ctx.fillStyle = snowCap ? '#dbeafe' : '#2b5280';
        ctx.fillRect(p.cx - span, y, span, 1);

        // Crisp cyan ridge highlight on snow cap
        if (snowCap && span > 2) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(p.cx - span, y, Math.max(1, Math.floor(span * 0.35)), 1);
        }

        // Shadowed right slope
        ctx.fillStyle = snowCap ? '#93c5fd' : '#183354';
        ctx.fillRect(p.cx, y, span, 1);
      }
    }
  }

  /** @private */
  _drawSnowflakes(ctx) {
    ctx.fillStyle = 'rgba(240, 249, 255, 0.85)';
    for (let i = 0; i < this._snowflakes.length; i += 1) {
      const f = this._snowflakes[i];
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
    }
  }

  /** @private */
  _drawIceCave(ctx) {
    // Deep cavern interior gradient bands
    ctx.fillStyle = '#071426';
    ctx.fillRect(0, RAMP_Y + RAMP_H, CANVAS_W, 18);

    ctx.fillStyle = '#0b1e36';
    ctx.fillRect(0, RAMP_Y + RAMP_H + 18, CANVAS_W, 20);

    ctx.fillStyle = '#102a49';
    ctx.fillRect(0, RAMP_Y + RAMP_H + 38, CANVAS_W, FLOOR_Y - (RAMP_Y + RAMP_H + 38));

    // Subtle icy crystal facets in cavern background
    ctx.fillStyle = '#143356';
    ctx.fillRect(46, 78, 22, 34);
    ctx.fillRect(130, 84, 30, 28);
    ctx.fillRect(236, 76, 26, 36);
    ctx.fillStyle = '#193e66';
    ctx.fillRect(50, 82, 8, 30);
    ctx.fillRect(136, 88, 10, 24);
    ctx.fillRect(240, 80, 9, 32);

    // Subtle etched pixel label "ISHULEN" on the upper cave back wall
    drawPixelText(ctx, 'ISHULEN', 160, 64, 'rgba(125, 211, 252, 0.26)', 1, true);

    // Left & right arched icy cavern walls supporting the ramp
    for (let y = RAMP_Y + RAMP_H; y < FLOOR_Y + 4; y += 1) {
      const t = (y - (RAMP_Y + RAMP_H)) / (FLOOR_Y - (RAMP_Y + RAMP_H));
      const arch = Math.round(22 - Math.sin(t * Math.PI) * 7 + (y % 7 === 0 ? 1 : 0));

      // Left pillar
      ctx.fillStyle = '#1e4976';
      ctx.fillRect(0, y, arch, 1);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(Math.max(0, arch - 5), y, 3, 1);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(Math.max(0, arch - 2), y, 2, 1);

      // Right pillar
      ctx.fillStyle = '#1e4976';
      ctx.fillRect(CANVAS_W - arch, y, arch, 1);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(CANVAS_W - arch + 2, y, 3, 1);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(CANVAS_W - arch, y, 2, 1);
    }

    // Jagged hanging pixel icicles along left/right cave ceiling
    const icicles = [
      [18, 12], [25, 8], [295, 9], [302, 13],
    ];
    for (let i = 0; i < icicles.length; i += 1) {
      const [ix, len] = icicles[i];
      for (let dy = 0; dy < len; dy += 1) {
        const w = Math.max(1, Math.round(((len - dy) / len) * 4));
        ctx.fillStyle = dy < 3 ? '#e0f2fe' : '#7dd3fc';
        ctx.fillRect(ix - Math.floor(w / 2), RAMP_Y + RAMP_H + dy, w, 1);
      }
    }

    // Snowy cave floor (y = 112..128) with pixel snowdrifts
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);

    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, FLOOR_Y, CANVAS_W, 8);

    ctx.fillStyle = '#e0f2fe';
    for (let x = 0; x < CANVAS_W; x += 1) {
      const drift = Math.round(Math.sin(x * 0.045) * 1.5);
      ctx.fillRect(x, FLOOR_Y + drift, 1, 3);
    }

    // Deep bottom shadow crust
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, CANVAS_H - 3, CANVAS_W, 3);

    // Subtle pixel bear pawprints along the snowy patrol trail
    const prints = [66, 94, 126, 162, 198, 232, 260];
    ctx.fillStyle = '#93c5fd';
    for (let i = 0; i < prints.length; i += 1) {
      const px = prints[i];
      const py = FLOOR_Y + 5 + (i % 2) * 2;
      ctx.fillRect(px, py, 3, 2);
      ctx.fillRect(px - 1, py - 1, 1, 1);
      ctx.fillRect(px + 1, py - 1, 1, 1);
      ctx.fillRect(px + 3, py - 1, 1, 1);
    }
  }

  /** @private */
  _drawRampAndTrapdoors(ctx) {
    // Helper to draw a solid shaded pixel ice-ramp segment
    const drawIceBlock = (x, width) => {
      if (width <= 0) return;
      const rx = Math.round(x);
      const rw = Math.round(width);
      ctx.fillStyle = '#0c223a';
      ctx.fillRect(rx, RAMP_Y, rw, RAMP_H);
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(rx, RAMP_Y + 1, rw, 1);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(rx, RAMP_Y + 2, rw, 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(rx, RAMP_Y + 4, rw, 1);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(rx, RAMP_Y + 5, rw, 1);
    };

    // Draw solid ramp segments between trapdoors
    let cursor = 0;
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      const leftEdge = Math.round(door.x - door.width / 2);
      drawIceBlock(cursor, leftEdge - cursor);

      // Small pixel icicle under solid divider
      if (leftEdge - cursor >= 4) {
        const icicleX = Math.round(cursor + (leftEdge - cursor) / 2);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(icicleX - 1, RAMP_Y + RAMP_H, 3, 2);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(icicleX, RAMP_Y + RAMP_H + 2, 1, 3);
      }

      cursor = leftEdge + door.width;
    }
    drawIceBlock(cursor, CANVAS_W - cursor);

    // Draw individual hinged trapdoors
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      const hingeX = Math.round(door.x - door.width / 2);
      const hingeY = RAMP_Y + 1;

      if (door.angle < 1) {
        // Closed trapdoor with crisp bevel & hinge pin
        ctx.fillStyle = '#0c223a';
        ctx.fillRect(hingeX, RAMP_Y, door.width, RAMP_H);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(hingeX + 1, RAMP_Y + 1, door.width - 2, 1);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(hingeX + 1, RAMP_Y + 2, door.width - 2, 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(hingeX + 1, RAMP_Y + 4, door.width - 2, 2);
        // Hinge rivet
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(hingeX + 1, RAMP_Y + 2, 2, 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(hingeX + 1, RAMP_Y + 2, 1, 1);
      } else {
        // Swinging trapdoor rendered as crisp pixel-snapped rotated ice plank
        const rad = (door.angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        for (let step = 0; step < door.width; step += 1) {
          const px = Math.round(hingeX + step * cos);
          const py = Math.round(hingeY + step * sin);
          ctx.fillStyle = '#0c223a';
          ctx.fillRect(px, py - 1, 2, 5);
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(px, py, 1, 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(px, py + 2, 1, 1);
        }
        // Hinge pin
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(hingeX, hingeY, 2, 2);
      }
    }
  }

  /** @private */
  _drawPenguins(ctx) {
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      let sprite = PENGUIN_SPRITES.idle0;
      let drawX = Math.round(p.x - 6);
      let drawY = Math.round(p.y);

      if (p.status === 'idle') {
        if (p.blinkTimer > 0) {
          sprite = PENGUIN_SPRITES.blink;
        } else {
          const waddleStep = Math.floor(p.waddlePhase) % 2;
          sprite = waddleStep === 0 ? PENGUIN_SPRITES.idle0 : PENGUIN_SPRITES.idle1;
        }
      } else if (p.status === 'cheer') {
        if (p.cheerDelay <= 0) {
          sprite = PENGUIN_SPRITES.cheer;
          const progress = 1 - Math.max(0, p.timer) / 0.56;
          const hop = Math.round(Math.sin(progress * Math.PI) * 9);
          drawY -= hop;
        }
      } else if (p.status === 'panic') {
        sprite = PENGUIN_SPRITES.panic;
        const tremble = Math.round(Math.sin(this._elapsed * 70) * 1);
        drawX += tremble;

        // Bouncing pixel "!" alert above panicked penguin
        const bangBounce = Math.round(Math.abs(Math.sin(this._elapsed * 24)) * 2);
        const bx = Math.round(p.x);
        const by = drawY - 8 - bangBounce;
        ctx.fillStyle = '#0c1324';
        ctx.fillRect(bx - 1, by - 1, 3, 7);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(bx, by, 1, 3);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(bx, by + 4, 1, 1);
      } else if (p.status === 'falling') {
        const tumbleFrame = Math.floor(p.timer / 0.09) % 2;
        sprite = tumbleFrame === 0 ? PENGUIN_SPRITES.fall0 : PENGUIN_SPRITES.fall1;
      }

      // Ground shadow on closed ramp
      if (p.status === 'idle' || p.status === 'cheer') {
        ctx.fillStyle = 'rgba(12, 34, 58, 0.35)';
        ctx.fillRect(Math.round(p.x - 4), RAMP_Y, 8, 1);
      }

      drawSprite(ctx, sprite, PENGUIN_PALETTE, drawX, drawY, false);
    }
  }

  /** @private */
  _drawPolarBear(ctx) {
    const bear = this._bear;
    const flipX = bear.dir < 0;
    let sprite = BEAR_SPRITES.walk0;
    let offsetY = 0;

    if (bear.mode === 'sprint') {
      const frame = Math.floor(bear.walkPhase) % 2;
      sprite = frame === 0 ? BEAR_SPRITES.sprint0 : BEAR_SPRITES.sprint1;
      offsetY = frame === 1 ? -1 : 0;
    } else if (bear.mode === 'chompOpen') {
      sprite = BEAR_SPRITES.chompOpen;
    } else if (bear.mode === 'chompSnap') {
      sprite = BEAR_SPRITES.chompSnap;
      offsetY = 1;
    } else if (bear.mode === 'chompLick') {
      sprite = BEAR_SPRITES.chompLick;
    } else if (bear.mode === 'grumble') {
      sprite = BEAR_SPRITES.grumble;
      offsetY = Math.floor(this._elapsed * 10) % 2 === 0 ? 0 : -1;
    } else {
      const walkFrames = [
        BEAR_SPRITES.walk0,
        BEAR_SPRITES.walk1,
        BEAR_SPRITES.walk2,
        BEAR_SPRITES.walk3,
      ];
      sprite = walkFrames[Math.floor(bear.walkPhase) % walkFrames.length];
    }

    const drawX = Math.round(bear.x - 14);
    const drawY = Math.round(FLOOR_Y - 17 + offsetY);

    // Crisp pixel ground shadow
    ctx.fillStyle = 'rgba(11, 22, 44, 0.32)';
    ctx.fillRect(Math.round(bear.x - 11), FLOOR_Y, 22, 2);

    drawSprite(ctx, sprite, BEAR_PALETTE, drawX, drawY, flipX);
  }

  /** @private */
  _drawParticles(ctx) {
    for (let i = 0; i < this._particles.length; i += 1) {
      const pt = this._particles[i];
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    }
  }

  /** @private */
  _drawSpeechBubble(ctx) {
    const bear = this._bear;
    if (!bear.bubbleText) return;

    const text = bear.bubbleText;
    const textW = text.length * 4 - 1;
    const padX = 4;
    const padY = 3;
    const boxW = textW + padX * 2;
    const boxH = 5 + padY * 2;

    // Keep bubble cleanly inside canvas bounds
    const cx = Math.max(boxW / 2 + 4, Math.min(CANVAS_W - boxW / 2 - 4, Math.round(bear.x)));
    const bx = Math.round(cx - boxW / 2);
    const by = FLOOR_Y - 34;

    // Crisp 1px pixel-art comic bubble border
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx + 1, by, boxW - 2, boxH);
    ctx.fillRect(bx, by + 1, boxW, boxH - 2);

    // White bubble interior
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 1, by + 1, boxW - 2, boxH - 2);

    // Pixel speech pointer tail
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 2, by + boxH, 5, 1);
    ctx.fillRect(cx - 1, by + boxH + 1, 3, 1);
    ctx.fillRect(cx, by + boxH + 2, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, by + boxH - 1, 3, 2);
    ctx.fillRect(cx, by + boxH + 1, 1, 1);

    drawPixelText(ctx, text, cx, by + padY, bear.bubbleColor, 1, true);
  }
}
