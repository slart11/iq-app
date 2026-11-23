/**
 * Penguin Ramp & Hungry Polar Bear Ice Cave — 16-bit SNES/Celeste-Grade Pixel-Art Canvas Engine.
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM/window dependencies and can be imported directly in Node.js unit tests.
 * `PenguinArena` renders and animates a rich 400×176 retro pixel-art scene on HTML5 <canvas>.
 */

const STYLE_ID = 'iq-penguin-arena-styles';
const CANVAS_W = 400;
const CANVAS_H = 176;
const RAMP_Y = 66;
const RAMP_H = 10;
const CAVE_TOP = RAMP_Y + RAMP_H; // 76
const FLOOR_Y = 152;

/* 4×4 Bayer ordered dithering threshold matrix (0..15) */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

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
   Pixel-Art Palettes, Hero Sprites & Bitmap Font
   ========================================================================== */

const PENGUIN_PALETTE = {
  K: '#0a1020', // crisp dark outline
  D: '#162036', // deep navy plumage
  M: '#293a59', // mid slate plumage
  L: '#5b78a3', // cool moonlight rim highlight
  W: '#ffffff', // pure bright belly
  C: '#e2e8f0', // soft off-white belly
  S: '#94a3b8', // cool belly shadow
  E: '#090d16', // eye pupil
  H: '#ffffff', // eye catchlight
  P: '#fb7185', // rosy cheek
  O: '#ea580c', // deep orange beak/feet
  A: '#f97316', // warm orange beak/feet
  Y: '#fde047', // sunlit beak/feet highlight
  R: '#e11d48', // open squawk mouth
};

/** 16×18 pixel-art penguin sprites (every row strictly 16 chars, 18 rows each) */
const PENGUIN_SPRITES = {
  idle0: [
    '.....KKKKKK.....',
    '....KLLMMMMK....',
    '...KLMDDDDDMK...',
    '...KMDDDDDDDK...',
    '..KMDHWEKHWEDK..',
    '..KMDEEEKDEEDK..',
    '..KDPWWYYWWPDK..',
    '..KDDWWAAWWDDK..',
    '.KKDDWWWWWWDDKK.',
    '.KMDDCWWWWCCDMK.',
    'KMDDCCWWWWCCDDMK',
    'KMDDCCWWWWCCDDMK',
    '.KKDCCWWWWCCDK..',
    '..KDSCCCCCCSDK..',
    '..KKSSSSSSSSKK..',
    '...KKO....OKK...',
    '..KAAY....YAAK..',
    '..KKKK....KKKK..',
  ],
  idle1: [
    '.....KKKKKK.....',
    '....KLLMMMMK....',
    '...KLMDDDDDMK...',
    '...KMDDDDDDDK...',
    '..KMDHWEKHWEDK..',
    '..KMDEEEKDEEDK..',
    '..KDPWWYYWWPDK..',
    '..KDDWWAAWWDDK..',
    '.KKDDWWWWWWDDKK.',
    'KMDDCCWWWWCCDDMK',
    'KMDDCCWWWWCCDDMK',
    '.KKDCCWWWWCCDK..',
    '..KDCCWWWWCCDK..',
    '..KDSCCCCCCSDK..',
    '..KKSSSSSSSSKK..',
    '..KKO......OKK..',
    '.KAAY......KKK..',
    '.KKKK...........',
  ],
  blink: [
    '.....KKKKKK.....',
    '....KLLMMMMK....',
    '...KLMDDDDDMK...',
    '...KMDDDDDDDK...',
    '..KMDDDDDDDDDK..',
    '..KMKKDKDKKDDK..',
    '..KDPWWYYWWPDK..',
    '..KDDWWAAWWDDK..',
    '.KKDDWWWWWWDDKK.',
    '.KMDDCWWWWCCDMK.',
    'KMDDCCWWWWCCDDMK',
    'KMDDCCWWWWCCDDMK',
    '.KKDCCWWWWCCDK..',
    '..KDSCCCCCCSDK..',
    '..KKSSSSSSSSKK..',
    '...KKO....OKK...',
    '..KAAY....YAAK..',
    '..KKKK....KKKK..',
  ],
  nervous: [
    '.....KKKKKK.....',
    '....KLLMMMMK....',
    '...KLMDDDDDMK...',
    '...KMDDDDDDDK...',
    '..KMDWWWKWWWDK..',
    '..KMDWEWKDWEWK..',
    '..KDPWWYYWWPDK..',
    '..KDDWWAAWWDDK..',
    '.KKDDWWWWWWDDKK.',
    '.KMDDCWWWWCCDMK.',
    'KMDDCCWWWWCCDDMK',
    'KMDDCCWWWWCCDDMK',
    '.KKDCCWWWWCCDK..',
    '..KDSCCCCCCSDK..',
    '..KKSSSSSSSSKK..',
    '...KKO....OKK...',
    '..KAAY....YAAK..',
    '..KKKK....KKKK..',
  ],
  cheer: [
    '.....KKKKKK.....',
    '....KLLMMMMK....',
    'KK.KLMDDDDDMK.KK',
    'KMKMDDDDDDDDKMK.',
    'KMDKMKKDKDKKDMK.',
    '.KKDPWWYYWWPDKK.',
    '..KDDWWAAWWDDK..',
    '..KDDWWWWWWDDK..',
    '..KDDCWWWWCCDK..',
    '..KDDCWWWWCCDK..',
    '..KDDCWWWWCCDK..',
    '..KDSCCCCCCSDK..',
    '..KKSSSSSSSSKK..',
    '...KKO....OKK...',
    '...KYY....YYK...',
    '...KKK....KKK...',
    '................',
    '................',
  ],
  panic: [
    '.....KKKKKK.....',
    '....KLLMMMMK....',
    '...KLMDDDDDMK...',
    '..KMDDWWWWDDMK..',
    '..KMDWHEKHWEWK..',
    'KKKMDWYYRRYWDKKK',
    'KMDDDWAAOOWDDDMK',
    'KMDDCCWWWWCCDDMK',
    '.KKDCCWWWWCCDK..',
    '..KDDCWWWWCCDK..',
    '..KDDCWWWWCCDK..',
    '..KDSCCCCCCSDK..',
    '..KKSSSSSSSSKK..',
    '..KKO......OKK..',
    '..KYY......YYK..',
    '..KKK......KKK..',
    '................',
    '................',
  ],
  fall0: [
    '..KKKK....KKKK..',
    '..KAAY....YAAK..',
    '...KKO....OKK...',
    '..KKSSSSSSSSKK..',
    '..KDSCCCCCCSDK..',
    '.KKDCCWWWWCCDK..',
    'KMDDCCWWWWCCDDMK',
    'KMDDCCWWWWCCDDMK',
    '.KKDDWWWWWWDDKK.',
    '..KDDWWAAWWDDK..',
    '..KDPWWRRWWPDK..',
    '..KMDHWEKHWEDK..',
    '..KMDDWWWWDDDK..',
    '...KLMDDDDDMK...',
    '....KLLMMMMK....',
    '.....KKKKKK.....',
    '................',
    '................',
  ],
  fall1: [
    '................',
    '....KKKKKK......',
    '...KAAOOKK......',
    '..KKSSSSSSKK....',
    '.KDDCCCCCCDDK...',
    'KMDDWWWWWWDDMK..',
    'KMDDWWWWWWDDDMK.',
    'KMDDWWAAOOWDDMK.',
    '.KKDWWYRRWWDDK..',
    '..KDMWHEKHWEDK..',
    '..KDMDDDDDDDMK..',
    '...KKLMDDDDMK...',
    '....KKLLMMKK....',
    '......KKKK......',
    '................',
    '................',
    '................',
    '................',
  ],
  fall2: [
    '................',
    '......KKKKKK....',
    '......KKOOAAK...',
    '....KKSSSSSSKK..',
    '...KDDCCCCCCDDK.',
    '..KMDDWWWWWWDDMK',
    '.KMDDDWWWWWWDDMK',
    '..KMDDWOOAAWDDMK',
    '..KDDWWRRYWWDKK.',
    '..KDEWHKEHWMDK..',
    '..KMDDDDDDDMDK..',
    '...KMDDDDMLKK...',
    '....KKMMLLKK....',
    '......KKKK......',
    '................',
    '................',
    '................',
    '................',
  ],
};

const BEAR_PALETTE = {
  K: '#0f172a', // crisp dark outline
  W: '#ffffff', // pure sunlit rim highlight
  F: '#f1f5f9', // primary bright white fur
  B: '#cbd5e1', // cool mid-tone fur shade
  S: '#94a3b8', // deep shadow & far legs
  D: '#64748b', // darkest crevice / underbelly
  N: '#0f172a', // nose, eye, claws
  G: '#e0f2fe', // nose specular glint
  M: '#e11d48', // open mouth interior
  R: '#9f1239', // deep mouth shadow
  P: '#fda4af', // pink tongue & inner ear
  T: '#ffffff', // sharp white fangs
  Q: '#38bdf8', // icy drool / breath shine
};

/** 42×26 hero pixel-art polar bear sprites (facing RIGHT by default, strictly 42×26) */
const BEAR_SPRITES = {
  walk0: [
    '...........................KKKK...........',
    '..........................KFPBWK..........',
    '..........KKKKKKKKKKKKKKKKWWWWWWKK........',
    '.......KKKWWWWWWWWWWWWWWWWWWWWFFFFKK......',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFFWK.....',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFFFNFKK...',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFNFWWK..',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFNNNNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFBNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBFFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK...',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK....',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBK.....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBK......',
    '..KBBBBBKKSSSSSSSSK..KSSSSSSSSKBBBBK......',
    '..KBBBBK..KSSSSSSK....KSSSSSSK.KBBBK......',
    '.KBBBBK...KSSSSSK......KSSSSSK..KBBBK.....',
    '.KBBBBK...KSSSSK........KSSSSK..KBBBK.....',
    '.KBBBK....KSSSK..........KSSSK...KBBBK....',
    '.KFFFK....KSSSK..........KSSSK...KFFFK....',
    '.KFFFK....KNNNK..........KNNNK...KFFFK....',
    '.KNNNK....KKKKK..........KKKKK...KNNNK....',
    '.KNNNK............................KNNNK...',
    '..KKKK.............................KKKK...',
    '..........................................',
  ],
  walk1: [
    '...........................KKKK...........',
    '..........KKKKKKKKKKKKKK..KFPBWK..........',
    '.......KKKWWWWWWWWWWWWWWKKWWWWWWKK........',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFKK......',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFFFWK.....',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFNFKK...',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFNFWWK..',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFNNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBNNNK.',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBFKK..',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK...',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBBK....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBBK.....',
    '...KBBBBBKKSSSSSSSSKKSSSSSSSSKBBBBBK......',
    '...KBBBBK..KSSSSSSK..KSSSSSSK.KBBBBK......',
    '...KBBBBK..KSSSSSK....KSSSSSK.KBBBBK......',
    '...KBBBBK..KSSSSK......KSSSSK.KBBBBK......',
    '...KBBBK...KSSSK........KSSSK..KBBBK......',
    '...KFFFK...KSSSK........KSSSK..KFFFK......',
    '...KFFFK...KNNNK........KNNNK..KFFFK......',
    '...KNNNK...KKKKK........KKKKK..KNNNK......',
    '...KNNNK.......................KNNNK......',
    '....KKKK........................KKKK......',
    '..........................................',
    '..........................................',
  ],
  walk2: [
    '...........................KKKK...........',
    '..........................KFPBWK..........',
    '..........KKKKKKKKKKKKKKKKWWWWWWKK........',
    '.......KKKWWWWWWWWWWWWWWWWWWWWFFFFKK......',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFFWK.....',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFFFNFKK...',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFNFWWK..',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFNNNNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFBNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBFFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK...',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK....',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBK.....',
    '...KBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBK......',
    '....KBBBBKKSSSSSSSSK..KSSSSSSSSKBBBK......',
    '.....KBBBBK.KSSSSSK....KSSSSSK.KBBBK......',
    '.....KBBBBK.KSSSSK......KSSSSK.KBBBK......',
    '.....KBBBK..KSSSK........KSSSK..KBBBK.....',
    '.....KFFFK..KSSSK........KSSSK..KFFFK.....',
    '.....KFFFK..KNNNK........KNNNK..KFFFK.....',
    '.....KNNNK..KKKKK........KKKKK..KNNNK.....',
    '.....KNNNK.......................KNNNK....',
    '......KKKK........................KKKK....',
    '..........................................',
    '..........................................',
  ],
  walk3: [
    '...........................KKKK...........',
    '..........KKKKKKKKKKKKKK..KFPBWK..........',
    '.......KKKWWWWWWWWWWWWWWKKWWWWWWKK........',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFKK......',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFFFWK.....',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFNFKK...',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFNFWWK..',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFNNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBNNNK.',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBFKK..',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK...',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBBK....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBBK.....',
    '...KBBBBBKKSSSSSSSSKKSSSSSSSSKBBBBBK......',
    '...KBBBBK.KSSSSSSK....KSSSSSSK.KBBBK......',
    '...KBBBBK.KSSSSSK......KSSSSSK.KBBBK......',
    '...KBBBBK..KSSSSK......KSSSSK..KBBBK......',
    '...KBBBK...KSSSK........KSSSK..KBBBK......',
    '...KFFFK...KSSSK........KSSSK..KFFFK......',
    '...KFFFK...KNNNK........KNNNK..KFFFK......',
    '...KNNNK...KKKKK........KKKKK..KNNNK......',
    '...KNNNK.......................KNNNK......',
    '....KKKK........................KKKK......',
    '..........................................',
    '..........................................',
  ],
  sprint0: [
    '.............................KKKK.........',
    '............................KFPBWK........',
    '...........KKKKKKKKKKKKKKKKKWWWWWWKK......',
    '.......KKKKWWWWWWWWWWWWWWWWWWWWFFFFFKK....',
    '....KKKWWWWWFFFFFFFFFFFFFFFFFFFFFFFFWWK...',
    '..KKWWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFWNFKK..',
    '.KWWWFFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFNFWWK.',
    'KWWFFBBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    'KWFBBBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFNNNNK.',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBTTRMMMMK.',
    '..KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBRMPMMMMK.',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSBBBBBTQMMMMK..',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDBBBBBKQQKKK...',
    '.KBBBBBK..KKKKKKKKKKKKKKKK..KBBBBBK.......',
    'KBBBBBK...KSSSSSK....KSSSSSK.KBBBBBK......',
    'KBBBBK...KSSSSSK......KSSSSSK.KBBBBBK.....',
    'KFFFK...KSSSSK..........KSSSSK.KFFFFK.....',
    'KNNNK...KNNNK............KNNNK.KNNNNK.....',
    '.KKKK...KKKKK............KKKKK..KKKK......',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
  ],
  sprint1: [
    '..........................................',
    '.............................KKKK.........',
    '...........KKKKKKKKKKKKKKK..KFPBWK........',
    '.......KKKKWWWWWWWWWWWWWWWKKWWWWWWKK......',
    '....KKKWWWWWFFFFFFFFFFFFFFFFFFFFFFFFKK....',
    '..KKWWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFWWK...',
    '.KWWWFFBBBBFFFFFFFFFFFFFFFFFFFFFFFFWNFKK..',
    'KWWFFBBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFNFWWK.',
    '.KKBBBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFFNGNK.',
    '..KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBNNNNK.',
    '..KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBTTRMMMMK.',
    '...KBBBBBBSSSSSSSSSSSSSSSSSSBBBBBRMPMMMMK.',
    '...KBBBBBBDDDDDDDDDDDDDDDDDDBBBBBTQKKKKK..',
    '....KBBBBKKSSSSSSSSKKSSSSSSSSKBBBBK.......',
    '.....KBBBBK.KSSSSSK..KSSSSSK.KBBBBK.......',
    '......KBBBK.KSSSSK....KSSSSK.KBBBK........',
    '......KFFFK..KNNNK....KNNNK..KFFFK........',
    '......KNNNK..KKKKK....KKKKK..KNNNK........',
    '.......KKKK...................KKKK........',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
  ],
  sprint2: [
    '.............................KKKK.........',
    '............................KFPBWK........',
    '..........KKKKKKKKKKKKKKKKKKWWWWWWKK......',
    '......KKKKWWWWWWWWWWWWWWWWWWWWWFFFFFKK....',
    '...KKKWWWWWFFFFFFFFFFFFFFFFFFFFFFFFFWWK...',
    '.KKWWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFWNFKK..',
    'KWWWFFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFFNFWWK.',
    'KWFBBBBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    '.KKBBBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFNNNNK.',
    '..KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBTTRMMMMK.',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSBBBBBRMPMMMMK.',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDBBBBBTQMMMMK..',
    '..KBBBBBK.KKKKKKKKKKKKKKKKKKKBBBBKQQKKK...',
    '.KBBBBBK..KSSSSSK....KSSSSSK..KBBBBK......',
    'KBBBBK....KSSSSK......KSSSSK...KBBBBK.....',
    'KFFFK....KSSSSK........KSSSSK...KFFFK.....',
    'KNNNK....KNNNK..........KNNNK...KNNNK.....',
    '.KKKK....KKKKK..........KKKKK....KKKK.....',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
    '..........................................',
  ],
  chompOpen: [
    '.........................KKKK.............',
    '........................KFPBWK...KKKK.....',
    '.........KKKKKKKKKKKKKKKWWWWWWKKKFFFNNK...',
    '......KKKWWWWWWWWWWWWWWWWWWWWFFFFFFFNGNK..',
    '....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFFFFNNNNK.',
    '...KWWWFFFFFFFFFFFFFFFFFFFFFFFFWNFKTTNNNK.',
    '..KWWFFFFFFFFFFFFFFFFFFFFFFFFFFWNFKRRMMMK.',
    '.KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFBRRRMMMMK.',
    'KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFBPRPPMMMMK.',
    'KWFBBBBBBBBBBBBFFFFFFFFFFFFFFFFBPRPPMMMK..',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBTRMMMMMK..',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBTTFFFFK...',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBKKKKK....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBK......',
    '..KBBBBBKKSSSSSSSSK..KSSSSSSSSKBBBBK......',
    '..KBBBBK..KSSSSSSK....KSSSSSSK.KBBBK......',
    '..KBBBBK..KSSSSSK......KSSSSSK.KBBBK......',
    '..KBBBBK..KSSSSK........KSSSSK.KBBBK......',
    '..KBBBK...KSSSK..........KSSSK..KBBBK.....',
    '..KFFFK...KSSSK..........KSSSK..KFFFK.....',
    '..KFFFK...KNNNK..........KNNNK..KFFFK.....',
    '..KNNNK...KKKKK..........KKKKK..KNNNK.....',
    '..KNNNK..........................KNNNK....',
    '...KKKK...........................KKKK....',
    '..........................................',
    '..........................................',
  ],
  chompSnap: [
    '..........................................',
    '..........................................',
    '...........................KKKK...........',
    '..........................KFPBWK..........',
    '..........KKKKKKKKKKKKKKKKWWWWWWKK........',
    '.......KKKWWWWWWWWWWWWWWWWWWWWFFFFKK......',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFFWK.....',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFFNNFKK...',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNFWWK..',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFNNNNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFBNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK...',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK....',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBK.....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBK......',
    '..KBBBBBKKSSSSSSSSK..KSSSSSSSSKBBBBK......',
    '..KBBBBK..KSSSSSSK....KSSSSSSK.KBBBK......',
    '..KBBBBK..KSSSSSK......KSSSSSK.KBBBK......',
    '..KFFFK...KSSSK..........KSSSK..KFFFK.....',
    '..KFFFK...KNNNK..........KNNNK..KFFFK.....',
    '..KNNNK...KKKKK..........KKKKK..KNNNK.....',
    '...KKKK..........................KKKK.....',
    '..........................................',
    '..........................................',
  ],
  chompChew: [
    '..........................................',
    '...........................KKKK...........',
    '..........................KFPBWK..........',
    '..........KKKKKKKKKKKKKKKKWWWWWWKK........',
    '.......KKKWWWWWWWWWWWWWWWWWWWWFFFFKK......',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFFWK.....',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFFNNFKK...',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNFWWK..',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFNNNNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFMNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBMMFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK...',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK....',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBK.....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBK......',
    '..KBBBBBKKSSSSSSSSK..KSSSSSSSSKBBBBK......',
    '..KBBBBK..KSSSSSSK....KSSSSSSK.KBBBK......',
    '..KBBBBK..KSSSSSK......KSSSSSK.KBBBK......',
    '..KFFFK...KSSSK..........KSSSK..KFFFK.....',
    '..KFFFK...KNNNK..........KNNNK..KFFFK.....',
    '..KNNNK...KKKKK..........KKKKK..KNNNK.....',
    '..KNNNK..........................KNNNK....',
    '...KKKK...........................KKKK....',
    '..........................................',
    '..........................................',
  ],
  chompLick: [
    '...........................KKKK...........',
    '..........................KFPBWK..........',
    '..........KKKKKKKKKKKKKKKKWWWWWWKK........',
    '.......KKKWWWWWWWWWWWWWWWWWWWWFFFFKK......',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFFFFWK.....',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFFNNFKK...',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNFWWK..',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFPPPFNNNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFPMMPBNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBPMMPFFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKKBBBK...',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK....',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBK.....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBK......',
    '..KBBBBBKKSSSSSSSSK..KSSSSSSSSKBBBBK......',
    '..KBBBBK..KSSSSSSK....KSSSSSSK.KBBBK......',
    '..KBBBBK..KSSSSSK......KSSSSSK.KBBBK......',
    '..KBBBBK..KSSSSK........KSSSSK.KBBBK......',
    '..KFFFK...KSSSK..........KSSSK..KFFFK.....',
    '..KFFFK...KNNNK..........KNNNK..KFFFK.....',
    '..KNNNK...KKKKK..........KKKKK..KNNNK.....',
    '..KNNNK..........................KNNNK....',
    '...KKKK...........................KKKK....',
    '..........................................',
    '..........................................',
  ],
  grumble: [
    '...........................KKKK...........',
    '..........................KFPBWK..........',
    '..........KKKKKKKKKKKKKKKKWWWWWWKK........',
    '.......KKKWWWWWWWWWWWWWWWWWWWWFFFFKK......',
    '.....KKWWWWWFFFFFFFFFFFFFFFFFFFFNNFWK.....',
    '....KWWWFFFFFFFFFFFFFFFFFFFFFFFFFNNNFKK...',
    '...KWWFFFFFFFFFFFFFFFFFFFFFFFFFFFFNNFWWK..',
    '..KWWFBBBBFFFFFFFFFFFFFFFFFFFFFFFFFFFNGNK.',
    '.KWWFFBBBBBBBFFFFFFFFFFFFFFFFFFFFFFFNNNNK.',
    'KWWFFBBBBBBBBBBBBFFFFFFFFFFFFFFFFFFFBNNNK.',
    'KWFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKKFKK..',
    'KFFBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKBBBK...',
    '.KKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK....',
    '..KBBBBBBSSSSSSSSSSSSSSSSSSSSBBBBBBBK.....',
    '..KBBBBBBDDDDDDDDDDDDDDDDDDDDDBBBBBK......',
    '..KBBBBBKKSSSSSSSSK..KSSSSSSSSKBBBBK......',
    '..KBBBBK..KSSSSSSK....KSSSSSSK..KBBBK.....',
    '..KBBBBK..KSSSSSK......KSSSSSK...KBBBK....',
    '..KBBBBK..KSSSSK........KSSSSK...KFFFK....',
    '..KFFFK...KSSSK..........KSSSK...KNNNK....',
    '..KFFFK...KNNNK..........KNNNK....KKKK....',
    '..KNNNK...KKKKK..........KKKKK............',
    '..KNNNK...................................',
    '...KKKK...................................',
    '..........................................',
    '..........................................',
  ],
};

/** 3×5 crisp pixel bitmap font for cave signage and comic badges */
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
   Sprite Span Compiler & Pixel-Art Helpers
   ========================================================================== */

/**
 * Compiles a string-grid sprite into horizontal run-length spans for fast, crisp rendering.
 * @param {string[]} grid
 * @param {Record<string, string>} palette
 */
function compileSprite(grid, palette) {
  const height = grid.length;
  const width = height > 0 ? grid[0].length : 0;
  const spans = [];

  for (let r = 0; r < height; r += 1) {
    const row = grid[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      if (ch === '.' || !palette[ch]) {
        c += 1;
        continue;
      }
      const color = palette[ch];
      const start = c;
      while (c < row.length && row[c] === ch) {
        c += 1;
      }
      spans.push({ x: start, y: r, w: c - start, color });
    }
  }
  return { width, height, spans };
}

const COMPILED_PENGUINS = Object.fromEntries(
  Object.entries(PENGUIN_SPRITES).map(([k, grid]) => [k, compileSprite(grid, PENGUIN_PALETTE)])
);

const COMPILED_BEARS = Object.fromEntries(
  Object.entries(BEAR_SPRITES).map(([k, grid]) => [k, compileSprite(grid, BEAR_PALETTE)])
);

/**
 * Draws a pre-compiled pixel-art sprite at integer coordinates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ width: number, height: number, spans: Array<{x:number,y:number,w:number,color:string}> }} sprite
 * @param {number} x
 * @param {number} y
 * @param {boolean} [flipX=false]
 * @param {string | null} [flashColor=null]
 */
function drawCompiledSprite(ctx, sprite, x, y, flipX = false, flashColor = null) {
  const ox = Math.round(x);
  const oy = Math.round(y);
  const { width, spans } = sprite;

  for (let i = 0; i < spans.length; i += 1) {
    const sp = spans[i];
    ctx.fillStyle = flashColor || sp.color;
    const px = flipX ? ox + (width - sp.x - sp.w) : ox + sp.x;
    ctx.fillRect(px, oy + sp.y, sp.w, 1);
  }
}

/**
 * Draws crisp 3×5 bitmap pixel text.
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
 * Draws a Bayer-dithered radial glow halo at integer pixels.
 */
function drawDitheredHalo(ctx, cx, cy, radius, color, maxAlpha = 0.45) {
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  const r2 = radius * radius;

  ctx.fillStyle = color;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const py = ry + dy;
    if (py < 0 || py >= CANVAS_H) continue;
    const by = ((py % 4) + 4) % 4;
    for (let dx = -radius; dx <= radius; dx += 1) {
      const px = rx + dx;
      if (px < 0 || px >= CANVAS_W) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const falloff = 1 - Math.sqrt(d2) / radius;
      const strength = falloff * falloff * maxAlpha * 16;
      const bx = ((px % 4) + 4) % 4;
      if (strength > BAYER_4X4[by][bx]) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
}

/**
 * Computes evenly distributed X coordinates on the 400px wide ramp for `total` slots.
 */
function getSlotX(index, total) {
  if (total <= 1) {
    return 200;
  }
  const left = 44;
  const right = 356;
  const step = (right - left) / (total - 1);
  return Math.round(left + index * step);
}

/**
 * Computes trapdoor width that fits neatly between adjacent slots.
 */
function getTrapdoorWidth(total) {
  if (total <= 1) return 26;
  const step = (356 - 44) / (total - 1);
  return Math.max(16, Math.min(24, Math.floor(step - 6)));
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
  background: #070f20;
  box-shadow: 0 10px 28px rgba(7, 15, 32, 0.34);
}

.penguin-arena-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 400 / 176;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  background: #070f20;
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

/* ==========================================================================
   PenguinArena 16-Bit Pixel-Art Controller (400 × 176)
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

    // Scenic elements (deterministic, rich 16-bit Arctic world)
    this._stars = this._createStars();
    this._snowflakes = this._createSnowflakes();
    this._shootingStar = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, cooldown: 4.5 };
    this._waterDrops = this._createWaterDrops();
    this._crystals = this._createCrystals();
    this._particles = [];
    this._pawprints = [];

    // Per-slot penguin & trapdoor animation state
    this._penguins = [];
    this._trapdoors = [];

    // Hero polar bear state in 400×176 logical coordinates
    this._bear = {
      x: 200,
      dir: 1, // 1 = right, -1 = left
      targetX: null,
      mode: 'patrol', // 'patrol' | 'sprint' | 'chompOpen' | 'chompSnap' | 'chompChew' | 'chompLick' | 'grumble'
      modeTimer: 0,
      walkPhase: 0,
      dustTimer: 0,
      breathTimer: 1.4,
      lastStepIndex: -1,
      hitFlashTimer: 0,
      bubbleText: null,
      bubbleColor: '#0f172a',
      bubbleTimer: 0,
      bubbleJagged: false,
    };

    // Camera impact shake (4px on chomp)
    this._shakeTimer = 0;
    this._shakeIntensity = 0;

    // Cached static offscreen backdrop layers
    this._skyCache = null;
    this._caveCache = null;

    // Cached DOM references
    this._canvas = null;
    this._ctx = null;
    this._statusPill = null;
    this._statusNote = null;

    ensureArenaStyles();
    this._buildDom();
    this._buildStaticCaches();
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
    this._pawprints = [];
    this._shakeTimer = 0;
    this._shakeIntensity = 0;

    const total = this._state.total;
    const doorW = getTrapdoorWidth(total);

    // Charming pixel accessories distributed across the lineup
    const accessoryTypes = ['none', 'redScarf', 'none', 'goldBeanie', 'tealScarf', 'none', 'redBeanie', 'none', 'goldScarf', 'tealBeanie'];

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
        y: RAMP_Y - 18,
        vy: 0,
        status: 'idle', // 'idle' | 'cheer' | 'panic' | 'falling' | 'eaten'
        timer: 0,
        cheerDelay: 0,
        waddlePhase: seededRand(i + 11) * Math.PI * 2,
        blinkCooldown: 1.2 + seededRand(i + 37) * 3.8,
        blinkTimer: 0,
        accessory: accessoryTypes[i % accessoryTypes.length],
      });
    }

    this._bear = {
      x: 200,
      dir: 1,
      targetX: null,
      mode: 'patrol',
      modeTimer: 0,
      walkPhase: 0,
      dustTimer: 0,
      breathTimer: 1.2,
      lastStepIndex: -1,
      hitFlashTimer: 0,
      bubbleText: null,
      bubbleColor: '#0f172a',
      bubbleTimer: 0,
      bubbleJagged: false,
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
        door.angle = 88;
        door.targetAngle = 88;
      }
      if (penguin) {
        penguin.status = 'eaten';
      }
      this._bear.x = targetX;
      this._bear.targetX = null;
      this._bear.mode = 'chompLick';
      this._bear.bubbleText = 'NOM!';
      this._bear.bubbleColor = '#be123c';
      this._bear.bubbleTimer = 0.95;
      this._bear.bubbleJagged = false;
      this._render();

      this._schedule(() => {
        this._bear.bubbleText = null;
        this._bear.mode = 'patrol';
        this._state = { ...this._state, bearState: 'patrol' };
        this._render();
      }, 950);

      return { ...this._state };
    }

    // Open bolted wooden/iron trapdoor (0° -> 88°) + sparkling ice-shard explosion
    if (door) {
      door.targetAngle = 88;
      door.vel = 480;
      this._spawnIceShards(targetX, RAMP_Y + 5);
    }

    // Penguin 260ms cartoon hang-time panic with sweat droplets before gravity drop
    if (penguin) {
      penguin.status = 'panic';
      penguin.timer = 0.26;
      penguin.vy = 0;
      penguin.y = RAMP_Y - 18;
      this._spawnSweatBurst(targetX, RAMP_Y - 14);
    }

    // Polar bear launches into a bounding gallop toward the falling penguin
    this._bear.targetX = targetX;
    this._bear.mode = 'sprint';
    this._bear.modeTimer = 0;
    this._bear.bubbleText = null;
    this._bear.dir = targetX >= this._bear.x ? 1 : -1;

    return { ...this._state };
  }

  /**
   * Celebrates a correct answer: remaining penguins jump with sparkles/hearts and the bear grumbles.
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
        p.cheerDelay = i * 0.032;
        p.timer = 0.62;
        this._spawnCheerSparkles(p.x, RAMP_Y - 20, i % 3 === 0);
      }
    }

    // Bear stomps & grumbles (unless mid-sprint/chomp)
    if (this._bear.mode === 'patrol' || this._bear.mode === 'grumble') {
      this._bear.mode = 'grumble';
      this._bear.modeTimer = 0.9;
      this._bear.bubbleText = 'GRRR!';
      this._bear.bubbleColor = '#b45309';
      this._bear.bubbleTimer = 0.9;
      this._bear.bubbleJagged = true;
      if (!reduced) {
        this._spawnSnowDust(this._bear.x + this._bear.dir * 12, FLOOR_Y, -this._bear.dir, 6);
      }
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
      }, 900);
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
    this._skyCache = null;
    this._caveCache = null;
  }

  /* ------------------------------------------------------------------------
     Private Setup, Scenic Generators & Offscreen Static Caches
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
    for (let i = 0; i < 42; i += 1) {
      const x = Math.floor(8 + seededRand(i * 3 + 1) * (CANVAS_W - 16));
      const y = Math.floor(3 + seededRand(i * 3 + 2) * 36);
      // Avoid overlapping the crescent moon around (332, 18)
      if (Math.hypot(x - 332, y - 18) < 16) continue;
      stars.push({
        x,
        y,
        phase: seededRand(i * 3 + 3) * Math.PI * 2,
        speed: 1.2 + seededRand(i * 5 + 7) * 2.6,
        diamond: i % 6 === 0,
      });
    }
    return stars;
  }

  /** @private */
  _createSnowflakes() {
    const flakes = [];
    // 3-depth snowfall: 0 = far slow, 1 = mid medium, 2 = near larger
    for (let i = 0; i < 48; i += 1) {
      const layer = i < 22 ? 0 : i < 40 ? 1 : 2;
      flakes.push({
        x: seededRand(i * 7 + 1) * CANVAS_W,
        y: seededRand(i * 7 + 2) * (RAMP_Y + 4),
        layer,
        speed: layer === 0 ? 5 + seededRand(i * 7 + 3) * 4 : layer === 1 ? 10 + seededRand(i * 7 + 3) * 6 : 18 + seededRand(i * 7 + 3) * 8,
        drift: layer === 0 ? 3 : layer === 1 ? 6 : 9,
        swayPhase: seededRand(i * 7 + 4) * Math.PI * 2,
        size: layer === 2 ? 2 : 1,
      });
    }
    return flakes;
  }

  /** @private */
  _createWaterDrops() {
    const xs = [26, 78, 146, 214, 286, 344, 374];
    return xs.map((x, i) => ({
      x,
      y: CAVE_TOP + 6,
      vy: 0,
      active: false,
      cooldown: 1.5 + seededRand(i * 19 + 4) * 5.5,
    }));
  }

  /** @private */
  _createCrystals() {
    return [
      { x: 18, y: 112, dir: 1, phase: 0.4 },
      { x: 24, y: 136, dir: 1, phase: 2.1 },
      { x: 382, y: 108, dir: -1, phase: 1.3 },
      { x: 376, y: 134, dir: -1, phase: 3.7 },
      { x: 112, y: 122, dir: 1, phase: 2.8, bg: true },
      { x: 288, y: 118, dir: -1, phase: 0.9, bg: true },
    ];
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
  _buildStaticCaches() {
    if (typeof document === 'undefined') return;

    // 1. Pre-render Bayer-dithered night sky + crescent moon + dithered moon halo
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = CANVAS_W;
    skyCanvas.height = RAMP_Y;
    const sctx = skyCanvas.getContext('2d');
    if (sctx) {
      sctx.imageSmoothingEnabled = false;
      this._renderStaticSkyAndMoon(sctx);
      this._skyCache = skyCanvas;
    }

    // 2. Pre-render static crystalline ice cave, arched pillars, plaque, snow floor & props
    const caveCanvas = document.createElement('canvas');
    caveCanvas.width = CANVAS_W;
    caveCanvas.height = CANVAS_H - CAVE_TOP;
    const cctx = caveCanvas.getContext('2d');
    if (cctx) {
      cctx.imageSmoothingEnabled = false;
      this._renderStaticIceCave(cctx);
      this._caveCache = caveCanvas;
    }
  }

  /** @private */
  _renderStaticSkyAndMoon(ctx) {
    // 4-band Bayer-dithered arctic night sky (#070f20 -> #0d1d3a -> #16305a -> #1e4378)
    const bands = ['#070f20', '#0d1d3a', '#16305a', '#1e4378'];
    const bandHeights = [18, 17, 16, 15]; // sums to 66 (RAMP_Y)
    const ditherZone = 6;

    let yCursor = 0;
    for (let b = 0; b < bands.length; b += 1) {
      const h = bandHeights[b];
      ctx.fillStyle = bands[b];
      ctx.fillRect(0, yCursor, CANVAS_W, h);

      // Smooth 4×4 Bayer ordered dithering into next band
      if (b < bands.length - 1) {
        const nextColor = bands[b + 1];
        const seamStart = yCursor + h - ditherZone;
        ctx.fillStyle = nextColor;
        for (let dy = 0; dy < ditherZone; dy += 1) {
          const py = seamStart + dy;
          const threshold = ((dy + 1) / (ditherZone + 1)) * 16;
          const by = py % 4;
          for (let px = 0; px < CANVAS_W; px += 1) {
            if (threshold > BAYER_4X4[by][px % 4]) {
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }
      }
      yCursor += h;
    }

    // Concentric Bayer-dithered moon halo around (332, 18)
    const mx = 332;
    const my = 18;
    drawDitheredHalo(ctx, mx, my, 26, 'rgba(186, 230, 253, 0.22)', 0.55);
    drawDitheredHalo(ctx, mx, my, 15, 'rgba(254, 249, 195, 0.28)', 0.65);

    // Shaded pixel crescent moon (radius 8, carved shadow circle at mx+3, my-2)
    for (let dy = -8; dy <= 8; dy += 1) {
      for (let dx = -8; dx <= 8; dx += 1) {
        const dMain = dx * dx + dy * dy;
        if (dMain > 64) continue;
        const dCut = (dx - 4) * (dx - 4) + (dy + 2) * (dy + 2);
        if (dCut < 45) continue;

        let color = '#fef9c3';
        if (dMain > 46 && dx < 0) {
          color = '#ffffff'; // crisp bright moonlit rim
        } else if (dCut < 58) {
          color = '#fde047'; // warm inner crescent terminator
        } else if ((dx === -3 && dy === 2) || (dx === -2 && dy === -3) || (dx === -4 && dy === -1)) {
          color = '#eab308'; // subtle pixel crater shading
        }
        ctx.fillStyle = color;
        ctx.fillRect(mx + dx, my + dy, 1, 1);
      }
    }
  }

  /** @private */
  _renderStaticIceCave(ctx) {
    const caveH = CANVAS_H - CAVE_TOP; // 100
    const floorLocalY = FLOOR_Y - CAVE_TOP; // 76

    // Deep cavern interior gradient with Bayer dither transitions
    const caveBands = ['#061224', '#091b33', '#0d2544', '#123157'];
    const bandH = Math.ceil(floorLocalY / caveBands.length);
    for (let b = 0; b < caveBands.length; b += 1) {
      const y0 = b * bandH;
      ctx.fillStyle = caveBands[b];
      ctx.fillRect(0, y0, CANVAS_W, bandH + 1);
      if (b < caveBands.length - 1) {
        ctx.fillStyle = caveBands[b + 1];
        for (let dy = 0; dy < 4; dy += 1) {
          const py = y0 + bandH - 4 + dy;
          const th = ((dy + 1) / 5) * 16;
          for (let px = 0; px < CANVAS_W; px += 1) {
            if (th > BAYER_4X4[py % 4][px % 4]) {
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }
      }
    }

    // Layered faceted crystal rock walls in deep background
    const bgFacets = [
      { x: 46, y: 18, w: 38, h: 58 },
      { x: 118, y: 26, w: 48, h: 50 },
      { x: 234, y: 22, w: 46, h: 54 },
      { x: 312, y: 16, w: 42, h: 60 },
    ];
    for (let i = 0; i < bgFacets.length; i += 1) {
      const f = bgFacets[i];
      ctx.fillStyle = '#0f2b4d';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = '#153963';
      ctx.fillRect(f.x + 2, f.y + 3, Math.floor(f.w * 0.45), f.h - 3);
      ctx.fillStyle = '#1b4778';
      ctx.fillRect(f.x + 2, f.y + 3, 2, f.h - 3);
      // Diagonal ice vein
      ctx.fillStyle = '#255c96';
      for (let k = 0; k < 14; k += 1) {
        ctx.fillRect(f.x + 6 + k, f.y + 8 + k * 2, 1, 2);
      }
    }

    // Carved ice plaque "ISHULEN" centered on upper back wall
    const px = 167;
    const py = 12;
    const pw = 66;
    const ph = 13;
    ctx.fillStyle = '#071526';
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#1c4470';
    ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
    ctx.fillStyle = '#0f2a4a';
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    // Corner ice rivets
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(px + 2, py + 2, 1, 1);
    ctx.fillRect(px + pw - 3, py + 2, 1, 1);
    ctx.fillRect(px + 2, py + ph - 3, 1, 1);
    ctx.fillRect(px + pw - 3, py + ph - 3, 1, 1);
    // Engraved text with 1px highlight shadow
    drawPixelText(ctx, 'ISHULEN', 200, py + 5, 'rgba(7, 15, 32, 0.8)', 1, true);
    drawPixelText(ctx, 'ISHULEN', 200, py + 4, 'rgba(186, 230, 253, 0.52)', 1, true);

    // Arched icy cavern pillars supporting both sides of the ramp
    for (let y = 0; y < floorLocalY + 6; y += 1) {
      const t = y / floorLocalY;
      const arch = Math.round(30 - Math.sin(t * Math.PI) * 11 + (y % 9 === 0 ? 1 : 0));

      // Left pillar (4-tone crystalline bevel)
      ctx.fillStyle = '#0c2442';
      ctx.fillRect(0, y, arch, 1);
      ctx.fillStyle = '#163d69';
      ctx.fillRect(Math.max(0, arch - 14), y, 8, 1);
      ctx.fillStyle = '#2b6da3';
      ctx.fillRect(Math.max(0, arch - 6), y, 4, 1);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(Math.max(0, arch - 2), y, 2, 1);
      if (y % 5 === 0) {
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(Math.max(0, arch - 1), y, 1, 1);
      }

      // Right pillar (mirrored)
      ctx.fillStyle = '#0c2442';
      ctx.fillRect(CANVAS_W - arch, y, arch, 1);
      ctx.fillStyle = '#163d69';
      ctx.fillRect(CANVAS_W - arch + 6, y, 8, 1);
      ctx.fillStyle = '#2b6da3';
      ctx.fillRect(CANVAS_W - arch + 2, y, 4, 1);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(CANVAS_W - arch, y, 2, 1);
      if (y % 5 === 2) {
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(CANVAS_W - arch, y, 1, 1);
      }
    }

    // Hanging stalactite icicles along cave ceiling & arch corners
    const stalactites = [
      [18, 18], [26, 12], [35, 9],
      [365, 10], [374, 14], [382, 19],
    ];
    for (let i = 0; i < stalactites.length; i += 1) {
      const [ix, len] = stalactites[i];
      for (let dy = 0; dy < len; dy += 1) {
        const w = Math.max(1, Math.round(((len - dy) / len) * 5));
        const lx = ix - Math.floor(w / 2);
        ctx.fillStyle = dy < 4 ? '#e0f2fe' : dy < len * 0.65 ? '#7dd3fc' : '#38bdf8';
        ctx.fillRect(lx, dy, w, 1);
        if (w >= 2) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx, dy, 1, 1);
        }
      }
    }

    // Contoured multi-tone snowy floor (local y = 76..100, global y = 152..176)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, floorLocalY, CANVAS_W, caveH - floorLocalY);

    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(0, floorLocalY, CANVAS_W, 18);

    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, floorLocalY, CANVAS_W, 11);

    // Undulating bright snowdrift crest
    for (let x = 0; x < CANVAS_W; x += 1) {
      const drift1 = Math.round(Math.sin(x * 0.032) * 2 + Math.cos(x * 0.085) * 1);
      const drift2 = Math.round(Math.sin(x * 0.024 + 1.8) * 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(x, floorLocalY + drift1 - 1, 1, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, floorLocalY + drift1 - 1, 1, 2);
      // Subtle lower snowdrift wave
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(x, floorLocalY + 12 + drift2, 1, 2);
    }

    // Deep bottom ice-crust shadow
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, caveH - 4, CANVAS_W, 4);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, caveH - 2, CANVAS_W, 2);

    // Small scattered ice pebbles & fish-bones on the snowy floor
    const pebbles = [
      [54, floorLocalY + 11], [136, floorLocalY + 14], [254, floorLocalY + 12], [338, floorLocalY + 13],
    ];
    for (let i = 0; i < pebbles.length; i += 1) {
      const [px2, py2] = pebbles[i];
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(px2, py2 + 1, 4, 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(px2, py2, 3, 1);
    }

    // Tiny pixel fishbone props (polar bear snacks!)
    const drawFishbone = (fx, fy) => {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(fx, fy + 1, 9, 1);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(fx, fy, 8, 1);
      // Spine ribs
      ctx.fillRect(fx + 2, fy - 1, 1, 3);
      ctx.fillRect(fx + 4, fy - 1, 1, 3);
      ctx.fillRect(fx + 6, fy - 1, 1, 3);
      // Tail fin
      ctx.fillRect(fx + 8, fy - 1, 1, 1);
      ctx.fillRect(fx + 8, fy + 1, 1, 1);
    };
    drawFishbone(82, floorLocalY + 15);
    drawFishbone(304, floorLocalY + 16);
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
    const colors = ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', '#fbbf24'];
    for (let i = 0; i < 14; i += 1) {
      const angle = Math.PI * 0.12 + seededRand(i + this._elapsed * 17) * (Math.PI * 0.76);
      const speed = 22 + seededRand(i * 3 + 2) * 48;
      this._particles.push({
        x: x + (i - 6.5) * 1.8,
        y,
        vx: Math.cos(angle) * speed * (i % 2 === 0 ? 1 : -1),
        vy: Math.sin(angle) * speed * 0.45 - 16,
        gravity: 155,
        life: 0.45 + seededRand(i + 5) * 0.25,
        maxLife: 0.7,
        size: i % 3 === 0 ? 2 : 1,
        color: colors[i % colors.length],
        kind: 'pixel',
      });
    }
  }

  /** @private */
  _spawnSweatBurst(x, y) {
    for (let i = 0; i < 4; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      this._particles.push({
        x: x + side * (6 + i),
        y: y - 4,
        vx: side * (16 + i * 5),
        vy: -24 - i * 4,
        gravity: 110,
        life: 0.34,
        maxLife: 0.34,
        size: 1,
        color: '#7dd3fc',
        kind: 'pixel',
      });
    }
  }

  /** @private */
  _spawnSnowDust(x, y, dir, count = 5) {
    const colors = ['#ffffff', '#e0f2fe', '#bae6fd'];
    for (let i = 0; i < count; i += 1) {
      this._particles.push({
        x: x - dir * (12 + i * 2.5),
        y: y - 1 - (i % 3),
        vx: -dir * (18 + i * 10 + seededRand(i + this._elapsed * 19) * 12),
        vy: -16 - i * 6 - seededRand(i * 2 + 1) * 10,
        gravity: 72,
        life: 0.32 + i * 0.05,
        maxLife: 0.52,
        size: i % 2 === 0 ? 2 : 1,
        color: colors[i % colors.length],
        kind: 'pixel',
      });
    }
  }

  /** @private */
  _spawnBreathPuff(x, y, dir) {
    for (let i = 0; i < 4; i += 1) {
      this._particles.push({
        x: x + dir * (2 + i),
        y: y - (i % 2),
        vx: dir * (7 + i * 2.5),
        vy: -8 - i * 2,
        gravity: -4,
        life: 0.55 + i * 0.08,
        maxLife: 0.78,
        size: i < 2 ? 2 : 1,
        color: i === 0 ? 'rgba(240, 249, 255, 0.7)' : 'rgba(186, 230, 253, 0.5)',
        kind: 'pixel',
      });
    }
  }

  /** @private */
  _spawnChompBurst(x, y) {
    const colors = ['#ffffff', '#e0f2fe', '#7dd3fc', '#162036', '#293a59', '#f97316', '#fde047'];
    for (let i = 0; i < 28; i += 1) {
      const angle = (i / 28) * Math.PI * 2 + seededRand(i + 7) * 0.2;
      const speed = 26 + seededRand(i * 11 + 3) * 62;
      this._particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 28,
        gravity: 135,
        life: 0.42 + seededRand(i * 7 + 1) * 0.36,
        maxLife: 0.78,
        size: i % 3 === 0 ? 2 : 1,
        color: colors[i % colors.length],
        kind: 'pixel',
      });
    }
  }

  /** @private */
  _spawnCheerSparkles(x, y, withHeart = false) {
    const colors = ['#fef08a', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 4; i += 1) {
      this._particles.push({
        x: x + (i - 1.5) * 4.5,
        y: y - (i % 2) * 3,
        vx: (i - 1.5) * 9,
        vy: -24 - i * 4,
        gravity: 26,
        life: 0.52,
        maxLife: 0.52,
        size: 1,
        color: colors[i % colors.length],
        kind: 'sparkle',
      });
    }
    if (withHeart) {
      this._particles.push({
        x,
        y: y - 4,
        vx: 0,
        vy: -16,
        gravity: 6,
        life: 0.65,
        maxLife: 0.65,
        size: 1,
        color: '#fb7185',
        kind: 'heart',
      });
    }
  }

  /** @private */
  _stampPawprint(x) {
    this._pawprints.push({
      x: Math.round(x),
      y: FLOOR_Y + 4 + (this._pawprints.length % 2) * 2,
      life: 6.0,
      maxLife: 6.0,
    });
    if (this._pawprints.length > 26) {
      this._pawprints.shift();
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

    // 1. Update 3-depth snowfall
    for (let i = 0; i < this._snowflakes.length; i += 1) {
      const f = this._snowflakes[i];
      f.y += f.speed * dt;
      f.x += Math.sin(this._elapsed * (1.1 + f.layer * 0.4) + f.swayPhase) * f.drift * dt;
      if (f.y >= RAMP_Y + 2) {
        f.y = 0;
        f.x = (f.x + 43) % CANVAS_W;
      }
      if (f.x < 0) f.x += CANVAS_W;
      if (f.x >= CANVAS_W) f.x -= CANVAS_W;
    }

    // 2. Update occasional shooting star across the Arctic sky
    const ss = this._shootingStar;
    if (ss.active) {
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      ss.life -= dt;
      if (ss.life <= 0 || ss.x < 0 || ss.x > CANVAS_W || ss.y > RAMP_Y - 12) {
        ss.active = false;
        ss.cooldown = 5.5 + seededRand(this._elapsed * 13) * 7.5;
      }
    } else {
      ss.cooldown -= dt;
      if (ss.cooldown <= 0) {
        ss.active = true;
        ss.x = 60 + seededRand(this._elapsed * 7) * 200;
        ss.y = 4 + seededRand(this._elapsed * 11) * 14;
        ss.vx = 135;
        ss.vy = 34;
        ss.life = 0.48;
      }
    }

    // 3. Update dripping icicle water droplets
    for (let i = 0; i < this._waterDrops.length; i += 1) {
      const d = this._waterDrops[i];
      if (d.active) {
        d.vy += 170 * dt;
        d.y += d.vy * dt;
        if (d.y >= FLOOR_Y) {
          d.active = false;
          d.cooldown = 2.6 + seededRand(i * 13 + this._elapsed) * 5.0;
          // Tiny snow-splash droplet
          this._particles.push({
            x: d.x - 1, y: FLOOR_Y - 1, vx: -10, vy: -14, gravity: 90, life: 0.22, maxLife: 0.22, size: 1, color: '#bae6fd', kind: 'pixel',
          });
          this._particles.push({
            x: d.x + 1, y: FLOOR_Y - 1, vx: 10, vy: -14, gravity: 90, life: 0.22, maxLife: 0.22, size: 1, color: '#e0f2fe', kind: 'pixel',
          });
        }
      } else {
        d.cooldown -= dt;
        if (d.cooldown <= 0) {
          d.active = true;
          d.y = CAVE_TOP + 6;
          d.vy = 10;
        }
      }
    }

    // 4. Update hinged wooden/iron trapdoors (spring-damped swing 0° -> 88°)
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const d = this._trapdoors[i];
      if (d.angle !== d.targetAngle || Math.abs(d.vel) > 0.5) {
        const diff = d.targetAngle - d.angle;
        d.vel += diff * 195 * dt;
        d.vel *= Math.max(0, 1 - 10.5 * dt);
        d.angle += d.vel * dt;
        if (d.angle > 96) {
          d.angle = 96;
          d.vel *= -0.35;
        }
        if (Math.abs(diff) < 0.4 && Math.abs(d.vel) < 2) {
          d.angle = d.targetAngle;
          d.vel = 0;
        }
      }
    }

    // 5. Update penguins
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      if (p.status === 'idle') {
        p.waddlePhase += dt * 2.5;
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
          p.vy = 28;
          p.timer = 0;
        }
      } else if (p.status === 'falling') {
        p.timer += dt;
        p.vy += 470 * dt;
        p.y += p.vy * dt;

        // Impact at polar bear mouth height
        if (p.y >= FLOOR_Y - 28) {
          p.status = 'eaten';
          this._triggerBearChomp(p.x);
        }
      }
    }

    // 6. Update hungry polar bear
    this._updateBear(dt);

    // 7. Update fading snow pawprints
    for (let i = this._pawprints.length - 1; i >= 0; i -= 1) {
      this._pawprints[i].life -= dt;
      if (this._pawprints[i].life <= 0) {
        this._pawprints.splice(i, 1);
      }
    }

    // 8. Update particles
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

    // 9. Camera impact shake & hit-flash decay
    if (this._shakeTimer > 0) {
      this._shakeTimer = Math.max(0, this._shakeTimer - dt);
    }
    if (this._bear.hitFlashTimer > 0) {
      this._bear.hitFlashTimer = Math.max(0, this._bear.hitFlashTimer - dt);
    }
  }

  /** @private */
  _updateBear(dt) {
    const bear = this._bear;
    const minX = 54;
    const maxX = 346;

    if (bear.bubbleTimer > 0) {
      bear.bubbleTimer -= dt;
      if (bear.bubbleTimer <= 0) {
        bear.bubbleText = null;
      }
    }

    // Periodic frosty breath puffs in cold cave air
    bear.breathTimer -= dt;
    if (bear.breathTimer <= 0 && (bear.mode === 'patrol' || bear.mode === 'grumble')) {
      bear.breathTimer = 1.6 + seededRand(this._elapsed * 5) * 1.4;
      const snoutX = bear.x + bear.dir * 19;
      const snoutY = FLOOR_Y - 16;
      this._spawnBreathPuff(snoutX, snoutY, bear.dir);
    }

    if (bear.mode === 'sprint' && bear.targetX !== null) {
      const dx = bear.targetX - bear.x;
      const sprintSpeed = 290;
      if (Math.abs(dx) <= 5) {
        bear.x = bear.targetX;
        bear.targetX = null;
        bear.mode = 'chompOpen';
        bear.modeTimer = 0.65;
      } else {
        bear.dir = dx >= 0 ? 1 : -1;
        bear.x += Math.sign(dx) * Math.min(Math.abs(dx), sprintSpeed * dt);
        bear.walkPhase += dt * 18;
        bear.dustTimer -= dt;
        if (bear.dustTimer <= 0) {
          bear.dustTimer = 0.05;
          // Rooster-tails of pixel snow clouds!
          this._spawnSnowDust(bear.x, FLOOR_Y, bear.dir, 5);
          this._stampPawprint(bear.x - bear.dir * 8);
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
        bear.mode = 'chompChew';
        bear.modeTimer = 0.42;
      }
    } else if (bear.mode === 'chompChew') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        bear.mode = 'chompLick';
        bear.modeTimer = 0.45;
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
      // Weighty 4-frame patrol walk cycle inside the ice cave
      const patrolSpeed = 34;
      bear.x += bear.dir * patrolSpeed * dt;
      if (bear.x >= maxX) {
        bear.x = maxX;
        bear.dir = -1;
      } else if (bear.x <= minX) {
        bear.x = minX;
        bear.dir = 1;
      }
      bear.walkPhase += dt * 5.2;
      const stepIdx = Math.floor(bear.walkPhase);
      if (stepIdx !== bear.lastStepIndex) {
        bear.lastStepIndex = stepIdx;
        if (stepIdx % 2 === 0) {
          this._stampPawprint(bear.x - bear.dir * 6);
        }
      }
    }
  }

  /** @private */
  _triggerBearChomp(targetX) {
    const bear = this._bear;
    bear.x = targetX;
    bear.targetX = null;
    bear.mode = 'chompSnap';
    bear.modeTimer = 0.18;
    bear.hitFlashTimer = 0.09;
    bear.bubbleText = 'NOM!';
    bear.bubbleColor = '#be123c';
    bear.bubbleTimer = 1.05;
    bear.bubbleJagged = false;

    // 4px impact camera shake + 28 snow/ice/feather particles
    this._shakeTimer = 0.28;
    this._shakeIntensity = 4;
    this._spawnChompBurst(targetX, FLOOR_Y - 16);
    this._spawnSnowDust(targetX, FLOOR_Y, 1, 6);
    this._spawnSnowDust(targetX, FLOOR_Y, -1, 6);
  }

  /* ------------------------------------------------------------------------
     Pixel-Art Canvas Rendering (400 × 176)
     ------------------------------------------------------------------------ */

  /** @private */
  _render() {
    const ctx = this._ctx;
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.save();

    // Apply 4px impact camera shake on bear chomp
    if (this._shakeTimer > 0 && !prefersReducedMotion()) {
      const mag = Math.ceil((this._shakeTimer / 0.28) * this._shakeIntensity);
      const sx = Math.round(Math.sin(this._elapsed * 105) * mag);
      const sy = Math.round(Math.cos(this._elapsed * 125) * mag);
      ctx.translate(sx, sy);
    }

    // 1. Night sky + crescent moon (cached)
    if (this._skyCache) {
      ctx.drawImage(this._skyCache, 0, 0);
    } else {
      this._renderStaticSkyAndMoon(ctx);
    }

    // 2. Multi-layered undulating Aurora Borealis curtains
    this._drawAurora(ctx);

    // 3. Twinkling 1px/3px diamond stars & occasional shooting star
    this._drawStarsAndShootingStar(ctx);

    // 4. 3-layer shaded Arctic glacier mountains
    this._drawGlacierMountains(ctx);

    // 5. Far & mid snowfall
    this._drawSnowflakes(ctx, 0);
    this._drawSnowflakes(ctx, 1);

    // 6. Detailed Ice Cave (cached shell) + pulsing turquoise crystal clusters + pawprints + water drips
    if (this._caveCache) {
      ctx.drawImage(this._caveCache, 0, CAVE_TOP);
    } else {
      ctx.save();
      ctx.translate(0, CAVE_TOP);
      this._renderStaticIceCave(ctx);
      ctx.restore();
    }
    this._drawGlowingCrystals(ctx);
    this._drawPawprints(ctx);
    this._drawWaterDrops(ctx);

    // 7. Crystalline ice ramp + bolted wooden/iron trapdoors + dripping icicles
    this._drawRampAndTrapdoors(ctx);

    // 8. Warm pixel lanterns on wooden posts at x = 14 and x = 386 (back posts)
    this._drawLanternPosts(ctx);

    // 9. Hero 16×18 penguins (with accessories, nervous glance, panic, tumble)
    this._drawPenguins(ctx);

    // 10. Warm radial Bayer-dithered amber light halos from lanterns over snow, ramp & nearby penguins
    this._drawLanternHalos(ctx);

    // 11. Hero 42×26 polar bear
    this._drawPolarBear(ctx);

    // 12. Foreground snowfall & particles
    this._drawSnowflakes(ctx, 2);
    this._drawParticles(ctx);

    // 13. Crisp bordered pixel-art comic badge ("NOM!" / jagged "GRRR!")
    this._drawComicBadge(ctx);

    ctx.restore();
  }

  /** @private */
  _drawAurora(ctx) {
    const t = this._elapsed;
    // Two overlapping vertical dithered light-curtain ribbons (emerald -> cyan -> violet)
    for (let layer = 0; layer < 2; layer += 1) {
      const step = 2;
      const startX = layer === 0 ? 18 : 64;
      const endX = layer === 0 ? 310 : 376;
      const baseY = layer === 0 ? 11 : 17;

      for (let x = startX; x < endX; x += step) {
        const wave =
          Math.sin(x * (0.024 + layer * 0.008) + t * (0.75 - layer * 0.25) + layer * 2.1) * 4.5 +
          Math.cos(x * 0.013 - t * 0.42 + layer) * 2.5;
        const top = Math.round(baseY + wave);
        const h = Math.round(9 + Math.sin(x * 0.042 + t * 1.05 + layer) * 3.5);
        const phase = (Math.floor(x / 2) + Math.floor(t * 3)) % 2;

        // Emerald bottom glow (#34d399)
        ctx.fillStyle = layer === 0 ? 'rgba(52, 211, 153, 0.28)' : 'rgba(52, 211, 153, 0.18)';
        ctx.fillRect(x, top + 4, 2, Math.max(2, h - 3));

        // Cyan mid-curtain (#22d3ee)
        ctx.fillStyle = layer === 0 ? 'rgba(34, 211, 238, 0.24)' : 'rgba(34, 211, 238, 0.16)';
        ctx.fillRect(x, top + 2, 2, 3);

        // Violet dithered upper crest (#a78bfa)
        if (phase === 0) {
          ctx.fillStyle = 'rgba(167, 139, 250, 0.24)';
          ctx.fillRect(x, top, 2, 2);
          ctx.fillStyle = 'rgba(52, 211, 153, 0.34)';
          ctx.fillRect(x, top + h + 1, 1, 2);
        }
      }
    }
  }

  /** @private */
  _drawStarsAndShootingStar(ctx) {
    const palette = ['#475569', '#94a3b8', '#e2e8f0', '#fef08a'];
    for (let i = 0; i < this._stars.length; i += 1) {
      const s = this._stars[i];
      const wave = 0.5 + 0.5 * Math.sin(this._elapsed * s.speed + s.phase);
      const idx = Math.min(3, Math.floor(wave * 4));
      ctx.fillStyle = palette[idx];
      ctx.fillRect(s.x, s.y, 1, 1);

      // 3px diamond star twinkle
      if (s.diamond && idx >= 2) {
        ctx.fillStyle = idx === 3 ? 'rgba(254, 240, 138, 0.85)' : 'rgba(226, 232, 240, 0.55)';
        ctx.fillRect(s.x - 1, s.y, 1, 1);
        ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1);
        ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    }

    // Occasional shooting star with fading pixel tail
    const ss = this._shootingStar;
    if (ss.active) {
      const hx = Math.round(ss.x);
      const hy = Math.round(ss.y);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx, hy, 2, 1);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(hx - 3, hy - 1, 3, 1);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.fillRect(hx - 7, hy - 2, 4, 1);
      ctx.fillStyle = 'rgba(125, 211, 252, 0.35)';
      ctx.fillRect(hx - 12, hy - 3, 5, 1);
    }
  }

  /** @private */
  _drawGlacierMountains(ctx) {
    // Layer 1: Far distant dusky Arctic spires
    const farPeaks = [
      { cx: 56, top: 24, halfW: 54 },
      { cx: 144, top: 19, halfW: 62 },
      { cx: 242, top: 21, halfW: 60 },
      { cx: 348, top: 25, halfW: 56 },
    ];
    for (let i = 0; i < farPeaks.length; i += 1) {
      const p = farPeaks[i];
      const h = RAMP_Y - p.top;
      for (let dy = 0; dy < h; dy += 1) {
        const y = p.top + dy;
        const span = Math.max(1, Math.round((dy / h) * p.halfW));
        ctx.fillStyle = dy < h * 0.25 ? '#476b99' : '#1b3559';
        ctx.fillRect(p.cx - span, y, span, 1);
        ctx.fillStyle = dy < h * 0.25 ? '#35547d' : '#132744';
        ctx.fillRect(p.cx, y, span, 1);
      }
    }

    // Layer 2: Mid faceted glacier mountains with moonlit specular edges & deep blue crevices
    const midPeaks = [
      { cx: 28, top: 32, halfW: 44 },
      { cx: 102, top: 28, halfW: 48 },
      { cx: 192, top: 30, halfW: 54 },
      { cx: 284, top: 27, halfW: 50 },
      { cx: 374, top: 33, halfW: 44 },
    ];
    for (let i = 0; i < midPeaks.length; i += 1) {
      const p = midPeaks[i];
      const h = RAMP_Y - p.top;
      for (let dy = 0; dy < h; dy += 1) {
        const y = p.top + dy;
        const span = Math.max(1, Math.round((dy / h) * p.halfW));
        const snowCap = dy < Math.round(h * 0.36);

        // Sunlit/moonlit left slope
        ctx.fillStyle = snowCap ? '#dbeafe' : '#2b5587';
        ctx.fillRect(p.cx - span, y, span, 1);

        // Crisp specular ridge edge on left face
        if (span > 2) {
          ctx.fillStyle = snowCap ? '#ffffff' : '#60a5fa';
          ctx.fillRect(p.cx - span, y, Math.max(1, Math.floor(span * 0.22)), 1);
        }

        // Shadowed right slope + crevice ridge
        ctx.fillStyle = snowCap ? '#93c5fd' : '#173254';
        ctx.fillRect(p.cx, y, span, 1);
        if (!snowCap && span > 6) {
          ctx.fillStyle = '#0f233d';
          ctx.fillRect(p.cx + Math.floor(span * 0.35), y, 2, 1);
        }
      }
    }

    // Layer 3: Icy foothills hugging the horizon above the ramp
    for (let x = 0; x < CANVAS_W; x += 2) {
      const hill = Math.round(5 + Math.sin(x * 0.045) * 2.5 + Math.cos(x * 0.11) * 1.5);
      ctx.fillStyle = '#1e426e';
      ctx.fillRect(x, RAMP_Y - hill, 2, hill);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(x, RAMP_Y - hill, 2, 1);
    }
  }

  /** @private */
  _drawSnowflakes(ctx, layer) {
    ctx.fillStyle =
      layer === 0
        ? 'rgba(186, 230, 253, 0.55)'
        : layer === 1
          ? 'rgba(240, 249, 255, 0.85)'
          : 'rgba(255, 255, 255, 0.95)';
    for (let i = 0; i < this._snowflakes.length; i += 1) {
      const f = this._snowflakes[i];
      if (f.layer !== layer) continue;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
    }
  }

  /** @private */
  _drawGlowingCrystals(ctx) {
    for (let i = 0; i < this._crystals.length; i += 1) {
      const cr = this._crystals[i];
      const pulse = 0.5 + 0.5 * Math.sin(this._elapsed * 2.4 + cr.phase);
      const glowAlpha = cr.bg ? 0.16 + pulse * 0.14 : 0.26 + pulse * 0.24;

      // Pulsing turquoise Bayer halo
      drawDitheredHalo(ctx, cr.x, cr.y, cr.bg ? 8 : 12, `rgba(45, 212, 191, ${glowAlpha.toFixed(2)})`, 0.7);

      // 3-shard crystalline cluster
      const d = cr.dir;
      const coreColor = pulse > 0.65 ? '#ccfbf1' : '#5eead4';
      const midColor = '#14b8a6';
      const darkColor = '#0f766e';

      // Main shard
      ctx.fillStyle = darkColor;
      ctx.fillRect(cr.x - 1, cr.y - 5, 3, 7);
      ctx.fillStyle = midColor;
      ctx.fillRect(cr.x, cr.y - 6, 2, 6);
      ctx.fillStyle = coreColor;
      ctx.fillRect(cr.x, cr.y - 6, 1, 4);

      // Side angled shard
      ctx.fillStyle = midColor;
      ctx.fillRect(cr.x + d * 2, cr.y - 3, 2, 4);
      ctx.fillStyle = coreColor;
      ctx.fillRect(cr.x + d * 3, cr.y - 3, 1, 2);

      // Small base shard
      ctx.fillStyle = midColor;
      ctx.fillRect(cr.x - d * 2, cr.y - 1, 2, 3);
    }
  }

  /** @private */
  _drawPawprints(ctx) {
    for (let i = 0; i < this._pawprints.length; i += 1) {
      const p = this._pawprints[i];
      const alpha = Math.min(0.65, (p.life / p.maxLife) * 0.65);
      ctx.fillStyle = `rgba(56, 130, 200, ${alpha.toFixed(2)})`;
      // Pad + 3 toe beans
      ctx.fillRect(p.x, p.y, 4, 2);
      ctx.fillRect(p.x - 1, p.y - 1, 1, 1);
      ctx.fillRect(p.x + 1, p.y - 1, 1, 1);
      ctx.fillRect(p.x + 3, p.y - 1, 1, 1);
    }
  }

  /** @private */
  _drawWaterDrops(ctx) {
    for (let i = 0; i < this._waterDrops.length; i += 1) {
      const d = this._waterDrops[i];
      if (!d.active) continue;
      const dy = Math.round(d.y);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(d.x, dy, 1, 3);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(d.x, dy + 2, 1, 1);
    }
  }

  /** @private */
  _drawRampAndTrapdoors(ctx) {
    // Helper to draw beveled crystalline ice bricks with snow cap & cracks
    const drawIceSegment = (x, width) => {
      if (width <= 0) return;
      const rx = Math.round(x);
      const rw = Math.round(width);

      // Dark outline shell
      ctx.fillStyle = '#091a30';
      ctx.fillRect(rx, RAMP_Y, rw, RAMP_H);

      // Bright snow cap (top 2px)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx, RAMP_Y, rw, 1);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(rx, RAMP_Y + 1, rw, 1);

      // Crystalline ice brick body
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(rx, RAMP_Y + 2, rw, 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(rx, RAMP_Y + 4, rw, 3);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(rx, RAMP_Y + 7, rw, 2);

      // Brick mortar joints & subtle ice cracks
      for (let bx = rx + 6; bx < rx + rw - 2; bx += 10) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bx, RAMP_Y + 2, 1, 7);
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(bx + 1, RAMP_Y + 2, 1, 2);
      }
    };

    // Draw solid ramp segments between trapdoors + hanging glistening icicles
    let cursor = 0;
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      const leftEdge = Math.round(door.x - door.width / 2);
      drawIceSegment(cursor, leftEdge - cursor);

      if (leftEdge - cursor >= 6) {
        const icicleX = Math.round(cursor + (leftEdge - cursor) / 2);
        const len = 4 + (i % 3) * 2;
        for (let dy = 0; dy < len; dy += 1) {
          const w = dy < 2 ? 3 : dy < len - 1 ? 2 : 1;
          ctx.fillStyle = dy < 2 ? '#e0f2fe' : '#7dd3fc';
          ctx.fillRect(icicleX - Math.floor(w / 2), CAVE_TOP + dy, w, 1);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(icicleX - 1, CAVE_TOP, 1, 2);
      }

      cursor = leftEdge + door.width;
    }
    drawIceSegment(cursor, CANVAS_W - cursor);

    // Draw bolted wooden/iron trapdoors under each penguin
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      const hingeX = Math.round(door.x - door.width / 2);
      const hingeY = RAMP_Y + 2;

      if (door.angle < 1) {
        // Closed bolted wooden/iron trapdoor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(hingeX, RAMP_Y, door.width, RAMP_H);

        // Frost dusting on top edge
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(hingeX + 1, RAMP_Y, door.width - 2, 1);

        // Wood planks (#b45309 / #78350f)
        ctx.fillStyle = '#b45309';
        ctx.fillRect(hingeX + 1, RAMP_Y + 1, door.width - 2, 3);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(hingeX + 1, RAMP_Y + 4, door.width - 2, 2);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(hingeX + 1, RAMP_Y + 6, door.width - 2, 3);

        // Iron reinforcement band
        ctx.fillStyle = '#334155';
        ctx.fillRect(hingeX + 1, RAMP_Y + 4, door.width - 2, 2);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(hingeX + 1, RAMP_Y + 4, door.width - 2, 1);

        // Brass hinge & rivets (#fbbf24)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(hingeX + 1, RAMP_Y + 2, 2, 2);
        ctx.fillRect(hingeX + door.width - 3, RAMP_Y + 2, 2, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(hingeX + 1, RAMP_Y + 2, 1, 1);
        ctx.fillRect(hingeX + door.width - 3, RAMP_Y + 2, 1, 1);
      } else {
        // Swinging open wooden/iron trapdoor (0° -> 88°)
        const rad = (door.angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        for (let step = 0; step < door.width; step += 1) {
          const px = Math.round(hingeX + step * cos);
          const py = Math.round(hingeY + step * sin);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px - 1, py - 1, 4, 6);
          ctx.fillStyle = step % 5 === 0 ? '#475569' : '#b45309';
          ctx.fillRect(px, py, 2, 2);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px, py + 2, 2, 2);
        }
        // Brass hinge pin
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(hingeX, hingeY, 2, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(hingeX, hingeY, 1, 1);
      }
    }
  }

  /** @private */
  _drawLanternPosts(ctx) {
    const positions = [14, 386];
    const flicker = Math.sin(this._elapsed * 13) * 0.5 + Math.cos(this._elapsed * 21) * 0.5;

    for (let i = 0; i < positions.length; i += 1) {
      const lx = positions[i];
      const baseY = RAMP_Y;
      const dir = i === 0 ? 1 : -1;

      // Wooden post (y = 43..66)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(lx - 2, baseY - 23, 5, 23);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(lx - 1, baseY - 22, 3, 22);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(lx - 1, baseY - 22, 1, 22);

      // Snow cap on post top
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx - 2, baseY - 24, 5, 2);

      // Iron hanging arm
      ctx.fillStyle = '#334155';
      ctx.fillRect(dir > 0 ? lx + 1 : lx - 7, baseY - 21, 7, 2);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(dir > 0 ? lx + 1 : lx - 7, baseY - 21, 7, 1);

      // Lantern housing
      const gx = lx + dir * 6;
      const gy = baseY - 19;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(gx - 3, gy, 7, 1); // lantern roof
      ctx.fillRect(gx - 2, gy - 1, 5, 1);
      ctx.fillRect(gx - 2, gy + 7, 5, 1); // lantern base
      ctx.fillRect(gx - 2, gy + 1, 1, 6); // left frame
      ctx.fillRect(gx + 2, gy + 1, 1, 6); // right frame

      // Flickering golden flame inside lantern
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(gx - 1, gy + 2, 3, 5);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(gx - 1, gy + 2, 3, 3);
      ctx.fillStyle = '#fef08a';
      const flameH = flicker > 0 ? 3 : 2;
      ctx.fillRect(gx, gy + 2, 1, flameH);
    }
  }

  /** @private */
  _drawLanternHalos(ctx) {
    const flicker = Math.sin(this._elapsed * 11) * 1.5;
    const radiusOuter = Math.round(28 + flicker);
    const radiusInner = Math.round(14 + flicker * 0.5);

    const lanterns = [
      { x: 20, y: RAMP_Y - 15 },
      { x: 380, y: RAMP_Y - 15 },
    ];
    for (let i = 0; i < lanterns.length; i += 1) {
      const l = lanterns[i];
      drawDitheredHalo(ctx, l.x, l.y, radiusOuter, 'rgba(245, 158, 11, 0.22)', 0.55);
      drawDitheredHalo(ctx, l.x, l.y, radiusInner, 'rgba(254, 240, 138, 0.30)', 0.65);
    }
  }

  /** @private */
  _drawPenguinAccessory(ctx, accessory, drawX, drawY) {
    if (accessory === 'none') return;

    if (accessory === 'redScarf' || accessory === 'tealScarf' || accessory === 'goldScarf') {
      const main = accessory === 'redScarf' ? '#e11d48' : accessory === 'tealScarf' ? '#14b8a6' : '#f59e0b';
      const hi = accessory === 'redScarf' ? '#fda4af' : accessory === 'tealScarf' ? '#5eead4' : '#fde047';
      // Cozy scarf wrapped around neck (y + 8) with dangling tail
      ctx.fillStyle = main;
      ctx.fillRect(drawX + 3, drawY + 8, 10, 2);
      ctx.fillRect(drawX + 10, drawY + 10, 2, 3);
      ctx.fillStyle = hi;
      ctx.fillRect(drawX + 4, drawY + 8, 3, 1);
      ctx.fillRect(drawX + 10, drawY + 11, 1, 1);
    } else if (accessory === 'goldBeanie' || accessory === 'redBeanie' || accessory === 'tealBeanie') {
      const main = accessory === 'goldBeanie' ? '#f59e0b' : accessory === 'redBeanie' ? '#e11d48' : '#0d9488';
      const hi = accessory === 'goldBeanie' ? '#fde047' : accessory === 'redBeanie' ? '#fb7185' : '#5eead4';
      // Cute winter beanie + white pom-pom on crown
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(drawX + 4, drawY - 2, 8, 3);
      ctx.fillStyle = main;
      ctx.fillRect(drawX + 4, drawY - 1, 8, 2);
      ctx.fillStyle = hi;
      ctx.fillRect(drawX + 5, drawY - 1, 6, 1);
      // Pom-pom
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(drawX + 7, drawY - 3, 2, 2);
    }
  }

  /** @private */
  _drawPenguins(ctx) {
    const bearX = this._bear.x;

    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;

      let sprite = COMPILED_PENGUINS.idle0;
      let drawX = Math.round(p.x - 8);
      let drawY = Math.round(p.y);
      let showAccessory = true;
      let isNervous = false;

      if (p.status === 'idle') {
        const bearNear = Math.abs(bearX - p.x) < 28 && this._bear.mode !== 'grumble';
        if (bearNear) {
          sprite = COMPILED_PENGUINS.nervous;
          isNervous = true;
        } else if (p.blinkTimer > 0) {
          sprite = COMPILED_PENGUINS.blink;
        } else {
          const waddleStep = Math.floor(p.waddlePhase) % 2;
          sprite = waddleStep === 0 ? COMPILED_PENGUINS.idle0 : COMPILED_PENGUINS.idle1;
        }
      } else if (p.status === 'cheer') {
        if (p.cheerDelay <= 0) {
          sprite = COMPILED_PENGUINS.cheer;
          const progress = 1 - Math.max(0, p.timer) / 0.62;
          const hop = Math.round(Math.sin(progress * Math.PI) * 11);
          drawY -= hop;
        }
      } else if (p.status === 'panic') {
        sprite = COMPILED_PENGUINS.panic;
        const tremble = Math.round(Math.sin(this._elapsed * 78) * 1);
        drawX += tremble;

        // Bouncing red/gold pixel "!" alert above panicked penguin
        const bangBounce = Math.round(Math.abs(Math.sin(this._elapsed * 26)) * 3);
        const bx = Math.round(p.x);
        const by = drawY - 10 - bangBounce;
        ctx.fillStyle = '#0a1020';
        ctx.fillRect(bx - 1, by - 1, 4, 9);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(bx, by, 2, 4);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(bx, by + 5, 2, 2);
      } else if (p.status === 'falling') {
        showAccessory = false;
        const tumbleFrame = Math.floor(p.timer / 0.075) % 3;
        sprite =
          tumbleFrame === 0
            ? COMPILED_PENGUINS.fall0
            : tumbleFrame === 1
              ? COMPILED_PENGUINS.fall1
              : COMPILED_PENGUINS.fall2;

        // Vertical cartoon speed lines trailing behind diving penguin
        ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
        ctx.fillRect(drawX + 2, drawY - 9, 1, 7);
        ctx.fillRect(drawX + 13, drawY - 12, 1, 9);
        ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
        ctx.fillRect(drawX + 7, drawY - 14, 1, 6);
      }

      // Ground shadow on closed ramp
      if (p.status === 'idle' || p.status === 'cheer') {
        ctx.fillStyle = 'rgba(9, 26, 48, 0.4)';
        ctx.fillRect(Math.round(p.x - 5), RAMP_Y, 10, 1);
      }

      drawCompiledSprite(ctx, sprite, drawX, drawY, false);

      if (showAccessory) {
        this._drawPenguinAccessory(ctx, p.accessory, drawX, drawY);
      }

      // Tiny animated cyan sweat bead when bear patrols underneath
      if (isNervous && Math.floor(this._elapsed * 4 + i) % 2 === 0) {
        const dropY = drawY + 2 + (Math.floor(this._elapsed * 8) % 2);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(drawX + 13, dropY, 1, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX + 13, dropY, 1, 1);
      }
    }
  }

  /** @private */
  _drawPolarBear(ctx) {
    const bear = this._bear;
    const flipX = bear.dir < 0;
    let sprite = COMPILED_BEARS.walk0;
    let offsetY = 0;

    if (bear.mode === 'sprint') {
      const sprintFrames = [COMPILED_BEARS.sprint0, COMPILED_BEARS.sprint1, COMPILED_BEARS.sprint2];
      const frame = Math.floor(bear.walkPhase) % sprintFrames.length;
      sprite = sprintFrames[frame];
      offsetY = frame === 1 ? -2 : 0;
    } else if (bear.mode === 'chompOpen') {
      sprite = COMPILED_BEARS.chompOpen;
    } else if (bear.mode === 'chompSnap') {
      sprite = COMPILED_BEARS.chompSnap;
      offsetY = 1;
    } else if (bear.mode === 'chompChew') {
      const chewFrame = Math.floor(this._elapsed * 14) % 2;
      sprite = chewFrame === 0 ? COMPILED_BEARS.chompChew : COMPILED_BEARS.chompSnap;
    } else if (bear.mode === 'chompLick') {
      sprite = COMPILED_BEARS.chompLick;
    } else if (bear.mode === 'grumble') {
      sprite = COMPILED_BEARS.grumble;
      offsetY = Math.floor(this._elapsed * 12) % 2 === 0 ? 0 : -1;
    } else {
      const walkFrames = [
        COMPILED_BEARS.walk0,
        COMPILED_BEARS.walk1,
        COMPILED_BEARS.walk2,
        COMPILED_BEARS.walk3,
      ];
      sprite = walkFrames[Math.floor(bear.walkPhase) % walkFrames.length];
    }

    const drawX = Math.round(bear.x - 21);
    const drawY = Math.round(FLOOR_Y - 24 + offsetY);

    // Crisp pixel ground shadow in the snow
    ctx.fillStyle = 'rgba(11, 22, 44, 0.34)';
    ctx.fillRect(Math.round(bear.x - 16), FLOOR_Y, 32, 2);
    ctx.fillStyle = 'rgba(11, 22, 44, 0.18)';
    ctx.fillRect(Math.round(bear.x - 18), FLOOR_Y + 1, 36, 1);

    // Brief white hit-flash on chomp impact
    const flash = bear.hitFlashTimer > 0 && Math.floor(this._elapsed * 40) % 2 === 0 ? '#ffffff' : null;
    drawCompiledSprite(ctx, sprite, drawX, drawY, flipX, flash);
  }

  /** @private */
  _drawParticles(ctx) {
    for (let i = 0; i < this._particles.length; i += 1) {
      const pt = this._particles[i];
      const px = Math.round(pt.x);
      const py = Math.round(pt.y);

      if (pt.kind === 'heart') {
        // Tiny 5×4 pixel heart
        ctx.fillStyle = pt.color;
        ctx.fillRect(px - 2, py, 2, 1);
        ctx.fillRect(px + 1, py, 2, 1);
        ctx.fillRect(px - 2, py + 1, 5, 1);
        ctx.fillRect(px - 1, py + 2, 3, 1);
        ctx.fillRect(px, py + 3, 1, 1);
      } else if (pt.kind === 'sparkle') {
        ctx.fillStyle = pt.color;
        ctx.fillRect(px, py, 1, 1);
        if (pt.life > pt.maxLife * 0.45) {
          ctx.fillRect(px - 1, py, 3, 1);
          ctx.fillRect(px, py - 1, 1, 3);
        }
      } else {
        ctx.fillStyle = pt.color;
        ctx.fillRect(px, py, pt.size, pt.size);
      }
    }
  }

  /** @private */
  _drawComicBadge(ctx) {
    const bear = this._bear;
    if (!bear.bubbleText) return;

    const text = bear.bubbleText;
    const textW = text.length * 4 - 1;
    const padX = 5;
    const padY = 4;
    const boxW = textW + padX * 2;
    const boxH = 5 + padY * 2;

    const cx = Math.max(boxW / 2 + 6, Math.min(CANVAS_W - boxW / 2 - 6, Math.round(bear.x)));
    const bx = Math.round(cx - boxW / 2);
    const by = FLOOR_Y - 42;

    // Drop shadow
    ctx.fillStyle = 'rgba(7, 15, 32, 0.55)';
    ctx.fillRect(bx + 2, by + 2, boxW, boxH);

    // Outer border
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx + 1, by, boxW - 2, boxH);
    ctx.fillRect(bx, by + 1, boxW, boxH - 2);

    // Jagged spikes on "GRRR!" bubble
    if (bear.bubbleJagged) {
      ctx.fillRect(bx - 2, by + 3, 2, 2);
      ctx.fillRect(bx + boxW, by + 3, 2, 2);
      ctx.fillRect(bx + 4, by - 2, 2, 2);
      ctx.fillRect(bx + boxW - 6, by - 2, 2, 2);
    }

    // Crisp interior (warm cream for NOM!, pale amber for GRRR!)
    ctx.fillStyle = bear.bubbleJagged ? '#fef3c7' : '#ffffff';
    ctx.fillRect(bx + 1, by + 1, boxW - 2, boxH - 2);

    // Inner accent trim
    ctx.fillStyle = bear.bubbleJagged ? '#fde68a' : '#ffe4e6';
    ctx.fillRect(bx + 1, by + boxH - 2, boxW - 2, 1);

    // Pixel speech pointer tail
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 2, by + boxH, 5, 1);
    ctx.fillRect(cx - 1, by + boxH + 1, 3, 1);
    ctx.fillRect(cx, by + boxH + 2, 1, 1);
    ctx.fillStyle = bear.bubbleJagged ? '#fef3c7' : '#ffffff';
    ctx.fillRect(cx - 1, by + boxH - 1, 3, 2);
    ctx.fillRect(cx, by + boxH + 1, 1, 1);

    // Crisp pixel text with 1px shadow
    drawPixelText(ctx, text, cx + 1, by + padY + 1, 'rgba(15, 23, 42, 0.2)', 1, true);
    drawPixelText(ctx, text, cx, by + padY, bear.bubbleColor, 1, true);
  }
}
