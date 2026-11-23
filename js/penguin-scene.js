/**
 * Penguin Ice Bridge & Hungry Polar Bear Torchlit Crystal Cavern (`ISHULEN`)
 *
 * Vibrant, high-detail storybook pixel-art scene (320 × 180 logical resolution,
 * `imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`, ZERO checkerboard dithering!):
 *
 * 1. **Large, Chunky Multi-Part Outlined Characters (`#141020` bold pixel outlines)**:
 *    - **Emperor Penguins (`20 × 28` px each)**: Spaced across the bridge (`x = 29..291`, step `29px`)
 *      at `bridgeY = 74`. Multi-part pixel anatomy where the plump teardrop torso (`16×20`),
 *      rounded head (`12×10`), big expressive `2×3` eye + `1×1` white catchlight, golden-amber
 *      collar & cheek patch (`#ffe066`, `#ffa62b`, `#d96518`), 3-tone orange beak (`#ffb733`,
 *      `#f2741f`, `#b84314`), separately outlined navy flipper (`5×13`), and chunky orange webbed
 *      feet (`4×3`) each have crisp `#141020` dark outlines!
 *    - **Massive, Detailed Polar Bear (`70 × 44` px)**: Layered, individually outlined anatomical
 *      parts inspired by classic 16/32-bit storybook pixel art:
 *      - Layer 1: Far hind leg & far front leg with `#141020` outline, cool slate-blue fur (`#6c82a8`, `#8fa5c9`), and dark claws.
 *      - Layer 2: Heavy sculpted torso (`48×26`), rump, tail, and muscular shoulder hump with shaggy fur tufts and 5 rich cluster bands (`#fffef7`, `#f5ebd8`, `#e6c89c` torch bounce, `#b8cae3`, `#8aa0c4`) + interior shoulder/haunch contour lines.
 *      - Layer 3: Near hind leg (`14×20`) & near front leg (`13×20`) independently animated across 6 gallop phases, with shaggy elbow tufts, broad paws, 3 dark claws, and full `#141020` outlines overlapping the torso.
 *      - Layer 4: Neck, rounded back & front ears (`#382b47` inner ear), expressive head (`20×16`) with shaggy cheek ruff, sloped snout, shiny `4×3` berry nose (`#181224` + `1×1` highlight), `3×3` eye + `1×1` white catchlight + heavy brow ridge, and articulated lower jaw (`chompOpen` reveals `#7a1c2e` mouth, `#f26b8a` tongue, and `#ffffff` canine fangs).
 *
 * 2. **Rich Storybook Environment (`320 × 180`)**:
 *    - **Vibrant Royal-Blue Night Sky (`y = 0..74`)**: `#0c1938` → `#162f63` → `#234b91` → `#3870ba`
 *      with a big golden crescent moon (`x = 272, y = 22, r = 13`), golden 4-point diamond stars,
 *      and fluffy multi-tone billowy pixel clouds (`#f5f9ff`, `#bfd8f8`, `#7ba3d9`, `#466da6` with
 *      dark `#152852` outlines) rolling behind chunky outlined snow-capped mountains.
 *    - **Sturdy Timber & Ice Bridge (`y = 74..86`)**: Heavy outlined oak beams (`#4a2816`, `#754224`,
 *      `#a66338`, `#cf8854`), iron bolts, snow cushions (`#fffdf5`, `#cde0f5`), hanging icicles,
 *      hinged wooden trapdoors under each penguin, and warm hanging iron lanterns at both ends.
 *    - **Torchlit Rocky Ice Cavern (`y = 86..180`)**: Chunky outlined warm brown/ochre rock blocks
 *      (`#382115`, `#573420`, `#7d4d30`, `#a86d44`) & glacier-ice stone (`#283b5c`, `#3b5582`),
 *      2 animated flickering wall torches (`x = 48, y = 112` and `x = 272, y = 112`), 3 bright
 *      glowing cyan magic crystal clusters (`#e0ffff`, `#5ceeff`, `#17b8eb`, `#0d75ab` with `#141020`
 *      outlines), and a snow-covered cave floor (`y = 154..180`) with warm torchlit highlights and bear pawprints.
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM/window dependencies and can be imported directly in Node.js tests.
 */

const STYLE_ID = 'iq-penguin-arena-styles-storybook-v2';
const W = 320;
const H = 180;

const BRIDGE_Y = 74; // penguin feet level on top of the bridge snow cushions
const DECK_BOTTOM = 86; // underside of the bridge timber & ice deck
const FLOOR_Y = 154; // snow floor level inside ISHULEN where bear stands & penguins land
const GRAVITY = 430; // px/s² in 320×180 space
const BEAR_HOME_X = 64;
const SLOT_L = 29;
const SLOT_R = 291;

const LANTERNS = [
  { x: 14, y: 55, postX: 8, armDir: 1 },
  { x: 306, y: 55, postX: 312, armDir: -1 },
];

const WALL_TORCHES = [
  { x: 48, y: 112 },
  { x: 272, y: 112 },
];

const CRYSTAL_CLUSTERS = [
  { x: 24, y: 151, dir: 1, scale: 1.0 },
  { x: 160, y: 152, dir: 1, scale: 0.92 },
  { x: 296, y: 151, dir: -1, scale: 1.0 },
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
   Vibrant Storybook Pixel Palette (Zero Checkerboard Dithering)
   ========================================================================== */

const PAL = {
  // Bold pixel outlines
  outline: '#141020',
  outlineSky: '#152852',

  // Vibrant royal-blue night sky bands
  sky0: '#0c1938',
  sky1: '#162f63',
  sky2: '#234b91',
  sky3: '#3870ba',

  // Big golden crescent moon & 4-point diamond stars
  moonHi: '#fff3a1',
  moonMid: '#ffd042',
  moonLo: '#e69317',
  moonDeep: '#d98218',
  starCore: '#fff9cc',
  starGold: '#ffd042',
  starAmber: '#e69317',

  // Fluffy multi-tone billowy pixel clouds
  cloudHi: '#f5f9ff',
  cloudMid: '#bfd8f8',
  cloudLo: '#7ba3d9',
  cloudDeep: '#466da6',

  // Outlined snow-capped mountains
  mtnSnowHi: '#fffdf5',
  mtnSnowMid: '#d6e6fa',
  mtnRockHi: '#789bc9',
  mtnRockMid: '#4c6d9c',
  mtnRockLo: '#2b436e',

  // Sturdy oak timber & ice bridge
  oakDark: '#4a2816',
  oakMid: '#754224',
  oakWarm: '#a66338',
  oakHi: '#cf8854',
  boltHi: '#a9b8cf',
  boltLo: '#4a576e',
  iceHi: '#e6f7ff',
  iceMid: '#8adeff',
  iceLo: '#3ba3d9',
  iceDeep: '#1e6499',

  // Snow cushions & snow cave floor
  snowHi: '#fffdf5',
  snowTorch: '#ffe9b8',
  snowMid: '#cde0f5',
  snowLo: '#92b1d6',
  snowDeep: '#5b7aa6',

  // Warm torchlit rocky cavern & glacier stone blocks
  caveVoid: '#130d18',
  caveDeep: '#1f1421',
  rockDark: '#382115',
  rockMid: '#573420',
  rockWarm: '#7d4d30',
  rockHi: '#a86d44',
  iceStoneLo: '#283b5c',
  iceStoneHi: '#3b5582',

  // Flickering 4-tone pixel fire / torches
  fireCore: '#fff799',
  fireGold: '#ffbb33',
  fireOrange: '#f26419',
  fireRed: '#b82914',

  // Bright glowing cyan magic crystal clusters
  crystalCore: '#e0ffff',
  crystalHi: '#5ceeff',
  crystalMid: '#17b8eb',
  crystalLo: '#0d75ab',

  // Emperor Penguin anatomy (20×28)
  pNavyLo: '#1d284d',
  pNavyMid: '#2e4075',
  pNavyHi: '#4b67ab',
  pGoldHi: '#ffe066',
  pGoldMid: '#ffa62b',
  pGoldLo: '#d96518',
  pBellyHi: '#fffdf5',
  pBellyMid: '#d9e4f5',
  pBellyLo: '#9fb4d4',
  pBeakHi: '#ffb733',
  pBeakMid: '#f2741f',
  pBeakLo: '#b84314',

  // Massive Polar Bear anatomy (70×44)
  bRidgeHi: '#fffef7',
  bMainCream: '#f5ebd8',
  bTorchBounce: '#e6c89c',
  bMidShadow: '#b8cae3',
  bCoreShadow: '#8aa0c4',
  bFarHi: '#8fa5c9',
  bFarLo: '#6c82a8',
  bInnerEar: '#382b47',
  bNose: '#181224',
  bMouth: '#7a1c2e',
  bTongue: '#f26b8a',
  bFang: '#ffffff',
};

/* ==========================================================================
   Pixel Font (5×5) for Crisp Speech Banners ("NOM!", "GRRR!", "!")
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
  if (total <= 1) return 24;
  const step = (SLOT_R - SLOT_L) / (total - 1);
  return clamp(Math.floor(step - 5), 16, 24);
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
  border: 2px solid #2b436e;
  background: #130d18;
  box-shadow: 0 14px 32px rgba(10, 12, 24, 0.45);
}
.penguin-arena-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 320 / 180;
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
   Offscreen Multi-Part Outlined Pixel Sprite Builder (Zero Checkerboard)
   ========================================================================== */

class PixelPartBuffer {
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.grid = new Array(width * height).fill(null);
  }

  clear() {
    this.grid.fill(null);
  }

  setPx(x, y, color) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return;
    this.grid[iy * this.w + ix] = color;
  }

  getPx(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return null;
    return this.grid[y * this.w + x];
  }

  fillRect(x, y, w, h, color) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    for (let dy = 0; dy < rh; dy += 1) {
      const py = y0 + dy;
      if (py < 0 || py >= this.h) continue;
      for (let dx = 0; dx < rw; dx += 1) {
        const px = x0 + dx;
        if (px < 0 || px >= this.w) continue;
        this.grid[py * this.w + px] = color;
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, color) {
    const icx = Math.round(cx);
    const icy = Math.round(cy);
    const irx = Math.max(0.5, rx);
    const iry = Math.max(0.5, ry);
    const maxDy = Math.ceil(iry);
    for (let dy = -maxDy; dy <= maxDy; dy += 1) {
      const ny = dy / (iry + 0.35);
      if (Math.abs(ny) > 1) continue;
      const span = Math.floor(irx * Math.sqrt(Math.max(0, 1 - ny * ny)));
      this.fillRect(icx - span, icy + dy, span * 2 + 1, 1, color);
    }
  }

  fillCapsule(x0, y0, x1, y1, r0, r1, color) {
    const dist = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
    const steps = Math.ceil(dist * 2);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = lerp(x0, x1, t);
      const y = lerp(y0, y1, t);
      const r = lerp(r0, r1, t);
      this.fillEllipse(x, y, r, r, color);
    }
  }
}

/**
 * Wraps an anatomical part plotted in `partBuf` with a crisp 1px dark outline
 * (`outlineColor`, default `#141020`) and composites it onto `targetBuf`.
 * Every overlapping body part gets its own unmistakable silhouette contour!
 */
function commitOutlinedPart(targetBuf, partBuf, outlineColor = PAL.outline) {
  const { w, h, grid } = partBuf;
  const tGrid = targetBuf.grid;

  // Pass 1: 4-neighbour 1px dark outline around all non-empty pixels in partBuf
  for (let y = 0; y < h; y += 1) {
    const rowOff = y * w;
    for (let x = 0; x < w; x += 1) {
      if (grid[rowOff + x] !== null) continue;
      const hasLeft = x > 0 && grid[rowOff + x - 1] !== null;
      const hasRight = x < w - 1 && grid[rowOff + x + 1] !== null;
      const hasUp = y > 0 && grid[rowOff - w + x] !== null;
      const hasDown = y < h - 1 && grid[rowOff + w + x] !== null;
      if (hasLeft || hasRight || hasUp || hasDown) {
        tGrid[rowOff + x] = outlineColor;
      }
    }
  }

  // Also outline pixels on the outer edge of the buffer if touched
  for (let y = 0; y < h; y += 1) {
    const rowOff = y * w;
    for (let x = 0; x < w; x += 1) {
      const c = grid[rowOff + x];
      if (c !== null) {
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          tGrid[rowOff + x] = outlineColor;
        } else {
          tGrid[rowOff + x] = c;
        }
      }
    }
  }

  partBuf.clear();
}

/**
 * Draws a completed `PixelPartBuffer` onto the 2D canvas context anchored at bottom-center `(cx, bottomY)`.
 */
function drawPartBuffer(ctx, buf, cx, bottomY, flipX = false) {
  const { w, h, grid } = buf;
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(bottomY - h);

  for (let y = 0; y < h; y += 1) {
    const py = y0 + y;
    if (py < 0 || py >= H) continue;
    const rowOff = y * w;

    let runColor = null;
    let runStart = 0;
    for (let c = 0; c <= w; c += 1) {
      const srcX = flipX ? w - 1 - c : c;
      const color = c < w ? grid[rowOff + srcX] : null;
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

/* ==========================================================================
   1. LARGE Multi-Part Emperor Penguin Sprites (20 × 28 px each)
   ========================================================================== */

/**
 * Builds a 20×28 multi-part outlined Emperor Penguin frame (facing RIGHT by default).
 * @param {'idle0'|'idle1'|'blink'|'cheer'|'panic'|'fall'|'landed'} pose
 */
function buildPenguinFrame(pose) {
  const W_P = 20;
  const H_P = 28;
  const out = new PixelPartBuffer(W_P, H_P);
  const part = new PixelPartBuffer(W_P, H_P);

  const bob = pose === 'idle1' ? 1 : 0;
  const squash = pose === 'landed' ? 2 : 0;

  // --- PART 1: Far Webbed Orange Foot (4×3 with #141020 outline) ---
  const footY = pose === 'fall' ? 24 : 25;
  const farFootX = pose === 'panic' || pose === 'fall' ? 11 : 10;
  part.fillRect(farFootX, footY, 4, 2, PAL.pBeakMid);
  part.fillRect(farFootX + 1, footY, 3, 1, PAL.pBeakHi);
  part.fillRect(farFootX, footY + 1, 4, 1, PAL.pBeakLo);
  commitOutlinedPart(out, part);

  // --- PART 2: Plump Teardrop Torso (16×20) with Royal-Navy Back, Golden Collar & Cream Belly ---
  const bodyTop = 8 + bob + squash;
  const bodyBot = 25;
  for (let y = bodyTop; y <= bodyBot; y += 1) {
    const t = (y - bodyTop) / Math.max(1, bodyBot - bodyTop);
    // Plump teardrop contour widest at lower belly
    const halfW = Math.round(4.6 + Math.sin(t * Math.PI * 0.88) * 3.1 + (squash ? 0.8 : 0));
    const center = 9;
    const xL = Math.max(2, center - halfW);
    const xR = Math.min(16, center + halfW - 1);

    for (let x = xL; x <= xR; x += 1) {
      let col = PAL.pNavyLo;
      // Glossy royal-navy back & highlight on left/dorsal side
      if (x <= xL + 1) {
        col = PAL.pNavyLo;
      } else if (x <= xL + 3) {
        col = y < bodyTop + 11 ? PAL.pNavyHi : PAL.pNavyMid;
      } else if (x === xL + 4 && y < bodyTop + 14) {
        col = PAL.pNavyMid;
      } else {
        // Golden-amber upper chest collar fading into rounded cream-white belly
        if (y <= bodyTop + 2) {
          col = x >= xR - 1 ? PAL.pGoldHi : PAL.pGoldMid;
        } else if (y === bodyTop + 3) {
          col = PAL.pGoldLo;
        } else if (y >= bodyBot - 2 || x === xL + 4) {
          col = PAL.pBellyLo;
        } else if (y >= bodyBot - 5 || x === xL + 5) {
          col = PAL.pBellyMid;
        } else {
          col = PAL.pBellyHi;
        }
      }
      part.setPx(x, y, col);
    }
  }
  // Cute tail tuft on lower left
  part.fillRect(2, bodyBot - 2, 2, 2, PAL.pNavyLo);
  commitOutlinedPart(out, part);

  // --- PART 3: Near Webbed Orange Foot (4×3 with #141020 outline) ---
  const nearFootX = pose === 'panic' || pose === 'fall' ? 4 : 6;
  part.fillRect(nearFootX, footY, 4, 2, PAL.pBeakMid);
  part.fillRect(nearFootX + 1, footY, 3, 1, PAL.pBeakHi);
  part.fillRect(nearFootX, footY + 1, 4, 1, PAL.pBeakLo);
  commitOutlinedPart(out, part);

  // --- PART 4: Chunky 3-Tone Orange Beak (#ffb733, #f2741f, #b84314) ---
  const headTop = 1 + bob + squash;
  const beakY = headTop + 4;
  if (pose === 'cheer' || pose === 'panic' || pose === 'fall') {
    // Wide open beak!
    part.fillRect(14, beakY - 1, 4, 2, PAL.pBeakMid);
    part.fillRect(14, beakY - 1, 3, 1, PAL.pBeakHi);
    part.fillRect(14, beakY + 1, 3, 1, PAL.bMouth);
    part.fillRect(14, beakY + 2, 3, 1, PAL.pBeakLo);
  } else {
    // Closed chunky 3-tone beak
    part.fillRect(14, beakY, 4, 3, PAL.pBeakMid);
    part.fillRect(14, beakY, 3, 1, PAL.pBeakHi);
    part.fillRect(14, beakY + 2, 3, 1, PAL.pBeakLo);
  }
  commitOutlinedPart(out, part);

  // --- PART 5: Rounded Head (12×10) with Golden Cheek Patch & Expressive 2×3 Eye ---
  for (let dy = 0; dy < 8; dy += 1) {
    const y = headTop + dy;
    const span = dy === 0 || dy === 7 ? 3 : dy === 1 || dy === 6 ? 4 : 5;
    const cx = 9;
    for (let x = cx - span; x <= cx + span; x += 1) {
      let col = PAL.pNavyLo;
      if (x <= cx - span + 1 && dy >= 1 && dy <= 5) {
        col = PAL.pNavyHi; // glossy crown highlight
      } else if (x <= cx - 1) {
        col = PAL.pNavyMid;
      } else if (dy >= 3 && dy <= 6 && x >= cx && x <= cx + 2) {
        // Golden-amber ear & cheek patch
        col = dy === 3 ? PAL.pGoldHi : dy === 4 ? PAL.pGoldMid : PAL.pGoldLo;
      } else if (dy >= 2 && dy <= 5 && x >= cx + 2) {
        col = PAL.pBellyHi; // white face cheek around eye
      }
      part.setPx(x, y, col);
    }
  }
  commitOutlinedPart(out, part);

  // Big expressive 2×3 dark eye + 1×1 bright white catchlight stamped on the head
  const eyeX = 11;
  const eyeY = headTop + 2;
  if (pose === 'blink') {
    out.fillRect(eyeX, eyeY + 1, 3, 1, PAL.outline);
  } else {
    out.fillRect(eyeX, eyeY, 2, 3, PAL.outline);
    out.setPx(eyeX, eyeY, '#ffffff'); // 1×1 bright white catchlight
    if (pose === 'panic' || pose === 'fall') {
      out.setPx(eyeX + 1, eyeY + 2, '#ffffff'); // wide-eyed panic glint
    }
  }

  // --- PART 6: Separately Outlined Wing/Flipper (5×13) Overlapping the Torso ---
  if (pose === 'cheer') {
    // Flipper raised high in celebration
    for (let dy = 0; dy < 10; dy += 1) {
      const y = headTop + 2 + dy;
      const x0 = 3 + Math.floor(dy * 0.25);
      part.fillRect(x0, y, 3, 1, PAL.pNavyMid);
      part.setPx(x0, y, PAL.pNavyHi);
      part.setPx(x0 + 2, y, PAL.pNavyLo);
    }
  } else if (pose === 'panic' || pose === 'fall') {
    // Flipper flailing outward!
    for (let dx = 0; dx < 8; dx += 1) {
      const x = 1 + dx;
      const y = bodyTop + 2 + Math.floor(dx * 0.35);
      part.fillRect(x, y, 1, 3, PAL.pNavyMid);
      part.setPx(x, y, PAL.pNavyHi);
      part.setPx(x, y + 2, PAL.pNavyLo);
    }
  } else if (pose === 'landed') {
    // Splayed flipper on the snow
    for (let dx = 0; dx < 8; dx += 1) {
      const x = 2 + dx;
      const y = bodyTop + 6 + Math.floor(dx * 0.25);
      part.fillRect(x, y, 1, 3, PAL.pNavyMid);
      part.setPx(x, y, PAL.pNavyHi);
    }
  } else {
    // Resting 5×13 shaded navy flipper with its own #141020 contour over the torso
    const flipTop = bodyTop + 2;
    for (let dy = 0; dy < 11; dy += 1) {
      const y = flipTop + dy;
      const w = dy === 0 || dy === 10 ? 2 : 3;
      const x0 = 6 + (dy > 7 ? 1 : 0);
      part.fillRect(x0, y, w, 1, PAL.pNavyMid);
      part.setPx(x0, y, PAL.pNavyHi);
      if (w >= 3) part.setPx(x0 + w - 1, y, PAL.pNavyLo);
    }
  }
  commitOutlinedPart(out, part);

  return out;
}

const PENGUIN_FRAME_CACHE = {
  idle0: buildPenguinFrame('idle0'),
  idle1: buildPenguinFrame('idle1'),
  blink: buildPenguinFrame('blink'),
  cheer: buildPenguinFrame('cheer'),
  panic: buildPenguinFrame('panic'),
  fall: buildPenguinFrame('fall'),
  landed: buildPenguinFrame('landed'),
};

/* ==========================================================================
   2. MASSIVE, Detailed Multi-Part Polar Bear Sprites (70 × 44 px)
   ========================================================================== */

/**
 * Helper to draw a thick, muscular bear leg into `partBuf` with 4-5 solid cluster bands,
 * shaggy elbow/heel fur tufts, broad paw, and 3 dark claws.
 */
function plotBearLeg(partBuf, hipX, hipY, kneeX, kneeY, pawX, pawY, isFar) {
  const hiCol = isFar ? PAL.bFarHi : PAL.bRidgeHi;
  const mainCol = isFar ? PAL.bFarHi : PAL.bMainCream;
  const bounceCol = isFar ? PAL.bFarLo : PAL.bTorchBounce;
  const midCol = isFar ? PAL.bFarLo : PAL.bMidShadow;
  const coreCol = isFar ? PAL.bFarLo : PAL.bCoreShadow;

  // Upper thigh / shoulder to knee
  partBuf.fillCapsule(hipX, hipY, kneeX, kneeY, 5.2, 4.2, mainCol);
  // Lower shin to ankle
  partBuf.fillCapsule(kneeX, kneeY, pawX, pawY - 2, 4.0, 3.6, mainCol);
  // Broad heavy paw pad
  partBuf.fillRect(pawX - 4, pawY - 3, 10, 4, mainCol);

  // Shaggy fur tufts at the back of the elbow/hock
  const kIx = Math.round(kneeX);
  const kIy = Math.round(kneeY);
  partBuf.fillRect(kIx - 6, kIy - 1, 3, 2, midCol);
  partBuf.fillRect(kIx - 7, kIy + 1, 3, 1, coreCol);

  // Cluster-shaded color bands across the leg pixels
  const minY = Math.max(1, Math.round(hipY - 6));
  const maxY = Math.min(partBuf.h - 2, Math.round(pawY + 1));
  for (let y = minY; y <= maxY; y += 1) {
    let leftMost = partBuf.w;
    let rightMost = -1;
    for (let x = 0; x < partBuf.w; x += 1) {
      if (partBuf.getPx(x, y) !== null) {
        if (x < leftMost) leftMost = x;
        if (x > rightMost) rightMost = x;
      }
    }
    if (rightMost < leftMost) continue;
    const span = Math.max(1, rightMost - leftMost + 1);
    for (let x = leftMost; x <= rightMost; x += 1) {
      if (partBuf.getPx(x, y) === null) continue;
      const relX = (x - leftMost) / span;
      if (relX > 0.72) {
        partBuf.setPx(x, y, hiCol); // sunlit/moonlit leading edge
      } else if (relX > 0.38) {
        partBuf.setPx(x, y, y > pawY - 5 ? bounceCol : mainCol);
      } else if (relX > 0.18) {
        partBuf.setPx(x, y, midCol);
      } else {
        partBuf.setPx(x, y, coreCol);
      }
    }
  }
}

/**
 * Builds a 70×44 layered, multi-part outlined Polar Bear frame (facing RIGHT by default).
 * Every leg, torso, ear, head, snout, and jaw has its own `#141020` dark outline!
 *
 * @param {'idle0'|'idle1'|'blink'|'run0'|'run1'|'run2'|'run3'|'run4'|'run5'|'chompOpen'|'chompClosed'} pose
 */
function buildBearFrame(pose) {
  const W_B = 70;
  const H_B = 44;
  const out = new PixelPartBuffer(W_B, H_B);
  const part = new PixelPartBuffer(W_B, H_B);

  // Pose vertical offset & gait leg keyframes (6 gallop phases + idle/chomp)
  let bodyBob = 0;
  let headBob = 0;
  let jawOpen = false;
  let eyeClosed = false;

  // Leg coordinates: [hipX, hipY, kneeX, kneeY, pawX, pawY]
  let farHind = [21, 24, 20, 32, 21, 41];
  let farFront = [44, 24, 44, 32, 46, 41];
  let nearHind = [16, 24, 14, 32, 15, 42];
  let nearFront = [39, 24, 39, 32, 40, 42];

  if (pose === 'idle1') {
    bodyBob = 1;
    headBob = 1;
  } else if (pose === 'blink') {
    eyeClosed = true;
  } else if (pose === 'chompOpen') {
    jawOpen = true;
    headBob = -1;
    nearFront = [40, 24, 42, 32, 44, 42];
  } else if (pose === 'chompClosed') {
    eyeClosed = true;
    bodyBob = 1;
    headBob = 1;
  } else if (pose === 'run0') {
    // Powerful bound launch: front legs reaching forward, hind legs pushing back
    bodyBob = -2;
    headBob = -2;
    farHind = [19, 23, 14, 31, 10, 39];
    nearHind = [15, 23, 10, 32, 6, 41];
    farFront = [45, 22, 51, 29, 57, 36];
    nearFront = [41, 23, 47, 31, 53, 39];
  } else if (pose === 'run1') {
    // Airborne extended suspension phase
    bodyBob = -3;
    headBob = -2;
    farHind = [18, 22, 12, 29, 7, 36];
    nearHind = [15, 22, 9, 30, 5, 38];
    farFront = [45, 21, 52, 28, 59, 34];
    nearFront = [41, 22, 49, 29, 55, 37];
  } else if (pose === 'run2') {
    // Front paws planting
    bodyBob = -1;
    headBob = 0;
    farHind = [19, 23, 16, 32, 14, 40];
    nearHind = [15, 24, 12, 33, 10, 42];
    farFront = [45, 23, 48, 32, 50, 41];
    nearFront = [41, 24, 44, 33, 45, 42];
  } else if (pose === 'run3') {
    // Front legs pulling under, hind legs swinging forward
    bodyBob = 1;
    headBob = 1;
    farHind = [20, 25, 23, 33, 26, 40];
    nearHind = [16, 25, 19, 33, 22, 42];
    farFront = [44, 25, 41, 33, 38, 41];
    nearFront = [40, 25, 36, 34, 33, 42];
  } else if (pose === 'run4') {
    // Gathered coiled suspension under torso
    bodyBob = 0;
    headBob = 0;
    farHind = [20, 24, 25, 32, 29, 39];
    nearHind = [16, 24, 21, 32, 25, 41];
    farFront = [44, 24, 39, 32, 34, 39];
    nearFront = [40, 24, 35, 32, 31, 41];
  } else if (pose === 'run5') {
    // Hind legs planting and driving forward
    bodyBob = -1;
    headBob = -1;
    farHind = [20, 24, 21, 33, 22, 41];
    nearHind = [16, 24, 17, 33, 18, 42];
    farFront = [44, 23, 47, 31, 51, 38];
    nearFront = [40, 23, 43, 32, 47, 40];
  }

  // --- LAYER 1: Far Legs (Far Hind & Far Front, deep slate-blue with #141020 outline) ---
  plotBearLeg(part, farHind[0], farHind[1] + bodyBob, farHind[2], farHind[3], farHind[4], farHind[5], true);
  commitOutlinedPart(out, part);
  // Far hind claws
  out.setPx(farHind[4] + 4, farHind[5] - 1, PAL.outline);
  out.setPx(farHind[4] + 6, farHind[5] - 1, PAL.outline);

  plotBearLeg(part, farFront[0], farFront[1] + bodyBob, farFront[2], farFront[3], farFront[4], farFront[5], true);
  commitOutlinedPart(out, part);
  // Far front claws
  out.setPx(farFront[4] + 4, farFront[5] - 1, PAL.outline);
  out.setPx(farFront[4] + 6, farFront[5] - 1, PAL.outline);

  // --- LAYER 2: Massive Sculpted Torso (48×26), Rump, Tail & Muscular Shoulder Hump ---
  const tLeft = 8;
  const tRight = 50;
  for (let x = tLeft; x <= tRight; x += 1) {
    const nx = (x - tLeft) / (tRight - tLeft); // 0..1 from rump to chest

    // Sculpted top profile: rounded heavy rump (nx~0.2) + prominent shoulder hump (nx~0.72)
    const rumpArch = Math.sin(clamp(nx / 0.55, 0, 1) * Math.PI) * 3.5;
    const shoulderHump = Math.exp(-Math.pow((nx - 0.72) / 0.2, 2)) * 5.2;
    const edgeRound = nx < 0.08 ? (0.08 - nx) * 45 : nx > 0.92 ? (nx - 0.92) * 35 : 0;
    const topY = Math.round(13 + bodyBob - rumpArch - shoulderHump + edgeRound);

    // Sculpted bottom profile: deep chest & shaggy belly with jagged fur tufts
    const chestDepth = Math.sin(nx * Math.PI) * 4.5;
    const shaggyTuft = (x % 4 === 0 && nx > 0.25 && nx < 0.85) ? 1 : 0;
    const botY = Math.round(25 + bodyBob + chestDepth + shaggyTuft - edgeRound * 0.6);

    // Shaggy top fur tufts along shoulder hump
    const topTuft = (x % 3 === 0 && nx > 0.55 && nx < 0.82) ? 1 : 0;
    const y0 = topY - topTuft;

    for (let y = y0; y <= botY; y += 1) {
      const span = Math.max(1, botY - y0);
      const ny = (y - y0) / span;
      let col = PAL.bMainCream;
      if (ny < 0.17) {
        col = PAL.bRidgeHi; // moonlit top ridge (#fffef7)
      } else if (ny < 0.54) {
        col = PAL.bMainCream; // warm cream main fur (#f5ebd8)
      } else if (ny < 0.76) {
        col = nx > 0.58 ? PAL.bTorchBounce : PAL.bMidShadow; // warm golden torch bounce on chest (#e6c89c)
      } else if (ny < 0.9) {
        col = nx > 0.45 && nx < 0.85 ? PAL.bTorchBounce : PAL.bMidShadow;
      } else {
        col = PAL.bCoreShadow; // slate core underbelly shadow (#8aa0c4)
      }
      part.setPx(x, y, col);
    }
  }
  // Fluffy rounded bear tail tuft on the rump
  part.fillEllipse(7, 16 + bodyBob, 3, 2.5, PAL.bMainCream);
  part.fillRect(5, 14 + bodyBob, 3, 1, PAL.bRidgeHi);
  commitOutlinedPart(out, part);

  // Crisp interior contour lines + shaggy fur tufts at the haunch and shoulder hump
  for (let dy = 0; dy < 6; dy += 1) {
    out.setPx(23 + Math.floor(dy * 0.4), 16 + bodyBob + dy, PAL.outline);
    out.setPx(36 - Math.floor(dy * 0.3), 13 + bodyBob + dy, PAL.outline);
  }
  out.setPx(28, 12 + bodyBob, PAL.outline);
  out.setPx(33, 10 + bodyBob, PAL.outline);

  // --- LAYER 3: Near Legs (Thick 14×20 Near Hind & 13×20 Near Front with Full #141020 Outlines) ---
  plotBearLeg(part, nearHind[0], nearHind[1] + bodyBob, nearHind[2], nearHind[3], nearHind[4], nearHind[5], false);
  commitOutlinedPart(out, part);
  // 3 dark claws on near hind paw
  out.setPx(nearHind[4] + 3, nearHind[5] - 1, PAL.outline);
  out.setPx(nearHind[4] + 5, nearHind[5] - 1, PAL.outline);
  out.setPx(nearHind[4] + 6, nearHind[5] - 2, PAL.outline);

  plotBearLeg(part, nearFront[0], nearFront[1] + bodyBob, nearFront[2], nearFront[3], nearFront[4], nearFront[5], false);
  commitOutlinedPart(out, part);
  // 3 dark claws on near front paw
  out.setPx(nearFront[4] + 3, nearFront[5] - 1, PAL.outline);
  out.setPx(nearFront[4] + 5, nearFront[5] - 1, PAL.outline);
  out.setPx(nearFront[4] + 6, nearFront[5] - 2, PAL.outline);

  // --- LAYER 4: Neck, Ears, Sculpted Head (20×16), Muzzle & Articulated Lower Jaw ---
  const hTop = 10 + headBob;

  // 4a. Rounded Back Ear (outlined separately)
  part.fillEllipse(51, hTop - 2, 3, 3, PAL.bMidShadow);
  part.fillRect(50, hTop - 4, 3, 1, PAL.bMainCream);
  commitOutlinedPart(out, part);

  // 4b. Articulated Lower Jaw & Open Mouth (when chomping / roaring)
  if (jawOpen) {
    // Wide open lower jaw with dark red mouth (#7a1c2e), pink tongue (#f26b8a) & sharp white fangs!
    part.fillRect(53, hTop + 10, 12, 6, PAL.bMouth);
    part.fillRect(56, hTop + 12, 7, 2, PAL.bTongue);
    part.fillRect(52, hTop + 14, 12, 2, PAL.bTorchBounce);
    part.fillRect(51, hTop + 15, 11, 1, PAL.bCoreShadow);
    commitOutlinedPart(out, part);

    // Sharp white lower & upper canine fangs (#ffffff)
    out.fillRect(62, hTop + 9, 2, 2, PAL.bFang);
    out.fillRect(58, hTop + 9, 1, 2, PAL.bFang);
    out.fillRect(62, hTop + 13, 2, 2, PAL.bFang);
    out.fillRect(59, hTop + 13, 1, 2, PAL.bFang);
  } else {
    // Closed sturdy lower jaw & chin with warm torch bounce
    part.fillRect(52, hTop + 10, 12, 3, PAL.bTorchBounce);
    part.fillRect(51, hTop + 12, 11, 1, PAL.bCoreShadow);
    commitOutlinedPart(out, part);
  }

  // 4c. Expressive Sculpted Head & Sloped Snout (20×16) with Shaggy Cheek Ruff
  for (let x = 46; x <= 66; x += 1) {
    const isSnout = x >= 58;
    const topY = isSnout ? hTop + 3 + Math.floor((x - 58) * 0.28) : hTop + (x < 49 ? 49 - x : 0);
    // Shaggy cheek ruff hanging down around x = 47..53
    const ruffExtra = x >= 47 && x <= 53 ? 2 + (x % 2) : 0;
    const botY = isSnout ? hTop + 9 : hTop + 11 + ruffExtra;

    for (let y = topY; y <= botY; y += 1) {
      const ny = (y - topY) / Math.max(1, botY - topY);
      let col = PAL.bMainCream;
      if (ny < 0.22) {
        col = PAL.bRidgeHi;
      } else if (ny < 0.65) {
        col = PAL.bMainCream;
      } else if (ny < 0.85) {
        col = PAL.bTorchBounce;
      } else {
        col = PAL.bMidShadow;
      }
      part.setPx(x, y, col);
    }
  }
  commitOutlinedPart(out, part);

  // 4d. Furry Rounded Front Ear with Dark #382b47 Inner Ear (overlapping cranium!)
  part.fillEllipse(48, hTop - 1, 3.5, 3.2, PAL.bMainCream);
  part.fillRect(47, hTop - 3, 3, 1, PAL.bRidgeHi);
  part.fillRect(48, hTop - 1, 2, 2, PAL.bInnerEar);
  commitOutlinedPart(out, part);

  // 4e. Large Shiny Dark Berry Nose (4×3 #181224 with 1×1 white highlight)
  out.fillRect(64, hTop + 4, 4, 3, PAL.bNose);
  out.setPx(65, hTop + 4, '#ffffff'); // 1×1 nose catchlight

  // 4f. Big Expressive 3×3 Eye with 1×1 White Catchlight + Heavy Brow Ridge
  const eyeX = 55;
  const eyeY = hTop + 3;
  // Heavy brow ridge above eye
  out.fillRect(eyeX - 1, eyeY - 1, 4, 1, PAL.outline);
  if (eyeClosed) {
    out.fillRect(eyeX, eyeY + 1, 3, 1, PAL.outline);
  } else {
    out.fillRect(eyeX, eyeY, 3, 3, PAL.outline);
    out.setPx(eyeX + 1, eyeY, '#ffffff'); // 1×1 bright white catchlight
  }

  // Interior cheek & muzzle contour pixel accents
  out.setPx(50, hTop + 8, PAL.outline);
  out.setPx(51, hTop + 9, PAL.outline);
  if (!jawOpen) {
    out.fillRect(59, hTop + 10, 6, 1, PAL.outline); // mouth line
  }

  return out;
}

const BEAR_FRAME_CACHE = {
  idle0: buildBearFrame('idle0'),
  idle1: buildBearFrame('idle1'),
  blink: buildBearFrame('blink'),
  run0: buildBearFrame('run0'),
  run1: buildBearFrame('run1'),
  run2: buildBearFrame('run2'),
  run3: buildBearFrame('run3'),
  run4: buildBearFrame('run4'),
  run5: buildBearFrame('run5'),
  chompOpen: buildBearFrame('chompOpen'),
  chompClosed: buildBearFrame('chompClosed'),
};

/* ==========================================================================
   Direct Canvas Integer Pixel Primitives
   ========================================================================== */

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
 * Draws an outlined stone/rock block with 3-4 cluster-shaded color bands and a 1px `#141020` border.
 */
function drawOutlinedBlock(ctx, x, y, w, h, hiCol, midCol, loCol, deepCol) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw < 3 || rh < 3) return;

  // 1px dark outline (#141020)
  fillRectPx(ctx, rx, ry, rw, rh, PAL.outline);
  // Base mid fill
  fillRectPx(ctx, rx + 1, ry + 1, rw - 2, rh - 2, midCol);
  // Top highlight band
  fillRectPx(ctx, rx + 1, ry + 1, rw - 2, Math.max(1, Math.floor((rh - 2) * 0.28)), hiCol);
  // Left highlight edge
  fillRectPx(ctx, rx + 1, ry + 1, 1, rh - 3, hiCol);
  // Bottom shadow band
  const botH = Math.max(1, Math.floor((rh - 2) * 0.32));
  fillRectPx(ctx, rx + 1, ry + rh - 1 - botH, rw - 2, botH, loCol);
  if (deepCol && rh >= 6) {
    fillRectPx(ctx, rx + 2, ry + rh - 2, rw - 3, 1, deepCol);
  }
}

/**
 * Draws a bold pixel speech banner ("NOM!", "GRRR!", "!") with a 1px `#141020` outline.
 */
function drawSpeechBubble(ctx, text, cx, cy, bgColor, borderColor, textColor) {
  let textW = 0;
  for (const ch of text) {
    const g = PIXEL_FONT[ch];
    textW += (g ? g[0].length : 2) + 1;
  }
  textW = Math.max(1, textW - 1);

  const padX = 5;
  const padY = 4;
  const bw = textW + padX * 2;
  const bh = 5 + padY * 2;
  const x0 = clamp(Math.round(cx - bw / 2), 4, W - bw - 4);
  const y0 = clamp(Math.round(cy - bh), 4, H - bh - 6);

  // Drop shadow & bold #141020 outline
  fillRectPx(ctx, x0 + 1, y0 + 2, bw, bh, PAL.outline);
  fillRectPx(ctx, x0 + 1, y0, bw - 2, bh, PAL.outline);
  fillRectPx(ctx, x0, y0 + 1, bw, bh - 2, PAL.outline);

  // Golden border & cream interior
  fillRectPx(ctx, x0 + 1, y0 + 1, bw - 2, bh - 2, borderColor);
  fillRectPx(ctx, x0 + 2, y0 + 2, bw - 4, bh - 4, bgColor);

  // Speech pointer tail
  const tx = clamp(Math.round(cx), x0 + 4, x0 + bw - 5);
  fillRectPx(ctx, tx - 1, y0 + bh, 3, 2, PAL.outline);
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
   Pre-Baked Static Environment Layers (Sky, Moon, Clouds, Mountains, Cave Walls)
   ========================================================================== */

const CLOUD_GROUPS = [
  {
    cx: 56,
    baseY: 46,
    puffs: [
      { dx: -22, dy: -2, r: 8 },
      { dx: -11, dy: -7, r: 11 },
      { dx: 3, dy: -10, r: 13 },
      { dx: 16, dy: -6, r: 10 },
      { dx: 26, dy: -2, r: 7 },
    ],
  },
  {
    cx: 158,
    baseY: 42,
    puffs: [
      { dx: -26, dy: -2, r: 8 },
      { dx: -14, dy: -8, r: 12 },
      { dx: 0, dy: -12, r: 14 },
      { dx: 15, dy: -8, r: 11 },
      { dx: 27, dy: -3, r: 8 },
    ],
  },
  {
    cx: 244,
    baseY: 48,
    puffs: [
      { dx: -18, dy: -2, r: 7 },
      { dx: -7, dy: -7, r: 10 },
      { dx: 6, dy: -9, r: 11 },
      { dx: 18, dy: -4, r: 8 },
    ],
  },
];

const FAR_MOUNTAINS = [
  { x0: -12, peakX: 34, peakY: 32, x1: 88 },
  { x0: 62, peakX: 118, peakY: 25, x1: 176 },
  { x0: 148, peakX: 204, peakY: 29, x1: 262 },
  { x0: 234, peakX: 288, peakY: 33, x1: 338 },
];

const NEAR_MOUNTAINS = [
  { x0: -6, peakX: 64, peakY: 36, x1: 134 },
  { x0: 98, peakX: 162, peakY: 28, x1: 228 },
  { x0: 192, peakX: 252, peakY: 35, x1: 318 },
];

/* ==========================================================================
   PenguinArena — 320 × 180 High-Detail Storybook Pixel-Art Controller
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
    this._bear = this._createInitialBear();
    this._shakeTimer = 0;

    this._canvas = null;
    this._ctx = null;
    this._statusPill = null;
    this._statusNote = null;

    // Pre-build outlined cloud & moon buffers for ultra-crisp rendering
    this._moonBuf = this._buildMoonBuffer();
    this._cloudBuf = this._buildCloudsBuffer();

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
      blinkCooldown: 2.3,
      blinkTimer: 0,
      breathTimer: 1.4,
      dustTimer: 0,
      pawprintCooldown: 0,
      pawSide: 0,
      bubbleText: null,
      bubbleTimer: 0,
    };
  }

  /**
   * Resets all penguins onto the bridge, closes trapdoors, and places the bear at home (`x = 64`).
   * @param {number} [totalPenguins]
   */
  reset(totalPenguins = this._state ? this._state.total : 10) {
    this._clearTimers();
    this._state = createPenguinState(totalPenguins);
    this._particles = [];
    this._pawprints = [
      { x: 38, y: FLOOR_Y + 4, life: 999 },
      { x: 50, y: FLOOR_Y + 7, life: 999 },
      { x: 60, y: FLOOR_Y + 4, life: 999 },
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
   * 3. Penguin falls with gravity and lands on the snow floor (`landed` pose)
   * 4. ONLY AFTER landing, the polar bear bounds across the cave in a 6-phase gallop to the fallen penguin
   * 5. Bear chomps (`chompOpen` → `chompClosed` + camera shake + snow/feather burst + `"NOM!"` pixel banner)
   * 6. Bear stands still waiting right where it is, facing the remaining penguins
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
      bear.x = clamp(targetX - bear.dir * 26, 40, W - 40);
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
      this._spawnSnowBurst(targetX, BRIDGE_Y + 3, 7);
    }

    if (penguin) {
      penguin.status = 'panic';
      penguin.timer = 0.22; // 220ms panic before falling
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
        p.timer = 0.75;
        this._spawnSparkles(p.x, BRIDGE_Y - 26);
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
    for (let i = 0; i < 38; i += 1) {
      const x = 8 + Math.floor(seededRand(i * 3 + 1) * (W - 16));
      const y = 3 + Math.floor(seededRand(i * 3 + 2) * 34);
      // Keep stars clear of the big golden crescent moon at (272, 22)
      if (Math.hypot(x - 272, y - 22) < 20) continue;
      stars.push({
        x,
        y,
        diamond: i % 4 === 0,
        bigDiamond: i % 11 === 0,
        phase: seededRand(i * 5 + 3) * Math.PI * 2,
        speed: 1.4 + seededRand(i * 7 + 4) * 1.8,
      });
    }
    return stars;
  }

  /** @private */
  _createSnowflakes() {
    const flakes = [];
    for (let i = 0; i < 34; i += 1) {
      const front = i >= 22;
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
    for (let x = 22; x <= 298; x += 8) {
      const len = 4 + Math.floor(seededRand(x * 13) * 6);
      list.push({ x, len });
    }
    return list;
  }

  /** @private */
  _buildMoonBuffer() {
    // Big golden crescent moon (r = 13) at (272, 22) with dark #141020 outline
    const buf = new PixelPartBuffer(34, 34);
    const part = new PixelPartBuffer(34, 34);
    const cx = 17;
    const cy = 17;
    const r = 13;
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        const dMain = Math.hypot(dx, dy);
        // Carve inner crescent cutout shifted top-right
        const dCut = Math.hypot(dx - 6, dy + 3);
        if (dMain <= r && dCut > 10.2) {
          let col = PAL.moonMid;
          if (dx + dy < -4) {
            col = PAL.moonHi;
          } else if (dCut < 11.6 || dx + dy > 6) {
            col = PAL.moonLo;
          }
          if (dx + dy > 10) {
            col = PAL.moonDeep;
          }
          part.setPx(cx + dx, cy + dy, col);
        }
      }
    }
    commitOutlinedPart(buf, part, PAL.outline);
    return buf;
  }

  /** @private */
  _buildCloudsBuffer() {
    // Fluffy, billowy multi-tone pixel clouds (#f5f9ff, #bfd8f8, #7ba3d9, #466da6) with #152852 outline
    const buf = new PixelPartBuffer(W, 64);
    const part = new PixelPartBuffer(W, 64);

    for (const cg of CLOUD_GROUPS) {
      for (const pf of cg.puffs) {
        const px = cg.cx + pf.dx;
        const py = cg.baseY + pf.dy;
        part.fillEllipse(px, py, pf.r, pf.r * 0.88, PAL.cloudMid);
      }
      // Flat billowy cloud base
      part.fillRect(cg.cx - 24, cg.baseY - 4, 48, 6, PAL.cloudLo);

      // Multi-tone billowy cluster shading inside each puff
      for (const pf of cg.puffs) {
        const px = cg.cx + pf.dx;
        const py = cg.baseY + pf.dy;
        part.fillEllipse(px - 1, py - 2, pf.r * 0.78, pf.r * 0.62, PAL.cloudHi);
        part.fillEllipse(px + 1, py + 2, pf.r * 0.72, pf.r * 0.45, PAL.cloudLo);
      }

      // Deep periwinkle under-shadow along the cloud bottom
      for (let x = cg.cx - 28; x <= cg.cx + 28; x += 1) {
        for (let y = cg.baseY - 1; y <= cg.baseY + 3; y += 1) {
          if (part.getPx(x, y) !== null) {
            part.setPx(x, y, y >= cg.baseY + 1 ? PAL.cloudDeep : PAL.cloudLo);
          }
        }
      }
    }

    commitOutlinedPart(buf, part, PAL.outlineSky);
    return buf;
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
    if (this._particles.length < 220) {
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
        x: x + (Math.random() - 0.5) * 10,
        y: y - 1,
        vx: side * (16 + r * 44),
        vy: -20 - r * 38,
        g: 135,
        size: r < 0.5 ? 2 : 1,
        life: 0.4 + r * 0.28,
        max: 0.68,
        color: i % 3 === 0 ? PAL.snowMid : PAL.snowHi,
        floor: FLOOR_Y + 3,
      });
    }
  }

  /** @private */
  _spawnLandingPuff(x, y) {
    this._spawnSnowBurst(x, y, 14);
    for (let i = -1; i <= 1; i += 1) {
      this._addParticle({
        kind: 'puff',
        x: x + i * 5,
        y: y - 2,
        vx: i * 14,
        vy: -6,
        g: 0,
        r: 3,
        life: 0.42,
        max: 0.42,
        color: PAL.snowHi,
      });
    }
  }

  /** @private */
  _spawnChompBurst(x, y) {
    this._spawnSnowBurst(x, y, 16);
    const featherColors = [PAL.pNavyLo, PAL.pBellyHi, PAL.pGoldHi, PAL.pNavyHi, PAL.pBeakHi];
    for (let i = 0; i < 12; i += 1) {
      const ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const sp = 26 + Math.random() * 48;
      this._addParticle({
        kind: 'feather',
        x: x + (Math.random() - 0.5) * 10,
        y: y - 7,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 14,
        g: 32,
        sway: Math.random() * Math.PI * 2,
        life: 0.9 + Math.random() * 0.45,
        max: 1.35,
        color: featherColors[i % featherColors.length],
      });
    }
  }

  /** @private */
  _spawnSparkles(x, y) {
    const colors = [PAL.moonHi, PAL.moonMid, PAL.crystalHi];
    for (let i = 0; i < 5; i += 1) {
      this._addParticle({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 16,
        vy: -14 - Math.random() * 18,
        g: 12,
        life: 0.52 + Math.random() * 0.25,
        max: 0.77,
        color: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnBreath(heavy = false) {
    const b = this._bear;
    const snoutX = b.x + b.dir * 31;
    const snoutY = FLOOR_Y - 24;
    const count = heavy ? 4 : 2;
    for (let i = 0; i < count; i += 1) {
      this._addParticle({
        kind: 'puff',
        x: snoutX + b.dir * (i * 2),
        y: snoutY - i,
        vx: b.dir * (heavy ? 16 + i * 5 : 7 + i * 3),
        vy: -5 - i * 2,
        g: 0,
        r: heavy ? 3 : 2,
        life: 0.78,
        max: 0.78,
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

    // Rising ember sparks from the 2 cavern wall torches
    if (Math.random() < dt * 9) {
      const torch = WALL_TORCHES[Math.random() < 0.5 ? 0 : 1];
      this._addParticle({
        kind: 'ember',
        x: torch.x + (Math.random() - 0.5) * 4,
        y: torch.y - 8,
        vx: (Math.random() - 0.5) * 10,
        vy: -14 - Math.random() * 14,
        g: -4,
        life: 0.55 + Math.random() * 0.35,
        max: 0.9,
        color: Math.random() < 0.5 ? PAL.fireCore : PAL.fireGold,
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
          p.vy = 20;
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
          this._shakeTimer = Math.max(this._shakeTimer, 0.09);
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
        pt.x += Math.sin(t * 5 + pt.sway) * 11 * dt;
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
        bear.breathTimer = bear.mode === 'watch' ? 1.15 : 2.2;
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
      const stopDist = 26;
      const dx = target.x - bear.x;
      const dist = Math.abs(dx);
      bear.dir = dx >= 0 ? 1 : -1;
      bear.runTime += dt;

      bear.dustTimer -= dt;
      if (bear.dustTimer <= 0) {
        this._spawnSnowBurst(bear.x - bear.dir * 18, FLOOR_Y, 4);
        bear.dustTimer = 0.085;
      }

      bear.pawprintCooldown -= dt;
      if (bear.pawprintCooldown <= 0) {
        bear.pawSide = 1 - bear.pawSide;
        this._pawprints.push({
          x: Math.round(bear.x - bear.dir * 12),
          y: FLOOR_Y + 3 + bear.pawSide * 3,
          life: 10,
        });
        if (this._pawprints.length > 28) {
          this._pawprints.shift();
        }
        bear.pawprintCooldown = 0.11;
      }

      if (dist <= stopDist) {
        bear.mode = 'chompOpen';
        bear.modeTimer = 0.18;
        bear.targetIndex = target.index;
      } else {
        const step = Math.min(dist - stopDist + 1, 185 * dt);
        bear.x = clamp(bear.x + bear.dir * step, 36, W - 36);
      }
    } else if (bear.mode === 'chompOpen') {
      bear.modeTimer -= dt;
      if (bear.modeTimer <= 0) {
        const target = bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null;
        const burstX = target ? target.x : bear.x + bear.dir * 26;
        if (target && target.status !== 'eaten') {
          target.status = 'eaten';
        }
        bear.mode = 'chompClosed';
        bear.modeTimer = 0.54;
        this._setBubble('NOM!', 1.15);
        this._shakeTimer = 0.2;
        this._spawnChompBurst(burstX, FLOOR_Y - 8);
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
    this._spawnSnowBurst(bear.x - bear.dir * 16, FLOOR_Y, 6);
  }

  /* ------------------------------------------------------------------------
     Rendering Pipeline (320 × 180 High-Detail Storybook Scene)
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
      shakeX = Math.round((Math.random() * 2 - 1) * 2);
      shakeY = Math.round((Math.random() * 2 - 1) * 2);
    }

    ctx.save();
    if (shakeX || shakeY) {
      ctx.translate(shakeX, shakeY);
    }

    // 1. Vibrant Royal-Blue Night Sky (y = 0..74) + golden 4-point diamond stars + big crescent moon
    this._drawRoyalNightSky(ctx, t);

    // 2. Fluffy, billowy multi-tone pixel clouds rolling across the sky
    drawPartBuffer(ctx, this._cloudBuf, W / 2, 64, false);

    // 3. Chunky outlined snow-capped mountains in front of the clouds
    this._drawMountains(ctx);

    // 4. Background snowflakes
    this._drawSnowflakes(ctx, false);

    // 5. Warm Torchlit Rocky Ice Cavern (y = 86..180) with torches, cyan crystals & snow floor
    this._drawTorchlitCavern(ctx, t);

    // 6. Sturdy Timber & Ice Bridge (y = 74..86) + trapdoors + hanging lanterns
    this._drawTimberIceBridge(ctx, t);

    // 7. Large Outlined Emperor Penguins (20×28 each)
    this._drawPenguins(ctx, t);

    // 8. Massive Layered Outlined Polar Bear (70×44)
    this._drawPolarBear(ctx, t);

    // 9. Particles & foreground snowflakes
    this._drawParticles(ctx);
    this._drawSnowflakes(ctx, true);

    // 10. Pixel speech banners ("NOM!", "GRRR!")
    this._drawBearSpeechBubble(ctx);

    ctx.restore();
  }

  /** @private */
  _drawRoyalNightSky(ctx, t) {
    // Deep royal-blue night sky gradient bands (#0c1938 -> #162f63 -> #234b91 -> #3870ba)
    fillRectPx(ctx, 0, 0, W, 17, PAL.sky0);
    fillRectPx(ctx, 0, 17, W, 17, PAL.sky1);
    fillRectPx(ctx, 0, 34, W, 18, PAL.sky2);
    fillRectPx(ctx, 0, 52, W, 24, PAL.sky3);

    // Smooth curved horizon band steps (ZERO checkerboard!)
    for (let x = 0; x < W; x += 10) {
      const wave = Math.round(Math.sin(x * 0.024) * 2);
      fillRectPx(ctx, x, 16 + wave, 10, 2, PAL.sky1);
      fillRectPx(ctx, x, 33 + wave, 10, 2, PAL.sky2);
      fillRectPx(ctx, x, 51 + wave, 10, 2, PAL.sky3);
    }

    // Golden 4-point diamond stars & twinkling sky sparkles
    for (let i = 0; i < this._stars.length; i += 1) {
      const s = this._stars[i];
      const twinkle = Math.sin(t * s.speed + s.phase);
      if (s.bigDiamond) {
        // Big golden 4-point diamond star (like the reference image!)
        fillRectPx(ctx, s.x - 1, s.y - 1, 3, 3, PAL.starAmber);
        fillRectPx(ctx, s.x - 2, s.y, 5, 1, PAL.starGold);
        fillRectPx(ctx, s.x, s.y - 2, 1, 5, PAL.starGold);
        fillRectPx(ctx, s.x, s.y, 1, 1, PAL.starCore);
      } else if (s.diamond) {
        fillRectPx(ctx, s.x, s.y, 1, 1, PAL.starCore);
        if (twinkle > -0.35) {
          fillRectPx(ctx, s.x - 1, s.y, 1, 1, PAL.starGold);
          fillRectPx(ctx, s.x + 1, s.y, 1, 1, PAL.starGold);
          fillRectPx(ctx, s.x, s.y - 1, 1, 1, PAL.starGold);
          fillRectPx(ctx, s.x, s.y + 1, 1, 1, PAL.starGold);
        }
      } else {
        fillRectPx(ctx, s.x, s.y, 1, 1, twinkle > 0 ? PAL.starCore : PAL.starGold);
      }
    }

    // Soft golden moon glow halo + big outlined golden crescent moon at (272, 22)
    fillEllipsePx(ctx, 272, 22, 19, 19, 'rgba(255, 208, 66, 0.10)');
    drawPartBuffer(ctx, this._moonBuf, 272, 22 + 17, false);
  }

  /** @private */
  _drawMountains(ctx) {
    const baseY = BRIDGE_Y;
    for (const m of FAR_MOUNTAINS) {
      this._drawMountainPeak(ctx, m.x0, m.peakX, m.peakY, m.x1, baseY, true);
    }
    for (const m of NEAR_MOUNTAINS) {
      this._drawMountainPeak(ctx, m.x0, m.peakX, m.peakY, m.x1, baseY, false);
    }
  }

  /** @private */
  _drawMountainPeak(ctx, x0, peakX, peakY, x1, baseY, isFar) {
    const height = baseY - peakY;
    if (height <= 0) return;

    const snowLeft = isFar ? PAL.mtnSnowMid : PAL.mtnSnowHi;
    const snowRight = isFar ? PAL.mtnRockHi : PAL.mtnSnowMid;
    const rockLeft = isFar ? PAL.mtnRockMid : PAL.mtnRockHi;
    const rockRight = isFar ? PAL.mtnRockLo : PAL.mtnRockMid;

    for (let y = peakY; y < baseY; y += 1) {
      const frac = (y - peakY) / height;
      const lx = Math.round(lerp(peakX, x0, frac));
      const rx = Math.round(lerp(peakX, x1, frac));
      const ridgeOffset = Math.round(Math.sin((y - peakY) * 0.32) * 2 + frac * 3);
      const ridgeX = clamp(peakX + ridgeOffset, lx + 1, rx - 1);

      const isSnowCap = frac < 0.42 + Math.sin(lx * 0.15) * 0.06;
      const lCol = isSnowCap ? snowLeft : rockLeft;
      const rCol = isSnowCap ? snowRight : rockRight;

      // Left sunlit slope
      fillRectPx(ctx, lx, y, ridgeX - lx, 1, lCol);
      // Right shaded slope
      fillRectPx(ctx, ridgeX, y, rx - ridgeX, 1, rCol);
      // Center ridge dark contour accent
      if (y % 2 === 0 && frac < 0.65) {
        fillRectPx(ctx, ridgeX, y, 1, 1, PAL.outlineSky);
      }
      // Bold dark mountain silhouette outline (#152852 / #141020)
      fillRectPx(ctx, lx, y, 1, 1, PAL.outline);
      fillRectPx(ctx, rx - 1, y, 1, 1, PAL.outline);
    }
  }

  /** @private */
  _drawTorchlitCavern(ctx, t) {
    // 1. Deep cavern void & warm torchlit inner stone arches (y = 86..180)
    fillRectPx(ctx, 0, DECK_BOTTOM, W, H - DECK_BOTTOM, PAL.caveVoid);
    fillRectPx(ctx, 18, DECK_BOTTOM, W - 36, FLOOR_Y - DECK_BOTTOM, PAL.caveDeep);

    // Background stone masonry arches inside the cavern
    const archPillars = [76, 152, 228];
    for (const pxCol of archPillars) {
      for (let by = DECK_BOTTOM + 4; by < FLOOR_Y - 6; by += 12) {
        drawOutlinedBlock(
          ctx,
          pxCol,
          by,
          16,
          12,
          PAL.iceStoneHi,
          PAL.iceStoneLo,
          PAL.rockDark,
          PAL.caveVoid
        );
      }
    }

    // Warm torchlight radial glow pools behind the 2 wall torches
    for (let i = 0; i < WALL_TORCHES.length; i += 1) {
      const wt = WALL_TORCHES[i];
      const flick = Math.round(Math.sin(t * 9 + i * 2.1) * 2);
      fillEllipsePx(ctx, wt.x, wt.y - 2, 46 + flick, 34 + flick, 'rgba(242, 100, 25, 0.11)');
      fillEllipsePx(ctx, wt.x, wt.y - 2, 28 + flick, 22 + flick, 'rgba(255, 187, 51, 0.16)');
      fillEllipsePx(ctx, wt.x, wt.y - 3, 14 + flick, 12 + flick, 'rgba(255, 247, 153, 0.22)');
    }

    // 2. Chunky Outlined Warm Brown/Ochre Cave Rock Walls & Glacier-Ice Stone Blocks
    const leftRockStack = [
      { x: 0, y: 86, w: 24, h: 14, warm: true },
      { x: 0, y: 100, w: 20, h: 14, warm: false },
      { x: 0, y: 114, w: 22, h: 14, warm: true },
      { x: 0, y: 128, w: 18, h: 14, warm: true },
      { x: 0, y: 142, w: 24, h: 13, warm: false },
      { x: 20, y: 86, w: 18, h: 11, warm: false },
      { x: 18, y: 97, w: 14, h: 11, warm: true },
    ];
    for (const b of leftRockStack) {
      if (b.warm) {
        drawOutlinedBlock(ctx, b.x, b.y, b.w, b.h, PAL.rockHi, PAL.rockWarm, PAL.rockMid, PAL.rockDark);
      } else {
        drawOutlinedBlock(ctx, b.x, b.y, b.w, b.h, PAL.iceStoneHi, PAL.iceStoneLo, PAL.rockDark, PAL.caveVoid);
      }
      // Mirror on right cave wall
      const rx = W - b.x - b.w;
      if (b.warm) {
        drawOutlinedBlock(ctx, rx, b.y, b.w, b.h, PAL.rockHi, PAL.rockWarm, PAL.rockMid, PAL.rockDark);
      } else {
        drawOutlinedBlock(ctx, rx, b.y, b.w, b.h, PAL.iceStoneHi, PAL.iceStoneLo, PAL.rockDark, PAL.caveVoid);
      }
    }

    // Outlined rocky ceiling boulders along top of cave (under the bridge)
    for (let cx = 36; cx <= 268; cx += 28) {
      const isWarm = (cx / 28) % 2 === 0;
      drawOutlinedBlock(
        ctx,
        cx,
        DECK_BOTTOM,
        28,
        8,
        isWarm ? PAL.rockHi : PAL.iceStoneHi,
        isWarm ? PAL.rockWarm : PAL.iceStoneLo,
        PAL.rockMid,
        PAL.rockDark
      );
    }

    // 3. Two Animated Wall Torches (x = 48, y = 112 and x = 272, y = 112)
    for (let i = 0; i < WALL_TORCHES.length; i += 1) {
      this._drawWallTorch(ctx, WALL_TORCHES[i].x, WALL_TORCHES[i].y, t, i);
    }

    // 4. Three Bright Glowing Cyan Magic Crystal Clusters (#e0ffff, #5ceeff, #17b8eb, #0d75ab with #141020 outlines)
    for (let i = 0; i < CRYSTAL_CLUSTERS.length; i += 1) {
      const c = CRYSTAL_CLUSTERS[i];
      this._drawOutlinedCrystalCluster(ctx, c.x, c.y, c.dir, t, i);
    }

    // 5. Chunky Outlined Snow Floor (y = 154..180) with warm torchlit highlights & cool blue shadows
    fillRectPx(ctx, 0, FLOOR_Y, W, 1, PAL.outline);
    fillRectPx(ctx, 0, FLOOR_Y + 1, W, H - FLOOR_Y - 1, PAL.snowDeep);
    fillRectPx(ctx, 0, FLOOR_Y + 1, W, 14, PAL.snowLo);
    fillRectPx(ctx, 0, FLOOR_Y + 1, W, 8, PAL.snowMid);
    fillRectPx(ctx, 0, FLOOR_Y + 1, W, 4, PAL.snowHi);

    // Warm golden torch-lit snow pools under the two wall torches
    for (const wt of WALL_TORCHES) {
      fillRectPx(ctx, wt.x - 24, FLOOR_Y + 1, 48, 3, PAL.snowTorch);
      fillRectPx(ctx, wt.x - 14, FLOOR_Y + 4, 28, 2, PAL.snowTorch);
    }

    // Billowy snowdrift mounds along the floor
    for (let x = 0; x < W; x += 12) {
      const h = Math.round(Math.sin(x * 0.05) * 1.5);
      fillRectPx(ctx, x, FLOOR_Y + 1 + Math.max(0, h), 12, 3, PAL.snowHi);
      fillRectPx(ctx, x, FLOOR_Y + 4 + Math.max(0, h), 12, 3, PAL.snowMid);
    }

    // Sub-surface chunky rock & glacier bricks along the very bottom rim (y = 169..180)
    for (let bx = 0; bx < W; bx += 20) {
      drawOutlinedBlock(
        ctx,
        bx,
        169,
        20,
        11,
        PAL.rockWarm,
        PAL.rockMid,
        PAL.rockDark,
        PAL.caveVoid
      );
    }

    // Bear pawprints in the snow
    for (let i = 0; i < this._pawprints.length; i += 1) {
      const pp = this._pawprints[i];
      fillRectPx(ctx, pp.x, pp.y, 3, 2, PAL.snowDeep);
      fillRectPx(ctx, pp.x - 1, pp.y - 1, 1, 1, PAL.snowLo);
      fillRectPx(ctx, pp.x + 1, pp.y - 1, 1, 1, PAL.snowLo);
      fillRectPx(ctx, pp.x + 3, pp.y - 1, 1, 1, PAL.snowLo);
    }
  }

  /** @private */
  _drawWallTorch(ctx, tx, ty, t, idx) {
    // Iron wall sconce & oak torch handle with #141020 outline
    fillRectPx(ctx, tx - 3, ty + 1, 6, 4, PAL.outline);
    fillRectPx(ctx, tx - 2, ty + 2, 4, 2, PAL.boltLo);
    fillRectPx(ctx, tx - 2, ty - 2, 4, 9, PAL.outline);
    fillRectPx(ctx, tx - 1, ty - 1, 2, 7, PAL.oakWarm);
    fillRectPx(ctx, tx - 3, ty - 3, 6, 3, PAL.outline);
    fillRectPx(ctx, tx - 2, ty - 2, 4, 1, PAL.boltHi);

    // Flickering 4-tone pixel flame (#fff799, #ffbb33, #f26419, #b82914) with #141020 outline
    const sway = Math.round(Math.sin(t * 14 + idx * 3.1));
    const stretch = Math.round(Math.cos(t * 11 + idx) * 1);

    // Outer dark flame contour
    fillRectPx(ctx, tx - 4, ty - 9, 8, 7, PAL.outline);
    fillRectPx(ctx, tx - 3 + sway, ty - 12 - Math.max(0, stretch), 6, 4, PAL.outline);
    fillRectPx(ctx, tx - 1 + sway, ty - 14 - Math.max(0, stretch), 3, 3, PAL.outline);

    // Deep red/orange outer flame
    fillRectPx(ctx, tx - 3, ty - 8, 6, 5, PAL.fireRed);
    fillRectPx(ctx, tx - 2 + sway, ty - 11 - Math.max(0, stretch), 4, 4, PAL.fireOrange);
    fillRectPx(ctx, tx + sway, ty - 13 - Math.max(0, stretch), 1, 2, PAL.fireOrange);

    // Golden mid flame
    fillRectPx(ctx, tx - 2, ty - 8, 4, 5, PAL.fireGold);
    fillRectPx(ctx, tx - 1 + sway, ty - 10 - Math.max(0, stretch), 2, 3, PAL.fireGold);

    // Bright yellow-white core
    fillRectPx(ctx, tx - 1, ty - 7, 2, 4, PAL.fireCore);
  }

  /** @private */
  _drawOutlinedCrystalCluster(ctx, cx, cy, dir, t, idx) {
    // Translucent cyan magic aura
    const pulse = 0.12 + 0.04 * Math.sin(t * 2.6 + idx * 1.7);
    fillEllipsePx(ctx, cx, cy - 9, 18, 13, `rgba(92, 238, 255, ${pulse.toFixed(3)})`);

    // 3 chunky faceted crystal shards with crisp #141020 outlines
    const shards = [
      { ox: -5 * dir, h: 14, w: 5, lean: -2 * dir },
      { ox: 0, h: 20, w: 6, lean: 1 * dir },
      { ox: 6 * dir, h: 12, w: 5, lean: 3 * dir },
    ];

    for (const sh of shards) {
      // Pass 1: #141020 dark outline around the crystal shard
      for (let dy = -1; dy <= sh.h; dy += 1) {
        const frac = clamp(dy / sh.h, 0, 1);
        const taper = dy > sh.h - 4 ? Math.max(1, sh.w - (dy - (sh.h - 4))) : sh.w;
        const sx = Math.round(cx + sh.ox + frac * sh.lean - taper / 2);
        const sy = cy - dy;
        fillRectPx(ctx, sx - 1, sy, taper + 2, 1, PAL.outline);
      }
      // Pass 2: 4-tone faceted cyan crystal interior (#e0ffff, #5ceeff, #17b8eb, #0d75ab)
      for (let dy = 0; dy < sh.h; dy += 1) {
        const frac = dy / sh.h;
        const taper = dy > sh.h - 4 ? Math.max(1, sh.w - (dy - (sh.h - 4))) : sh.w;
        const sx = Math.round(cx + sh.ox + frac * sh.lean - taper / 2);
        const sy = cy - dy;
        fillRectPx(ctx, sx, sy, taper, 1, PAL.crystalLo);
        if (taper >= 2) {
          fillRectPx(ctx, sx, sy, Math.ceil(taper * 0.7), 1, PAL.crystalMid);
        }
        if (taper >= 3) {
          fillRectPx(ctx, sx, sy, Math.ceil(taper * 0.4), 1, PAL.crystalHi);
        }
        if (dy >= sh.h - 4 || dy % 5 === 0) {
          fillRectPx(ctx, sx, sy, 1, 1, PAL.crystalCore);
        }
      }
    }
  }

  /** @private */
  _drawTimberIceBridge(ctx, t) {
    // 1. Sturdy Outlined Oak Support Posts & Lantern Cross-Arms on Left and Right
    for (const L of LANTERNS) {
      const px = L.postX;
      drawOutlinedBlock(ctx, px - 4, 46, 8, FLOOR_Y - 46, PAL.oakHi, PAL.oakWarm, PAL.oakMid, PAL.oakDark);
      const armX = L.armDir > 0 ? px + 2 : px - 12;
      drawOutlinedBlock(ctx, armX, 48, 10, 5, PAL.oakHi, PAL.oakWarm, PAL.oakMid, PAL.oakDark);
    }

    // Heavy continuous oak under-beam spanning the bridge (y = 81..86) with iron bolts
    drawOutlinedBlock(ctx, 10, 81, W - 20, 6, PAL.oakHi, PAL.oakWarm, PAL.oakMid, PAL.oakDark);
    for (let bx = 18; bx <= W - 18; bx += 29) {
      fillRectPx(ctx, bx - 1, 83, 2, 2, PAL.boltLo);
      fillRectPx(ctx, bx - 1, 83, 1, 1, PAL.boltHi);
    }

    // Lookup for open trapdoor gaps
    const isOpenGap = (x) => {
      for (let i = 0; i < this._trapdoors.length; i += 1) {
        const d = this._trapdoors[i];
        if (d.angle > 8 && x >= d.x0 && x < d.x0 + d.w) {
          return true;
        }
      }
      return false;
    };

    // 2. Outlined Glacier-Ice Deck Blocks (y = 75..81) topped with Snow Cushions (y = 72..75)
    const blockWidth = 16;
    for (let bx = 12; bx < W - 12; bx += blockWidth) {
      for (let dx = 0; dx < blockWidth; dx += 1) {
        const x = bx + dx;
        if (isOpenGap(x)) continue;

        const isSeam = dx === 0 || dx === blockWidth - 1;
        // Outlined ice deck block
        fillRectPx(ctx, x, 75, 1, 6, isSeam ? PAL.outline : PAL.iceMid);
        if (!isSeam) {
          fillRectPx(ctx, x, 75, 1, 2, PAL.iceHi);
          fillRectPx(ctx, x, 79, 1, 1, PAL.iceLo);
          fillRectPx(ctx, x, 80, 1, 1, PAL.iceDeep);
        }

        // Plump snow cushion on top of the bridge
        const edgeInset = isSeam ? 1 : 0;
        fillRectPx(ctx, x, 72 + edgeInset, 1, 1, PAL.outline);
        fillRectPx(ctx, x, 73 + edgeInset, 1, 2 - edgeInset, PAL.snowHi);
        fillRectPx(ctx, x, 75, 1, 1, PAL.snowMid);
      }
    }

    // 3. Hanging Icicles along the underside of the oak beam
    for (const ic of this._icicles) {
      if (isOpenGap(ic.x)) continue;
      for (let dy = 0; dy < ic.len; dy += 1) {
        const w = dy < 2 ? 2 : 1;
        fillRectPx(ctx, ic.x - 1, DECK_BOTTOM + dy, w + 2, 1, PAL.outline);
        const col = dy === 0 ? PAL.iceHi : dy < ic.len - 1 ? PAL.iceMid : PAL.iceLo;
        fillRectPx(ctx, ic.x, DECK_BOTTOM + dy, w, 1, col);
      }
    }

    // 4. Hinged Wooden Trapdoors under each Penguin (#4a2816, #754224, #a66338, #cf8854)
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const d = this._trapdoors[i];
      if (d.angle <= 2) {
        // Closed trapdoor plank with iron hinge bolts & snow cushion
        drawOutlinedBlock(ctx, d.x0, 75, d.w, 7, PAL.oakHi, PAL.oakWarm, PAL.oakMid, PAL.oakDark);
        fillRectPx(ctx, d.x0 + 2, 77, 2, 2, PAL.boltHi);
        fillRectPx(ctx, d.x0 + d.w - 4, 77, 2, 2, PAL.boltLo);
        // Snow cushion resting on top
        fillRectPx(ctx, d.x0 + 1, 72, d.w - 2, 1, PAL.outline);
        fillRectPx(ctx, d.x0 + 1, 73, d.w - 2, 2, PAL.snowHi);
        fillRectPx(ctx, d.x0 + 1, 75, d.w - 2, 1, PAL.snowMid);
      } else {
        // Swinging open trapdoor plank
        const rad = (d.angle * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const hx = d.x0 + 2;
        const hy = 80;
        for (let u = 0; u < d.w; u += 1) {
          const px = Math.round(hx + u * cosA);
          const py = Math.round(hy + u * sinA);
          fillRectPx(ctx, px - 2, py - 2, 5, 5, PAL.outline);
          fillRectPx(ctx, px - 1, py - 1, 3, 3, u % 4 === 0 ? PAL.oakMid : PAL.oakWarm);
          fillRectPx(ctx, px - 1, py - 1, 2, 1, PAL.oakHi);
        }
        fillRectPx(ctx, hx - 1, hy - 1, 2, 2, PAL.boltHi);
      }
    }

    // 5. Warm Hanging Iron Lanterns at both ends casting soft golden glow circles
    for (let i = 0; i < LANTERNS.length; i += 1) {
      const L = LANTERNS[i];
      const pulse = Math.round(Math.sin(t * 5 + i * 2));

      fillEllipsePx(ctx, L.x, L.y + 4, 24 + pulse, 18 + pulse, 'rgba(255, 208, 66, 0.09)');
      fillEllipsePx(ctx, L.x, L.y + 4, 13 + pulse, 10 + pulse, 'rgba(255, 243, 161, 0.16)');

      // Chain & iron roof
      fillRectPx(ctx, L.x, 52, 1, 3, PAL.outline);
      fillRectPx(ctx, L.x - 3, 55, 7, 2, PAL.outline);
      fillRectPx(ctx, L.x - 2, 55, 5, 1, PAL.boltHi);

      // Outlined lantern glass & glowing flame
      fillRectPx(ctx, L.x - 3, 57, 7, 6, PAL.outline);
      fillRectPx(ctx, L.x - 2, 57, 5, 5, PAL.fireOrange);
      fillRectPx(ctx, L.x - 1, 58, 3, 3, PAL.fireGold);
      fillRectPx(ctx, L.x, 58, 1, 2, PAL.fireCore);

      // Iron base
      fillRectPx(ctx, L.x - 3, 63, 7, 2, PAL.outline);
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
          const el = 0.75 - p.timer;
          yOffset = -Math.round(Math.abs(Math.sin((el * Math.PI) / 0.375)) * 6);
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

      // Contact shadow on snow cushion or cave snow floor
      if (p.status === 'idle' || p.status === 'cheer') {
        fillRectPx(ctx, drawX - 6, BRIDGE_Y, 12, 2, PAL.snowLo);
      } else if (p.status === 'landed') {
        fillRectPx(ctx, drawX - 7, FLOOR_Y + 1, 14, 2, PAL.snowLo);
      }

      const buf = PENGUIN_FRAME_CACHE[frameName] || PENGUIN_FRAME_CACHE.idle0;
      drawPartBuffer(ctx, buf, drawX, drawY + 1, p.facingDir < 0);

      // Cute alert badge "!" when panicking or freshly landed
      if (p.status === 'panic' || (p.status === 'landed' && Math.floor(t * 6) % 2 === 0)) {
        drawSpeechBubble(
          ctx,
          '!',
          drawX,
          drawY - 28,
          PAL.moonHi,
          PAL.fireOrange,
          PAL.outline
        );
      }
    }
  }

  /** @private */
  _drawPolarBear(ctx, t) {
    const b = this._bear;
    let frameName = 'idle0';

    if (b.mode === 'sprint') {
      // 6-phase animated 4-limb gallop!
      const cycle = ['run0', 'run1', 'run2', 'run3', 'run4', 'run5'];
      const idx = Math.floor(b.runTime * 16) % cycle.length;
      frameName = cycle[idx];
    } else if (b.mode === 'chompOpen') {
      frameName = 'chompOpen';
    } else if (b.mode === 'chompClosed') {
      frameName = 'chompClosed';
    } else if (b.mode === 'grumble') {
      frameName = Math.floor(t * 8) % 2 === 0 ? 'chompOpen' : 'chompClosed';
    } else {
      if (b.blinkTimer > 0) {
        frameName = 'blink';
      } else {
        frameName = Math.sin(t * 2.4) > 0.25 ? 'idle1' : 'idle0';
      }
    }

    const drawX = Math.round(b.x);
    const drawY = FLOOR_Y + 2;

    // Ground shadow cluster under the massive 70×44 bear
    fillRectPx(ctx, drawX - 24, FLOOR_Y + 1, 48, 3, PAL.snowDeep);
    fillRectPx(ctx, drawX - 20, FLOOR_Y + 2, 40, 2, PAL.outline);

    const buf = BEAR_FRAME_CACHE[frameName] || BEAR_FRAME_CACHE.idle0;
    drawPartBuffer(ctx, buf, drawX, drawY, b.dir < 0);
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
      } else if (pt.kind === 'ember') {
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
    const bx = clamp(Math.round(b.x + b.dir * 22), 28, W - 28);
    const by = FLOOR_Y - 38;
    drawSpeechBubble(
      ctx,
      b.bubbleText,
      bx,
      by,
      PAL.moonHi,
      PAL.fireOrange,
      PAL.outline
    );
  }
}
