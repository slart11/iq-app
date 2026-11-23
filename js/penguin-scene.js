/**
 * Penguin Ice Bridge & Hungry Polar Bear Ice Cave (`ISHULEN`)
 *
 * Clean, warm, cluster-shaded pixel-art scene inspired by *Roots of Pacha* and
 * *Stardew Valley*:
 * - Logical resolution: 320 × 144 pixels (`imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`).
 * - ZERO Bayer/checkerboard dithering anywhere — every sky band, aurora ribbon,
 *   mountain facet, timber beam, ice block, crystal, and snowdrift uses clean,
 *   solid, harmonious colour clusters.
 * - ZERO procedural 3D normal-mapped blobs — all characters (`PENGUIN_SPRITES`
 *   14×16 and `BEAR_SPRITES` 36×22) are explicit, hand-authored ASCII pixel maps
 *   with selective outlines (`#232136`), readable cute faces, and distinct legs.
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM/window dependencies and can be imported directly in Node.js tests.
 */

const STYLE_ID = 'iq-penguin-arena-styles-pacha';
const W = 320;
const H = 144;

const BRIDGE_Y = 56; // penguin feet level on top of the bridge snow cushions
const DECK_BOTTOM = 65; // underside of the bridge deck
const FLOOR_Y = 128; // snow floor level inside ISHULEN where bear stands & penguins land
const GRAVITY = 380; // px/s² in 320×144 space
const BEAR_HOME_X = 68;
const SLOT_L = 46;
const SLOT_R = 274;

const LANTERNS = [
  { x: 25, y: 42, postX: 16, armDir: 1 },
  { x: 295, y: 42, postX: 304, armDir: -1 },
];

const CRYSTAL_CLUSTERS = [
  { x: 22, y: 118, dir: 1, scale: 1 },
  { x: 138, y: 121, dir: 1, scale: 0.85 },
  { x: 236, y: 121, dir: -1, scale: 0.85 },
  { x: 298, y: 117, dir: -1, scale: 1 },
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
   Warm Storybook Palette (Roots of Pacha / Stardew Valley — Zero Pure #000)
   ========================================================================== */

const PAL = {
  // Selective outlines
  outlinePlum: '#232136',
  outlineUmber: '#3a2624',

  // Twilight sky bands
  sky0: '#1d2038',
  sky1: '#272c4a',
  sky2: '#353e63',
  sky3: '#475580',

  // Smooth Aurora ribbons
  auroraMintHi: '#6ee7b7',
  auroraMintLo: '#34d399',
  auroraLavHi: '#c4b5fd',
  auroraLavLo: '#8b5cf6',

  // Moon & stars
  moonCream: '#fffbeb',
  moonGold: '#fde68a',
  starBlue: '#bae6fd',

  // Mountains
  mtnSnow: '#f8f5ec',
  mtnMid: '#9db1d0',
  mtnShadow: '#5a6d94',
  mtnDeep: '#3e4c6e',

  // Timber & lanterns
  woodDark: '#6e3b22',
  woodMid: '#9c5a34',
  woodHi: '#c98353',
  trapDark: '#7c4326',
  trapMid: '#a8623a',
  brass: '#fbbf24',
  flameCore: '#fffbeb',
  flameGold: '#fbbf24',
  flameAmber: '#f59e0b',

  // Ice blocks & snow cushions
  iceHi: '#e0f2fe',
  iceMid: '#7dd3fc',
  iceLo: '#38bdf8',
  iceDeep: '#0284c7',
  snowHi: '#faf6ed',
  snowMid: '#dce6f5',
  snowLo: '#aebfd9',

  // Cozy Ice Cave (ISHULEN)
  caveBg: '#1b1e33',
  caveArch0: '#262b47',
  caveArch1: '#333b5e',
  caveWall: '#3f4970',

  // Glowing mint-turquoise crystals
  crystalLo: '#2dd4bf',
  crystalMid: '#5eead4',
  crystalHi: '#ccfbf1',
};

const PENGUIN_PALETTE = {
  O: '#232136', // dark plum outline
  D: '#323854', // dark slate back
  B: '#4b5378', // blue-slate back highlight
  W: '#faf6ed', // creamy white belly
  S: '#cfd9ea', // soft belly shadow
  G: '#fbbf24', // golden-apricot ear/neck patch
  A: '#f59e0b', // warm amber chest fade
  K: '#ea580c', // coral-orange beak & feet
  E: '#1e1b2e', // eye
  H: '#ffffff', // 1px eye sparkle
};

const BEAR_PALETTE = {
  O: '#232136', // dark warm indigo outline
  W: '#faf6ed', // warm cream-white top fur highlight
  F: '#eef2f8', // main snow-white fur
  M: '#cbd6e8', // soft periwinkle mid-shadow cluster (neck/belly/haunch modeling)
  S: '#9bb0ce', // deeper blue-grey shadow for far-side legs & underbelly
  N: '#2b2130', // dark berry nose, eye & claws
  H: '#ffffff', // 1px eye & nose catchlight
  P: '#f43f5e', // pink open mouth / tongue
  T: '#ffffff', // teeth
};

/* ==========================================================================
   Hand-Crafted String-Grid Sprites
   - PENGUIN_SPRITES: every frame is 16 rows × 14 columns
   - BEAR_SPRITES: every frame is 22 rows × 36 columns
   ========================================================================== */

export const PENGUIN_SPRITES = {
  idle0: [
    '....OOOOOO....',
    '...ODDDDDDO...',
    '..ODDBBBBHEO..',
    '..ODGGGGEEEO..',
    '..ODGAAWWWKKO.',
    '..ODDWWWWWWKO.',
    '.ODDBWWWWWWDO.',
    '.ODDBWWWWWWDO.',
    '.ODDBWWWWWWDO.',
    '.ODDBSWWWWWDO.',
    '.ODDDSSWWWWDO.',
    '..ODDSSWWWDO..',
    '..ODDSSWWWDO..',
    '...ODSSSSDO...',
    '...OKKOOKKO...',
    '...OOOO.OOOO..',
  ],
  idle1: [
    '..............',
    '....OOOOOO....',
    '...ODDDDDDO...',
    '..ODDBBBBHEO..',
    '..ODGGGGEEEO..',
    '..ODGAAWWWKKO.',
    '.ODDBWWWWWWKO.',
    '.ODDBWWWWWWDO.',
    '.ODDBWWWWWWDO.',
    '.ODDBSWWWWWDO.',
    '.ODDDSSWWWWDO.',
    '..ODDSSWWWDO..',
    '..ODDSSWWWDO..',
    '...ODSSSSDO...',
    '...OKKOOKKO...',
    '...OOOO.OOOO..',
  ],
  blink: [
    '....OOOOOO....',
    '...ODDDDDDO...',
    '..ODDBBBBSSO..',
    '..ODGGGGOOOO..',
    '..ODGAAWWWKKO.',
    '..ODDWWWWWWKO.',
    '.ODDBWWWWWWDO.',
    '.ODDBWWWWWWDO.',
    '.ODDBWWWWWWDO.',
    '.ODDBSWWWWWDO.',
    '.ODDDSSWWWWDO.',
    '..ODDSSWWWDO..',
    '..ODDSSWWWDO..',
    '...ODSSSSDO...',
    '...OKKOOKKO...',
    '...OOOO.OOOO..',
  ],
  cheer: [
    '....OOOOOO....',
    '...ODDDDDDO...',
    '..ODDBBBBHEO..',
    '..ODGGGGEEEO..',
    'O.ODGAAWWWKKO.',
    'ODODDWWWWWWKOO',
    'ODBBBWWWWWWBDO',
    '.ODBBWWWWWWBO.',
    '..ODBWWWWWWDO.',
    '..ODBSWWWWWDO.',
    '..ODDSSWWWWDO.',
    '..ODDSSWWWDO..',
    '...ODSSSSDO...',
    '...OKKO.OKKO..',
    '...OOOO.OOOO..',
    '..............',
  ],
  panic: [
    '....OOOOOO....',
    '...ODDDDDDO...',
    '..ODDWWWWHEO..',
    '..ODGGGGHEEOO.',
    'O.ODGAAWWWKKKO',
    'ODODDWWWWWWOO.',
    'ODDBBWWWWWWKKO',
    '.ODBBWWWWWWDOO',
    '..ODBWWWWWWDO.',
    '..ODBSWWWWWDO.',
    '..ODDSSWWWWDO.',
    '..ODDSSWWWDO..',
    '...ODSSSSDO...',
    '..OKKO...OKKO.',
    '..OOOO...OOOO.',
    '..............',
  ],
  fall: [
    '..OO......OO..',
    '.ODDOOOOOODDO.',
    '.ODDDDDDDDDDO.',
    '..ODDBBBBHEO..',
    '..ODGGGGEEEO..',
    '..ODGAAWWWKKO.',
    '..ODBWWWWWWKO.',
    '..ODBWWWWWWDO.',
    '..ODBWWWWWWDO.',
    '..ODBSWWWWWDO.',
    '..ODDSSWWWWDO.',
    '...ODSSWWWDO..',
    '...ODSSSSDO...',
    '..OKKO...OKKO.',
    '..OOOO...OOOO.',
    '..............',
  ],
  landed: [
    '..............',
    '..............',
    '..............',
    '....OOOOOO....',
    '...ODDDDDDO...',
    '..ODDBBBBHEO..',
    '..ODGGGGEEEO..',
    '.OODGAAWWWKKO.',
    'ODDBBWWWWWWKOO',
    'ODDBBWWWWWWBDO',
    'ODDDSSWWWWWDDO',
    '.OOODSSSSSDOO.',
    '..OKKOOOOOKKO.',
    '..OOOO...OOOO.',
    '..............',
    '..............',
  ],
};

export const BEAR_SPRITES = {
  idle0: [
    '.......................OOOO...OOO...',
    '......................OWWWWO.OWFWO..',
    '............OOOOOOOOOOOWFFFWOOWFWO..',
    '........OOOOWWWWWWWWWWFFFFFFFFWWFO..',
    '......OOWWWWWWWWWWWWWFFFFFFFFFFFFOO.',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFHEO.',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFMMFFOO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFMMMFO..',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFMMMMO...',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFMO....',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMO....',
    '..OFFMMMMMFFFFMSSSSSSSSSSMFFFFMO....',
    '..OFFFFFFFMMOOOOOOOOOOOOOOFFFFFO....',
    '...OFFFFFOOO..OSSSSO.....OFFFFO.....',
    '...OFFFFFO....OSSSSO.....OFFFFO.....',
    '...OFFFFFO....OSSSSO.....OFFFFO.....',
    '...OFFFFFO....OSSSSO.....OFFFFO.....',
    '...OFFFFNNO...OSSSNNO....OFFFFNNO...',
    '...OOOOOOOO...OOOOOOO....OOOOOOOO...',
  ],
  idle1: [
    '....................................',
    '.......................OOOO...OOO...',
    '......................OWWWWO.OWFWO..',
    '............OOOOOOOOOOOWFFFWOOWFWO..',
    '........OOOOWWWWWWWWWWFFFFFFFFWWFO..',
    '......OOWWWWWWWWWWWWWFFFFFFFFFFFFOO.',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFHEO.',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFMMFFOO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFMMMFO..',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFMMMMO...',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFMO....',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMO....',
    '..OFFMMMMMFFFFMSSSSSSSSSSMFFFFMO....',
    '..OFFFFFFFMMOOOOOOOOOOOOOOFFFFFO....',
    '...OFFFFFOOO..OSSSSO.....OFFFFO.....',
    '...OFFFFFO....OSSSSO.....OFFFFO.....',
    '...OFFFFFO....OSSSSO.....OFFFFO.....',
    '...OFFFFNNO...OSSSNNO....OFFFFNNO...',
    '...OOOOOOOO...OOOOOOO....OOOOOOOO...',
  ],
  run0: [
    '........................OOOO...OOO..',
    '.......................OWWWWO.OWFWO.',
    '............OOOOOOOOOOOOWFFFWOOWFWO.',
    '........OOOOWWWWWWWWWWWFFFFFFFFWWFO.',
    '......OOWWWWWWWWWWWWWWFFFFFFFFFFFFOO',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFHEOO',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFMMFFOO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFMMMFO..',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFMMMMO...',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFMO....',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMO....',
    '..OFFMMMMMFFFFOOOOOOOOOOOOFFFFFMO...',
    '..OFFFFFMMOOOO...OSSSSO...OFFFFFMO..',
    '..OFFFFFOO........OSSSSO...OFFFFFMO.',
    '.OFFFFFO...........OSSSSO...OFFFFFO.',
    '.OFFFFNNO..........OSSSNNO...OFFFFFO',
    '.OOOOOOOO..........OOOOOOO....OFFFFO',
    '..............................OFFNNO',
    '..............................OOOOOO',
  ],
  run1: [
    '....................................',
    '........................OOOO...OOO..',
    '.......................OWWWWO.OWFWO.',
    '............OOOOOOOOOOOOWFFFWOOWFWO.',
    '........OOOOWWWWWWWWWWWFFFFFFFFWWFO.',
    '......OOWWWWWWWWWWWWWWFFFFFFFFFFFFOO',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFHEOO',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFMMFFOO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFMMMFO..',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFMMMMO...',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFMO....',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMO....',
    '..OFFMMMMMFFFFMSSSSSSSSSSMFFFFMO....',
    '...OFFFFFFMMOOOOOOOOOOOOOOFFFFO.....',
    '....OFFFFFOOO..OSSSSO...OFFFFO......',
    '.....OFFFFFO...OSSSSO..OFFFFO.......',
    '.....OFFFFNNO..OSSSNNO.OFFFFNNO.....',
    '.....OOOOOOOO..OOOOOOO.OOOOOOOO.....',
    '....................................',
  ],
  run2: [
    '........................OOOO...OOO..',
    '.......................OWWWWO.OWFWO.',
    '............OOOOOOOOOOOOWFFFWOOWFWO.',
    '........OOOOWWWWWWWWWWWFFFFFFFFWWFO.',
    '......OOWWWWWWWWWWWWWWFFFFFFFFFFFFOO',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFHEOO',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFMMFFOO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFMMMFO..',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFMMMMO...',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFMO....',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMO....',
    '..OFFMMMMMFFFFMSSSSSSSSSSMFFFFMO....',
    '..OFFFFFFFMMOOOOOOOOOOOOOOFFFFFO....',
    '..OSSSSOOFFFFFO........OSSSSOOFFFFO.',
    '.OSSSSO..OFFFFFO......OSSSSO..OFFFFO',
    '.OSSSNNO..OFFFFFO.....OSSSNNO.OFFFFO',
    '.OOOOOOO..OFFFFNNO....OOOOOOO.OFFNNO',
    '..........OOOOOOOO............OOOOOO',
    '....................................',
  ],
  run3: [
    '....................................',
    '.......................OOOO...OOO...',
    '......................OWWWWO.OWFWO..',
    '............OOOOOOOOOOOWFFFWOOWFWO..',
    '........OOOOWWWWWWWWWWFFFFFFFFWWFO..',
    '......OOWWWWWWWWWWWWWFFFFFFFFFFFFOO.',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFHEO.',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFMMFFOO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFMMMFO..',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFMMMMO...',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFMO....',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMO....',
    '..OFFMMMMMFFFFMSSSSSSSSSSMFFFFMO....',
    '...OFFFFFMMOOOOOOOOOOOOOOOFFFFO.....',
    '...OFFFFFO...OSSSSO.....OFFFFO......',
    '...OFFFFO....OSSSSO.....OFFFFO......',
    '...OFFNNO....OSSSNNO....OFFFFNNO....',
    '...OOOOOO....OOOOOOO....OOOOOOOO....',
    '....................................',
  ],
  chompOpen: [
    '.......................OOOO...OOO...',
    '......................OWWWWO.OWFWO..',
    '............OOOOOOOOOOOWFFFWOOWFWO..',
    '........OOOOWWWWWWWWWWFFFFFFFFWWFO..',
    '......OOWWWWWWWWWWWWWFFFFFFFFFFFFOO.',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFHEO.',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFTTTTTO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFPPPPPO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFFPPPPPO',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFFFTTTTTO',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFFFFFO.',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMMOO..',
    '..OFFMMMMMFFFFMSSSSSSSSSSMFFFFMO....',
    '..OFFFFFFFMMOOOOOOOOOOOOOOFFFFFO....',
    '...OFFFFFOOO..OSSSSO.....OFFFFFO....',
    '...OFFFFFO....OSSSSO......OFFFFO....',
    '...OFFFFFO....OSSSSO......OFFFFO....',
    '...OFFFFFO....OSSSSO......OFFFFO....',
    '...OFFFFNNO...OSSSNNO.....OFFFFNNO..',
    '...OOOOOOOO...OOOOOOO.....OOOOOOOO..',
  ],
  chompClosed: [
    '....................................',
    '.......................OOOO...OOO...',
    '......................OWWWWO.OWFWO..',
    '............OOOOOOOOOOOWFFFWOOWFWO..',
    '........OOOOWWWWWWWWWWFFFFFFFFWWFO..',
    '......OOWWWWWWWWWWWWWFFFFFFFFFFFFOO.',
    '.....OWWWWFFFFFFFFFFFFFFFFFFFFFFNNO.',
    '....OWWWFFFFFFFFFFFFFFFFFFFFFFFFNNOO',
    '...OWWFFFFFFFFFFFFFFFFFFFFFFFFFFWWNO',
    '..OOWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNO',
    '.OOWFFFFFFFFFFFFFFFFFFFFFFFFFFPPPFOO',
    '.OOFFFFFFFFFFFFFFFFFFFFFFFFFFMMMFO..',
    '..OFFFFFFFFFFFFFFFFFFFFFFFFFMMMMO...',
    '..OFFFFFFFFFFFMMMMMMMMMMMMMMFFMO....',
    '..OFFFMMMMFFFFMMMMMMMMMMMMFFFFMO....',
    '..OFFMMMMMFFFFMSSSSSSSSSSMFFFFMO....',
    '..OFFFFFFFMMOOOOOOOOOOOOOOFFFFFO....',
    '...OFFFFFOOO..OSSSSO.....OFFFFO.....',
    '...OFFFFFO....OSSSSO.....OFFFFO.....',
    '...OFFFFFO....OSSSSO.....OFFFFO.....',
    '...OFFFFNNO...OSSSNNO....OFFFFNNO...',
    '...OOOOOOOO...OOOOOOO....OOOOOOOO...',
  ],
};

/* ==========================================================================
   Pixel Font (5×5) for Clean Speech Bubbles ("NOM!", "GRRR!", "!")
   ========================================================================== */

const PIXEL_FONT = {
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  G: ['01111', '10000', '10111', '10001', '01111'],
  R: ['11110', '10001', '11110', '10010', '10001'],
  '!': ['1', '1', '1', '0', '1'],
};

/* ==========================================================================
   Small Utility Helpers
   ========================================================================== */

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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
  if (total <= 1) return 18;
  const step = (SLOT_R - SLOT_L) / (total - 1);
  return clamp(Math.floor(step - 5), 12, 18);
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  border: 2px solid #353e63;
  background: #1b1e33;
  box-shadow: 0 12px 28px rgba(15, 17, 32, 0.38);
}
.penguin-arena-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 320 / 144;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  background: #1b1e33;
}
.penguin-status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  padding: 0.5rem 0.875rem;
  background: #232136;
  color: #faf6ed;
  font-size: 0.875rem;
  font-weight: 600;
  border-top: 2px solid #353e63;
}
.penguin-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: #353e63;
  color: #faf6ed;
  font-variant-numeric: tabular-nums;
}
.penguin-status-pill[data-danger="true"] {
  background: #9f1239;
  color: #ffe4e6;
}
.penguin-status-note {
  color: #dce6f5;
  font-weight: 500;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
`;
  document.head.appendChild(style);
}

/* ==========================================================================
   Clean Pixel Drawing Primitives (No Checkerboard / No Anti-Aliased Blur)
   ========================================================================== */

/**
 * Fills an integer pixel rectangle on the 2D context.
 */
function fillRectPx(ctx, x, y, w, h, color) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
}

/**
 * Fills a solid pixel-art circle/ellipse using integer scanlines (smooth cluster, no dither).
 */
function fillEllipsePx(ctx, cx, cy, rx, ry, color) {
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const irx = Math.max(1, Math.round(rx));
  const iry = Math.max(1, Math.round(ry));
  ctx.fillStyle = color;
  for (let dy = -iry; dy <= iry; dy += 1) {
    const ny = dy / (iry + 0.35);
    const span = Math.floor(irx * Math.sqrt(Math.max(0, 1 - ny * ny)));
    if (span >= 0) {
      ctx.fillRect(icx - span, icy + dy, span * 2 + 1, 1);
    }
  }
}

/**
 * Draws a hand-authored string-grid sprite anchored at bottom-center `(cx, bottomY)`.
 */
function drawStringSprite(ctx, grid, palette, cx, bottomY, flipX = false) {
  const rows = grid.length;
  const cols = grid[0].length;
  const x0 = Math.round(cx - cols / 2);
  const y0 = Math.round(bottomY - rows);

  for (let r = 0; r < rows; r += 1) {
    const rowStr = grid[r];
    const py = y0 + r;
    if (py < 0 || py >= H) continue;

    let runColor = null;
    let runStart = 0;
    for (let c = 0; c <= cols; c += 1) {
      const ch = c < cols ? rowStr[flipX ? cols - 1 - c : c] : '.';
      const color = ch === '.' ? null : palette[ch] || null;
      if (color !== runColor) {
        if (runColor !== null) {
          ctx.fillStyle = runColor;
          ctx.fillRect(x0 + runStart, py, c - runStart, 1);
        }
        runColor = color;
        runStart = c;
      }
    }
  }
}

/**
 * Draws a cozy pixel speech bubble with a 1px dark plum outline and crisp 5×5 pixel font.
 */
function drawSpeechBubble(ctx, text, cx, cy, bgColor, borderColor, textColor) {
  let textW = 0;
  for (const ch of text) {
    const g = PIXEL_FONT[ch];
    textW += (g ? g[0].length : 2) + 1;
  }
  textW = Math.max(1, textW - 1);

  const padX = 4;
  const padY = 3;
  const bw = textW + padX * 2;
  const bh = 5 + padY * 2;
  const x0 = clamp(Math.round(cx - bw / 2), 4, W - bw - 4);
  const y0 = clamp(Math.round(cy - bh), 4, H - bh - 6);

  // Drop shadow
  fillRectPx(ctx, x0 + 1, y0 + 2, bw, bh - 2, PAL.outlinePlum);
  fillRectPx(ctx, x0 + 2, y0 + 1, bw - 2, bh, PAL.outlinePlum);

  // Outer plum outline (rounded corners)
  fillRectPx(ctx, x0 + 1, y0, bw - 2, bh, PAL.outlinePlum);
  fillRectPx(ctx, x0, y0 + 1, bw, bh - 2, PAL.outlinePlum);

  // Inner warm border & fill
  fillRectPx(ctx, x0 + 1, y0 + 1, bw - 2, bh - 2, borderColor);
  fillRectPx(ctx, x0 + 2, y0 + 2, bw - 4, bh - 4, bgColor);

  // Little speech pointer tail
  const tx = clamp(Math.round(cx), x0 + 4, x0 + bw - 5);
  fillRectPx(ctx, tx - 1, y0 + bh, 3, 2, PAL.outlinePlum);
  fillRectPx(ctx, tx, y0 + bh - 1, 1, 2, bgColor);

  // Glyphs
  ctx.fillStyle = textColor;
  let cursorX = x0 + padX;
  const cursorY = y0 + padY;
  for (const ch of text) {
    const g = PIXEL_FONT[ch];
    if (!g) {
      cursorX += 3;
      continue;
    }
    for (let r = 0; r < 5; r += 1) {
      const row = g[r];
      for (let c = 0; c < row.length; c += 1) {
        if (row[c] === '1') {
          ctx.fillRect(cursorX + c, cursorY + r, 1, 1);
        }
      }
    }
    cursorX += g[0].length + 1;
  }
}

/* ==========================================================================
   Mountain Ridge Geometry (2-Layer Stylized Faceted Peaks)
   ========================================================================== */

const FAR_MOUNTAINS = [
  { x0: -10, peakX: 34, peakY: 22, x1: 86 },
  { x0: 56, peakX: 108, peakY: 16, x1: 164 },
  { x0: 132, peakX: 184, peakY: 24, x1: 238 },
  { x0: 204, peakX: 256, peakY: 15, x1: 312 },
  { x0: 274, peakX: 314, peakY: 25, x1: 342 },
];

const NEAR_MOUNTAINS = [
  { x0: -8, peakX: 54, peakY: 27, x1: 118 },
  { x0: 84, peakX: 146, peakY: 21, x1: 212 },
  { x0: 176, peakX: 232, peakY: 26, x1: 292 },
  { x0: 254, peakX: 298, peakY: 29, x1: 336 },
];

/* ==========================================================================
   PenguinArena — 320 × 144 Cluster-Shaded Pixel-Art Controller
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

    this._particles = [];
    this._pawprints = [];
    this._penguins = [];
    this._trapdoors = [];
    this._stars = this._createStars();
    this._flakes = this._createSnowflakes();
    this._icicles = this._createIcicles();
    this._caveStalactites = this._createCaveStalactites();
    this._bear = this._createInitialBear();
    this._shakeTimer = 0;

    this._canvas = null;
    this._ctx = null;
    this._statusPill = null;
    this._statusNote = null;

    ensureArenaStyles();
    this._buildDom();
    this.reset(totalPenguins);
    this._startLoop();
  }

  /** @private */
  _createInitialBear() {
    return {
      x: BEAR_HOME_X,
      dir: 1, // 1 = facing right, -1 = facing left
      mode: 'wait', // 'wait' | 'watch' | 'sprint' | 'chompOpen' | 'chompClosed' | 'grumble'
      modeTimer: 0,
      targetIndex: null,
      targetX: null,
      runTime: 0,
      blinkCooldown: 2.4,
      blinkTimer: 0,
      breathTimer: 1.5,
      dustTimer: 0,
      pawprintCooldown: 0,
      pawSide: 0,
      bubbleText: null,
      bubbleTimer: 0,
    };
  }

  /**
   * Resets all penguins onto the bridge, closes trapdoors, and places the bear at home on the left.
   * @param {number} [totalPenguins]
   */
  reset(totalPenguins = this._state ? this._state.total : 10) {
    this._clearTimers();
    this._state = createPenguinState(totalPenguins);
    this._particles = [];
    this._pawprints = [
      { x: 42, y: FLOOR_Y + 3, life: 999 },
      { x: 52, y: FLOOR_Y + 5, life: 999 },
      { x: 61, y: FLOOR_Y + 3, life: 999 },
    ];
    this._shakeTimer = 0;

    const total = this._state.total;
    const doorW = getTrapdoorWidth(total);

    this._penguins = [];
    this._trapdoors = [];
    for (let i = 0; i < total; i += 1) {
      const slotX = getSlotX(i, total);
      this._trapdoors.push({
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
        blinkCooldown: 1.4 + seededRand(i * 29 + 7) * 3.5,
        blinkTimer: 0,
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
   * 1. Trapdoor swings open
   * 2. Penguin panics briefly (220ms)
   * 3. Penguin falls straight down with gravity and lands on the snow floor (`landed` sprite + snow puff)
   * 4. ONLY AFTER landing, the polar bear gallops over (`run0..run3`) to the fallen penguin
   * 5. Bear chomps (`chompOpen` → `chompClosed` + snow/feather burst + `"NOM!"` bubble)
   * 6. Bear stands still waiting right where it is, facing remaining penguins
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
      bear.x = clamp(targetX - bear.dir * 18, 28, W - 28);
      bear.mode = 'chompClosed';
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
      this._spawnSnowBurst(targetX, BRIDGE_Y + 3, 6);
    }

    if (penguin) {
      penguin.status = 'panic';
      penguin.timer = 0.22; // 220ms brief panic before falling
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
   * Correct answer: remaining penguins hop and cheer, the bear grumbles.
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
        p.timer = 0.72;
        this._spawnSparkles(p.x, BRIDGE_Y - 17);
      }
    }

    const bear = this._bear;
    if (bear.mode === 'wait' || bear.mode === 'grumble') {
      bear.mode = 'grumble';
      bear.modeTimer = 0.95;
      this._setBubble('GRRR!', 0.95);
      if (!reduced) {
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
      }, 900);
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
  _createStars() {
    const stars = [];
    for (let i = 0; i < 34; i += 1) {
      const x = 10 + Math.floor(seededRand(i * 3 + 1) * (W - 20));
      const y = 3 + Math.floor(seededRand(i * 3 + 2) * 32);
      // Keep stars clear of the crescent moon around (266, 15)
      if (Math.hypot(x - 266, y - 15) < 16) continue;
      stars.push({
        x,
        y,
        cross: i % 6 === 0,
        phase: seededRand(i * 5 + 3) * Math.PI * 2,
        speed: 1.2 + seededRand(i * 7 + 4) * 1.8,
      });
    }
    return stars;
  }

  /** @private */
  _createSnowflakes() {
    const flakes = [];
    for (let i = 0; i < 36; i += 1) {
      const front = i >= 24;
      flakes.push({
        x: seededRand(i * 7 + 1) * W,
        y: seededRand(i * 7 + 2) * H,
        speed: front ? 15 + seededRand(i * 7 + 3) * 8 : 7 + seededRand(i * 7 + 3) * 5,
        drift: front ? 6 : 3,
        phase: seededRand(i * 7 + 4) * Math.PI * 2,
        front,
      });
    }
    return flakes;
  }

  /** @private */
  _createIcicles() {
    const list = [];
    for (let x = 34; x <= 286; x += 9) {
      const len = 3 + Math.floor(seededRand(x * 13) * 5);
      list.push({ x, len });
    }
    return list;
  }

  /** @private */
  _createCaveStalactites() {
    const list = [];
    for (let x = 18; x <= 302; x += 16) {
      const len = 5 + Math.floor(seededRand(x * 19 + 3) * 8);
      const w = 3 + Math.floor(seededRand(x * 7 + 2) * 3);
      list.push({ x, len, w });
    }
    return list;
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
     Clean Cluster Particle Emitters
     ------------------------------------------------------------------------ */

  /** @private */
  _addParticle(p) {
    if (this._particles.length < 180) {
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
        x: x + (Math.random() - 0.5) * 8,
        y: y - 1,
        vx: side * (14 + r * 38),
        vy: -18 - r * 34,
        g: 120,
        size: r < 0.45 ? 2 : 1,
        life: 0.38 + r * 0.25,
        max: 0.65,
        color: i % 3 === 0 ? PAL.snowMid : PAL.snowHi,
        floor: FLOOR_Y + 2,
      });
    }
  }

  /** @private */
  _spawnLandingPuff(x, y) {
    this._spawnSnowBurst(x, y, 12);
    for (let i = -1; i <= 1; i += 1) {
      this._addParticle({
        kind: 'puff',
        x: x + i * 4,
        y: y - 2,
        vx: i * 12,
        vy: -5,
        g: 0,
        r: 2,
        life: 0.4,
        max: 0.4,
        color: PAL.snowHi,
      });
    }
  }

  /** @private */
  _spawnChompBurst(x, y) {
    this._spawnSnowBurst(x, y, 14);
    const featherColors = [
      PENGUIN_PALETTE.D,
      PENGUIN_PALETTE.W,
      PENGUIN_PALETTE.G,
      PENGUIN_PALETTE.B,
    ];
    for (let i = 0; i < 10; i += 1) {
      const ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const sp = 22 + Math.random() * 42;
      this._addParticle({
        kind: 'feather',
        x: x + (Math.random() - 0.5) * 8,
        y: y - 5,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 12,
        g: 28,
        sway: Math.random() * Math.PI * 2,
        life: 0.85 + Math.random() * 0.4,
        max: 1.25,
        color: featherColors[i % featherColors.length],
      });
    }
  }

  /** @private */
  _spawnSparkles(x, y) {
    const colors = [PAL.moonGold, PAL.moonCream, PAL.crystalMid];
    for (let i = 0; i < 4; i += 1) {
      this._addParticle({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 14,
        vy: -12 - Math.random() * 16,
        g: 10,
        life: 0.5 + Math.random() * 0.25,
        max: 0.75,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnBreath(heavy = false) {
    const b = this._bear;
    const snoutX = b.x + b.dir * 17;
    const snoutY = FLOOR_Y - 14;
    const count = heavy ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      this._addParticle({
        kind: 'puff',
        x: snoutX + b.dir * (i * 2),
        y: snoutY - i,
        vx: b.dir * (heavy ? 14 + i * 5 : 6 + i * 3),
        vy: -5 - i * 2,
        g: 0,
        r: heavy ? 2 : 1,
        life: 0.75,
        max: 0.75,
        color: PAL.snowMid,
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

      if (p.blinkTimer > 0) {
        p.blinkTimer = Math.max(0, p.blinkTimer - dt);
      } else {
        p.blinkCooldown -= dt;
        if (p.blinkCooldown <= 0) {
          p.blinkTimer = 0.13;
          p.blinkCooldown = 2.0 + Math.random() * 3.8;
        }
      }

      if (p.status === 'idle' || p.status === 'cheer') {
        const dx = bear.x - p.x;
        if (Math.abs(dx) > 16) {
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
          p.vy = 18;
        }
      } else if (p.status === 'falling') {
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = 0;
          p.status = 'landed';
          p.landedTimer = 0;
          this._spawnLandingPuff(p.x, FLOOR_Y);
          this._shakeTimer = Math.max(this._shakeTimer, 0.08);
        }
      } else if (p.status === 'landed') {
        p.landedTimer += dt;
      }
    }

    // Polar bear choreography
    this._updatePolarBear(dt);

    // Particles
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
        pt.x += Math.sin(t * 5 + pt.sway) * 10 * dt;
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

    if (bear.blinkTimer > 0) {
      bear.blinkTimer = Math.max(0, bear.blinkTimer - dt);
    } else {
      bear.blinkCooldown -= dt;
      if (bear.blinkCooldown <= 0) {
        bear.blinkTimer = 0.14;
        bear.blinkCooldown = 2.4 + Math.random() * 3.4;
      }
    }

    if (bear.mode === 'wait' || bear.mode === 'watch') {
      bear.breathTimer -= dt;
      if (bear.breathTimer <= 0) {
        this._spawnBreath(false);
        bear.breathTimer = bear.mode === 'watch' ? 1.2 : 2.3;
      }
    }

    const { landed, airborne } = this._findActiveDropTarget();

    if (bear.mode === 'wait') {
      // Polar bear stands still waiting (does NOT patrol back and forth!)
      this._aimBearTowardRemaining();
      if (landed) {
        if (landed.landedTimer >= 0.1) {
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
      // Watches falling penguin; starts galloping ONLY AFTER penguin has landed!
      const focus = landed || airborne;
      if (!focus) {
        bear.mode = 'wait';
      } else {
        bear.targetIndex = focus.index;
        bear.targetX = focus.x;
        if (Math.abs(focus.x - bear.x) > 6) {
          bear.dir = focus.x >= bear.x ? 1 : -1;
        }
        if (landed && landed.landedTimer >= 0.1) {
          this._beginBearSprint(landed);
        }
      }
    } else if (bear.mode === 'sprint') {
      const target = (bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null) || landed;
      if (!target || target.status === 'eaten') {
        bear.mode = 'wait';
        return;
      }
      const stopDist = 17;
      const dx = target.x - bear.x;
      const dist = Math.abs(dx);
      bear.dir = dx >= 0 ? 1 : -1;
      bear.runTime += dt;

      bear.dustTimer -= dt;
      if (bear.dustTimer <= 0) {
        this._spawnSnowBurst(bear.x - bear.dir * 11, FLOOR_Y, 3);
        bear.dustTimer = 0.09;
      }

      bear.pawprintCooldown -= dt;
      if (bear.pawprintCooldown <= 0) {
        bear.pawSide = 1 - bear.pawSide;
        this._pawprints.push({
          x: Math.round(bear.x - bear.dir * 8),
          y: FLOOR_Y + 2 + bear.pawSide * 2,
          life: 10,
        });
        if (this._pawprints.length > 26) {
          this._pawprints.shift();
        }
        bear.pawprintCooldown = 0.11;
      }

      if (dist <= stopDist) {
        bear.mode = 'chompOpen';
        bear.modeTimer = 0.16;
        bear.targetIndex = target.index;
      } else {
        const step = Math.min(dist - stopDist + 1, 165 * dt);
        bear.x = clamp(bear.x + bear.dir * step, 24, W - 24);
      }
    } else if (bear.mode === 'chompOpen') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        const target = bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null;
        const burstX = target ? target.x : bear.x + bear.dir * 17;
        if (target && target.status !== 'eaten') {
          target.status = 'eaten';
        }
        bear.mode = 'chompClosed';
        bear.modeTimer = 0.52;
        this._setBubble('NOM!', 1.15);
        this._shakeTimer = 0.18;
        this._spawnChompBurst(burstX, FLOOR_Y - 5);
      }
    } else if (bear.mode === 'chompClosed') {
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
    this._spawnSnowBurst(bear.x - bear.dir * 10, FLOOR_Y, 5);
  }

  /* ------------------------------------------------------------------------
     Rendering Pipeline (320 × 144 Cluster-Shaded Scene)
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
      shakeX = Math.round((Math.random() * 2 - 1) * 1.5);
      shakeY = Math.round((Math.random() * 2 - 1) * 1.5);
    }

    ctx.save();
    if (shakeX || shakeY) {
      ctx.translate(shakeX, shakeY);
    }

    // 1. Twilight sky bands + softly curved horizon steps
    this._drawTwilightSky(ctx);

    // 2. Smooth curved Aurora ribbons (2-tone mint & lavender)
    this._drawAuroraRibbons(ctx, t);

    // 3. Clean crescent moon & crisp 1px / 3×3 cross stars
    this._drawMoonAndStars(ctx, t);

    // 4. Stylized 2-layer snow-capped mountains with crisp ridge shading
    this._drawMountains(ctx);

    // 5. Background snowflakes
    this._drawSnowflakes(ctx, false);

    // 6. Cozy Ice Cave (ISHULEN, y = 65..144)
    this._drawIceCave(ctx, t);

    // 7. Cozy Timber & Ice Bridge (y = 56..65) + trapdoors + hanging lanterns
    this._drawTimberIceBridge(ctx, t);

    // 8. Emperor Penguins (14×16 hand-crafted sprites)
    this._drawPenguins(ctx, t);

    // 9. Polar Bear (36×22 hand-crafted sprites)
    this._drawPolarBear(ctx, t);

    // 10. Particles & foreground snowflakes
    this._drawParticles(ctx);
    this._drawSnowflakes(ctx, true);

    // 11. Speech bubbles ("NOM!", "GRRR!")
    this._drawBearSpeechBubble(ctx);

    ctx.restore();
  }

  /** @private */
  _drawTwilightSky(ctx) {
    // Clean horizontal bands with softly curved horizon steps (NO checkerboard!)
    fillRectPx(ctx, 0, 0, W, 14, PAL.sky0);
    fillRectPx(ctx, 0, 14, W, 13, PAL.sky1);
    fillRectPx(ctx, 0, 27, W, 13, PAL.sky2);
    fillRectPx(ctx, 0, 40, W, 18, PAL.sky3);

    // Soft curved horizon steps at band transitions
    for (let x = 0; x < W; x += 8) {
      const curve = Math.round(Math.sin(x * 0.022) * 2);
      fillRectPx(ctx, x, 13 + curve, 8, 2, PAL.sky1);
      fillRectPx(ctx, x, 26 + curve, 8, 2, PAL.sky2);
      fillRectPx(ctx, x, 39 + curve, 8, 2, PAL.sky3);
    }
  }

  /** @private */
  _drawAuroraRibbons(ctx, t) {
    // Ribbon 1: Warm lavender wave in upper sky (clean solid pixel bands)
    for (let x = 18; x < 244; x += 2) {
      const env = Math.sin(((x - 18) / 226) * Math.PI);
      const thickness = Math.round(env * 5);
      if (thickness <= 0) continue;
      const y = Math.round(
        13 + Math.sin(x * 0.035 + t * 0.45) * 3.5 + Math.cos(x * 0.02 - t * 0.3) * 2
      );
      const hiH = Math.max(1, Math.ceil(thickness * 0.45));
      fillRectPx(ctx, x, y, 2, thickness, PAL.auroraLavLo);
      fillRectPx(ctx, x, y + thickness - hiH, 2, hiH, PAL.auroraLavHi);
    }

    // Ribbon 2: Soft mint ribbon sweeping across twilight sky
    for (let x = 52; x < 304; x += 2) {
      const env = Math.sin(((x - 52) / 252) * Math.PI);
      const thickness = Math.round(env * 6);
      if (thickness <= 0) continue;
      const y = Math.round(
        21 + Math.sin(x * 0.028 - t * 0.5) * 4 + Math.sin(x * 0.05 + t * 0.35) * 1.8
      );
      const hiH = Math.max(1, Math.ceil(thickness * 0.5));
      fillRectPx(ctx, x, y, 2, thickness, PAL.auroraMintLo);
      fillRectPx(ctx, x, y + thickness - hiH, 2, hiH, PAL.auroraMintHi);
    }
  }

  /** @private */
  _drawMoonAndStars(ctx, t) {
    // Crisp 1px and 3×3 cross stars
    for (let i = 0; i < this._stars.length; i += 1) {
      const s = this._stars[i];
      const twinkle = Math.sin(t * s.speed + s.phase);
      if (s.cross) {
        fillRectPx(ctx, s.x, s.y, 1, 1, PAL.moonCream);
        if (twinkle > -0.2) {
          fillRectPx(ctx, s.x - 1, s.y, 1, 1, PAL.starBlue);
          fillRectPx(ctx, s.x + 1, s.y, 1, 1, PAL.starBlue);
          fillRectPx(ctx, s.x, s.y - 1, 1, 1, PAL.starBlue);
          fillRectPx(ctx, s.x, s.y + 1, 1, 1, PAL.starBlue);
        }
      } else {
        fillRectPx(ctx, s.x, s.y, 1, 1, twinkle > 0.1 ? PAL.moonCream : PAL.starBlue);
      }
    }

    // Clean crescent moon (#fffbeb with #fde68a inner crescent shadow)
    const mx = 266;
    const my = 15;
    fillEllipsePx(ctx, mx, my, 7, 7, PAL.moonGold);
    fillEllipsePx(ctx, mx - 1, my, 6, 6, PAL.moonCream);
    // Carve clean sky-coloured crescent cutout on top-right
    fillEllipsePx(ctx, mx + 3, my - 2, 5, 5, PAL.sky0);
  }

  /** @private */
  _drawMountains(ctx) {
    const baseY = BRIDGE_Y;

    // Layer 1: Far mountains
    for (const m of FAR_MOUNTAINS) {
      this._drawMountainPeak(ctx, m.x0, m.peakX, m.peakY, m.x1, baseY, true);
    }

    // Layer 2: Near mountains
    for (const m of NEAR_MOUNTAINS) {
      this._drawMountainPeak(ctx, m.x0, m.peakX, m.peakY, m.x1, baseY, false);
    }
  }

  /** @private */
  _drawMountainPeak(ctx, x0, peakX, peakY, x1, baseY, isFar) {
    const height = baseY - peakY;
    if (height <= 0) return;

    const leftColor = isFar ? PAL.mtnMid : PAL.mtnSnow;
    const midColor = isFar ? PAL.mtnShadow : PAL.mtnMid;
    const rightColor = isFar ? PAL.mtnDeep : PAL.mtnShadow;

    for (let y = peakY; y < baseY; y += 1) {
      const frac = (y - peakY) / height;
      const lx = Math.round(lerp(peakX, x0, frac));
      const rx = Math.round(lerp(peakX, x1, frac));
      // Jagged ridge line stepping slightly right then left
      const ridgeOffset = Math.round(Math.sin((y - peakY) * 0.35) * 2 + frac * 3);
      const ridgeX = clamp(peakX + ridgeOffset, lx + 1, rx - 1);

      // Sunlit left face
      fillRectPx(ctx, lx, y, ridgeX - lx, 1, leftColor);

      // Soft periwinkle mid-tone transition strip near ridge & snowcap
      const midW = Math.max(1, Math.round((rx - ridgeX) * (frac < 0.38 ? 0.55 : 0.28)));
      fillRectPx(ctx, ridgeX, y, midW, 1, midColor);

      // Slate-blue right shadow face
      if (ridgeX + midW < rx) {
        fillRectPx(ctx, ridgeX + midW, y, rx - (ridgeX + midW), 1, rightColor);
      }
    }
  }

  /** @private */
  _drawIceCave(ctx, t) {
    // 1. Warm dark indigo cave backdrop (y = 65..144)
    fillRectPx(ctx, 0, DECK_BOTTOM, W, H - DECK_BOTTOM, PAL.caveBg);

    // 2. Clean layered stone/ice arches in background
    const arches = [
      { cx: 56, rx: 48, ry: 48 },
      { cx: 160, rx: 62, ry: 52 },
      { cx: 264, rx: 48, ry: 48 },
    ];
    // Outer arch layer (#262b47)
    fillRectPx(ctx, 0, DECK_BOTTOM, W, 62, PAL.caveArch0);
    for (const a of arches) {
      fillEllipsePx(ctx, a.cx, FLOOR_Y, a.rx, a.ry, PAL.caveBg);
    }

    // Inner arch rim & pillars (#333b5e)
    for (const pxCol of [0, 104, 214, 306]) {
      fillRectPx(ctx, pxCol, DECK_BOTTOM, 14, FLOOR_Y - DECK_BOTTOM, PAL.caveArch0);
      fillRectPx(ctx, pxCol + 2, DECK_BOTTOM, 10, FLOOR_Y - DECK_BOTTOM, PAL.caveArch1);
    }

    // Side rock walls framing ISHULEN
    for (let y = DECK_BOTTOM; y < FLOOR_Y; y += 2) {
      const step = Math.round(Math.sin(y * 0.14) * 3);
      fillRectPx(ctx, 0, y, 16 + step, 2, PAL.caveArch1);
      fillRectPx(ctx, 0, y, 9 + step, 2, PAL.caveWall);
      fillRectPx(ctx, W - 16 - step, y, 16 + step, 2, PAL.caveArch1);
      fillRectPx(ctx, W - 9 - step, y, 9 + step, 2, PAL.caveWall);
    }

    // Clean ceiling stalactites under the bridge
    for (const st of this._caveStalactites) {
      for (let dy = 0; dy < st.len; dy += 1) {
        const w = Math.max(1, Math.round(st.w * (1 - dy / st.len)));
        const x = Math.round(st.x - w / 2);
        fillRectPx(ctx, x, DECK_BOTTOM + dy, w, 1, dy < 2 ? PAL.caveArch0 : PAL.caveArch1);
      }
    }

    // 3. Hand-pixelated glowing mint-turquoise crystal clusters
    for (let i = 0; i < CRYSTAL_CLUSTERS.length; i += 1) {
      const c = CRYSTAL_CLUSTERS[i];
      this._drawCrystalCluster(ctx, c.x, c.y, c.dir, t, i);
    }

    // 4. Clean 3-tone snow floor (y = 124..144)
    // Periwinkle base (#aebfd9)
    fillRectPx(ctx, 0, 124, W, H - 124, PAL.snowLo);
    // Soft blue-white mid (#dce6f5)
    fillRectPx(ctx, 0, 124, W, 11, PAL.snowMid);
    // Creamy top highlight (#faf6ed) with gentle rounded snowdrift steps
    fillRectPx(ctx, 0, 124, W, 5, PAL.snowHi);
    for (let x = 0; x < W; x += 6) {
      const mound = Math.round(Math.sin(x * 0.045) * 1.5);
      fillRectPx(ctx, x, 124 + mound, 6, 3, PAL.snowHi);
      fillRectPx(ctx, x, 127 + mound, 6, 4, PAL.snowMid);
    }

    // Cute 3-pixel pawprints on the snow floor
    for (let i = 0; i < this._pawprints.length; i += 1) {
      const pp = this._pawprints[i];
      fillRectPx(ctx, pp.x, pp.y, 2, 1, PAL.snowLo);
      fillRectPx(ctx, pp.x - 1, pp.y - 1, 1, 1, PAL.mtnMid);
      fillRectPx(ctx, pp.x + 2, pp.y - 1, 1, 1, PAL.mtnMid);
    }
  }

  /** @private */
  _drawCrystalCluster(ctx, cx, cy, dir, t, idx) {
    // Soft translucent mint glow halo (clean circle, NO checkerboard!)
    const pulse = 0.08 + 0.03 * Math.sin(t * 2.2 + idx * 1.5);
    fillEllipsePx(ctx, cx, cy - 5, 13, 9, `rgba(94, 234, 212, ${pulse.toFixed(3)})`);

    // 3 angled crystal shards per cluster
    const shards = [
      { ox: -3 * dir, h: 10, w: 3, lean: -1 * dir },
      { ox: 0, h: 14, w: 4, lean: 1 * dir },
      { ox: 4 * dir, h: 8, w: 3, lean: 2 * dir },
    ];
    for (const sh of shards) {
      for (let dy = 0; dy < sh.h; dy += 1) {
        const frac = dy / sh.h;
        const w = dy > sh.h - 3 ? Math.max(1, sh.w - (dy - (sh.h - 3))) : sh.w;
        const sx = Math.round(cx + sh.ox + frac * sh.lean - w / 2);
        const sy = cy - dy;
        fillRectPx(ctx, sx, sy, w, 1, PAL.crystalLo);
        if (w >= 2) {
          fillRectPx(ctx, sx, sy, Math.ceil(w * 0.6), 1, PAL.crystalMid);
        }
        if (dy >= sh.h - 3) {
          fillRectPx(ctx, sx, sy, 1, 1, PAL.crystalHi);
        }
      }
    }
  }

  /** @private */
  _drawTimberIceBridge(ctx, t) {
    // 1. Warm honey-cedar vertical support beams & lantern posts on left and right
    for (const L of LANTERNS) {
      const px = L.postX;
      // Post outline
      fillRectPx(ctx, px - 3, 35, 6, FLOOR_Y - 35, PAL.outlineUmber);
      // Main cedar timber post
      fillRectPx(ctx, px - 2, 36, 4, FLOOR_Y - 36, PAL.woodDark);
      fillRectPx(ctx, px - 1, 36, 2, FLOOR_Y - 36, PAL.woodMid);
      fillRectPx(ctx, px - 1, 36, 1, FLOOR_Y - 36, PAL.woodHi);

      // Horizontal lantern cross-arm
      const armX = L.armDir > 0 ? px + 2 : px - 10;
      fillRectPx(ctx, armX, 37, 9, 4, PAL.outlineUmber);
      fillRectPx(ctx, armX + 1, 38, 7, 2, PAL.woodMid);
      fillRectPx(ctx, armX + 1, 38, 7, 1, PAL.woodHi);

      // Diagonal timber brace under bridge deck
      for (let k = 0; k < 14; k += 1) {
        const bx = px + L.armDir * (2 + k);
        const by = DECK_BOTTOM + 12 - k;
        fillRectPx(ctx, bx, by, 3, 3, PAL.woodDark);
        fillRectPx(ctx, bx, by, 2, 2, PAL.woodMid);
      }
    }

    // Continuous honey-cedar under-beam spanning the bridge (`y = 62..65`)
    fillRectPx(ctx, 14, 62, W - 28, 4, PAL.outlineUmber);
    fillRectPx(ctx, 15, 63, W - 30, 2, PAL.woodDark);
    fillRectPx(ctx, 15, 63, W - 30, 1, PAL.woodMid);

    // Build lookup of open trapdoors so we leave gaps in the ice deck where open
    const isOpenGap = (x) => {
      for (let i = 0; i < this._trapdoors.length; i += 1) {
        const d = this._trapdoors[i];
        if (d.angle > 8 && x >= d.x0 && x < d.x0 + d.w) {
          return true;
        }
      }
      return false;
    };

    // 2. Clean beveled ice blocks (`y = 57..62`) topped with creamy snow cushions (`y = 54..57`)
    const blockWidth = 16;
    for (let bx = 20; bx < 300; bx += blockWidth) {
      for (let dx = 0; dx < blockWidth; dx += 1) {
        const x = bx + dx;
        if (isOpenGap(x)) continue;

        const isSeam = dx === 0 || dx === blockWidth - 1;
        // Ice block body
        fillRectPx(ctx, x, 57, 1, 5, isSeam ? PAL.iceDeep : PAL.iceMid);
        if (!isSeam) {
          fillRectPx(ctx, x, 57, 1, 2, PAL.iceHi);
          fillRectPx(ctx, x, 61, 1, 1, PAL.iceLo);
        }

        // Rounded creamy snow cushion on top of the ice block
        const edgeInset = dx === 0 || dx === blockWidth - 1 ? 1 : 0;
        fillRectPx(ctx, x, 54 + edgeInset, 1, 2, PAL.snowHi);
        fillRectPx(ctx, x, 56, 1, 1, PAL.snowMid);
      }
    }

    // 3. Crisp icicles hanging along the bridge underside
    for (const ic of this._icicles) {
      if (isOpenGap(ic.x)) continue;
      for (let dy = 0; dy < ic.len; dy += 1) {
        const w = dy < 2 ? 2 : 1;
        const color = dy === 0 ? PAL.iceHi : dy < ic.len - 1 ? PAL.iceMid : PAL.iceLo;
        fillRectPx(ctx, ic.x, DECK_BOTTOM + dy, w, 1, color);
      }
    }

    // 4. Hinged wooden trapdoors (`#7c4326`, `#a8623a`, `#fbbf24` brass hinge)
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const d = this._trapdoors[i];
      if (d.angle <= 2) {
        // Closed trapdoor: warm timber plank set into the bridge with brass hinge & snow cushion
        fillRectPx(ctx, d.x0, 57, d.w, 6, PAL.outlineUmber);
        fillRectPx(ctx, d.x0 + 1, 58, d.w - 2, 4, PAL.trapDark);
        fillRectPx(ctx, d.x0 + 1, 58, d.w - 2, 2, PAL.trapMid);
        // Brass hinge pin on left
        fillRectPx(ctx, d.x0 + 1, 59, 2, 2, PAL.brass);
        // Creamy snow cushion resting on closed door
        fillRectPx(ctx, d.x0 + 1, 54, d.w - 2, 2, PAL.snowHi);
        fillRectPx(ctx, d.x0 + 1, 56, d.w - 2, 1, PAL.snowMid);
      } else {
        // Open trapdoor swinging down from the left brass hinge
        const rad = (d.angle * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const hx = d.x0 + 1;
        const hy = 61;
        for (let u = 0; u < d.w; u += 1) {
          const px = Math.round(hx + u * cosA);
          const py = Math.round(hy + u * sinA);
          fillRectPx(ctx, px - 1, py - 1, 4, 4, PAL.outlineUmber);
          fillRectPx(ctx, px, py, 2, 2, u % 4 === 0 ? PAL.trapDark : PAL.trapMid);
        }
        // Brass hinge pin
        fillRectPx(ctx, hx, hy - 1, 2, 2, PAL.brass);
      }
    }

    // 5. Cute hanging iron lanterns casting soft concentric translucent warm golden circles
    for (let i = 0; i < LANTERNS.length; i += 1) {
      const L = LANTERNS[i];
      const pulse = Math.round(Math.sin(t * 5 + i * 2));

      // Smooth concentric warm golden glow circles (NO checkerboard!)
      fillEllipsePx(ctx, L.x, L.y + 3, 24 + pulse, 18 + pulse, 'rgba(253, 224, 71, 0.07)');
      fillEllipsePx(ctx, L.x, L.y + 3, 13 + pulse, 10 + pulse, 'rgba(253, 224, 71, 0.14)');

      // Hanging chain & iron cap
      fillRectPx(ctx, L.x, 39, 1, 2, PAL.outlinePlum);
      fillRectPx(ctx, L.x - 2, 41, 5, 1, PAL.outlinePlum);

      // Lantern glass housing
      fillRectPx(ctx, L.x - 2, 42, 5, 5, PAL.outlinePlum);
      fillRectPx(ctx, L.x - 1, 42, 3, 4, PAL.flameAmber);
      fillRectPx(ctx, L.x - 1, 43, 3, 2, PAL.flameGold);
      fillRectPx(ctx, L.x, 43, 1, 2, PAL.flameCore);

      // Iron base
      fillRectPx(ctx, L.x - 2, 46, 5, 1, PAL.outlinePlum);
    }
  }

  /** @private */
  _drawPenguins(ctx, t) {
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      let frameName = 'idle0';
      let yOffset = 0;
      let xOffset = 0;

      if (p.status === 'idle') {
        const breathStep = Math.sin(t * 3.2 + p.phase) > 0.35;
        frameName = p.blinkTimer > 0 ? 'blink' : breathStep ? 'idle1' : 'idle0';
      } else if (p.status === 'cheer') {
        if (p.cheerDelay <= 0) {
          const el = 0.72 - p.timer;
          yOffset = -Math.round(Math.abs(Math.sin((el * Math.PI) / 0.36)) * 4);
          frameName = 'cheer';
        }
      } else if (p.status === 'panic') {
        frameName = 'panic';
        xOffset = Math.floor(t * 28) % 2 === 0 ? -1 : 1;
      } else if (p.status === 'falling') {
        frameName = 'fall';
      } else if (p.status === 'landed') {
        frameName = 'landed';
      }

      const drawX = Math.round(p.x + xOffset);
      const drawY = Math.round(p.y + yOffset);

      // Soft contact shadow under feet
      if (p.status === 'idle' || p.status === 'cheer') {
        fillRectPx(ctx, drawX - 4, BRIDGE_Y, 8, 1, PAL.snowLo);
      } else if (p.status === 'landed') {
        fillRectPx(ctx, drawX - 5, FLOOR_Y, 10, 1, PAL.snowLo);
      }

      // PENGUIN_SPRITES face RIGHT by default; flip when facing left
      const grid = PENGUIN_SPRITES[frameName] || PENGUIN_SPRITES.idle0;
      drawStringSprite(ctx, grid, PENGUIN_PALETTE, drawX, drawY, p.facingDir < 0);

      // Cute alert badge "!" when panicking or freshly landed
      if (p.status === 'panic' || (p.status === 'landed' && Math.floor(t * 6) % 2 === 0)) {
        drawSpeechBubble(
          ctx,
          '!',
          drawX,
          drawY - 17,
          PAL.moonCream,
          PAL.flameGold,
          PAL.outlinePlum
        );
      }
    }
  }

  /** @private */
  _drawPolarBear(ctx, t) {
    const b = this._bear;
    let frameName = 'idle0';

    if (b.mode === 'sprint') {
      const cycle = ['run0', 'run1', 'run2', 'run3'];
      const idx = Math.floor(b.runTime * 14) % cycle.length;
      frameName = cycle[idx];
    } else if (b.mode === 'chompOpen') {
      frameName = 'chompOpen';
    } else if (b.mode === 'chompClosed') {
      frameName = 'chompClosed';
    } else if (b.mode === 'grumble') {
      frameName = Math.floor(t * 8) % 2 === 0 ? 'chompOpen' : 'chompClosed';
    } else {
      // 'wait' or 'watch': gentle breathing idle frame swap & occasional blink
      if (b.blinkTimer > 0) {
        frameName = 'chompClosed';
      } else {
        frameName = Math.sin(t * 2.4) > 0.25 ? 'idle1' : 'idle0';
      }
    }

    const drawX = Math.round(b.x);
    const drawY = FLOOR_Y;

    // Ground shadow cluster on the snow floor
    fillRectPx(ctx, drawX - 14, FLOOR_Y, 28, 2, PAL.snowLo);

    // BEAR_SPRITES face RIGHT by default; flip horizontally when dir < 0
    const grid = BEAR_SPRITES[frameName] || BEAR_SPRITES.idle0;
    drawStringSprite(ctx, grid, BEAR_PALETTE, drawX, drawY, b.dir < 0);
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
      } else if (pt.kind === 'feather') {
        fillRectPx(ctx, x, y, 2, 1, pt.color);
        fillRectPx(ctx, x + 1, y + 1, 1, 1, pt.color);
      } else if (pt.kind === 'spark') {
        fillRectPx(ctx, x, y, 1, 1, pt.color);
        if (pt.life / pt.max > 0.45) {
          fillRectPx(ctx, x - 1, y, 3, 1, pt.color);
          fillRectPx(ctx, x, y - 1, 1, 3, pt.color);
        }
      } else if (pt.kind === 'puff') {
        const r = Math.max(1, Math.round(pt.r * (pt.life / pt.max)));
        fillEllipsePx(ctx, x, y, r, r, pt.color);
      }
    }
  }

  /** @private */
  _drawBearSpeechBubble(ctx) {
    const b = this._bear;
    if (!b.bubbleText) return;
    const bx = clamp(Math.round(b.x + b.dir * 14), 24, W - 24);
    const by = FLOOR_Y - 25;
    drawSpeechBubble(
      ctx,
      b.bubbleText,
      bx,
      by,
      PAL.moonCream,
      PAL.flameGold,
      PAL.outlinePlum
    );
  }
}
