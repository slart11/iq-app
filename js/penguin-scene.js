/**
 * Penguin Ice Bridge & Hungry Polar Bear Ice Cave — hi-bit pixel-art engine.
 *
 * Everything is rasterised by a tiny software renderer into a 480 × 216 framebuffer
 * (Uint32Array) using a fixed ~55-colour arctic palette, ordered Bayer 4×4 dithering,
 * palette-constrained lighting maps (moonlight, lantern warmth, crystal glow, fog,
 * shadow), and procedurally shaded sprites (per-pixel normals → 5–7 tone ramps,
 * selective outlines, moon rim light + teal crystal bounce light).
 * The framebuffer is blitted to a low-res canvas and upscaled with nearest-neighbour.
 *
 * Pure state helpers (`createPenguinState`, `dropOnePenguin`, `celebratePenguins`)
 * have zero DOM/window dependencies and can be imported directly in Node.js tests.
 */

const STYLE_ID = 'iq-penguin-arena-styles-px';
const W = 480;
const H = 216;
const SCALE = 3;
const SNOW_Y = 84; // bridge snow surface (penguin feet)
const BLOCK_Y = 88; // top of the ice block course
const DECK_BOTTOM = 98; // underside of the bridge
const FLOOR_Y = 192; // cave snow floor (bear paws / landed penguins)
const GRAVITY = 540; // px/s² in 480×216 space
const BEAR_HOME_X = 104;
const BRIDGE_L = 40;
const BRIDGE_R = 440;
const SLOT_L = 66;
const SLOT_R = 414;
const LANTERNS = [
  { x: 37, y: 60, post: 24, arm: 1 },
  { x: 443, y: 60, post: 454, arm: -1 },
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
   Palette, Dithering & Noise
   ========================================================================== */

const PAL_HEX = [
  '#05060f', '#0a0e1f', '#0f1630', '#152043', '#1c2b56', '#263a6b', '#335080', '#456b9a', // 0-7 night / deep ice
  '#5a86b0', '#78a4c8', '#9cc4de', '#c4e0ef', '#e6f4fb', '#ffffff', //                         8-13 ice & snow
  '#0e3b4a', '#13606a', '#1f8f8a', '#3cc7b0', '#8ff5dc', //                                    14-18 crystal teal
  '#1d6b4a', '#2fa36b', '#6fe39a', '#5b3d8f', '#8a63c9', //                                    19-23 aurora
  '#3a1f14', '#6b3a1e', '#a8622a', '#e09a3e', '#ffd27a', '#fff2c4', //                         24-29 lantern warmth
  '#2a1c16', '#4a3226', '#6e4c35', '#2b2f3a', '#4b5262', '#7a8394', //                         30-35 timber & iron
  '#3b4660', '#56637e', '#7a879c', '#a3adb9', '#c9cdc8', '#e4e0cf', '#f6f0dc', //              36-42 bear fur
  '#0b0d14', '#1b2230', '#2c3a52', '#44597a', //                                               43-46 penguin black/slate
  '#b8641e', '#f0a020', '#ffd84a', '#fff2a8', //                                               47-50 penguin gold
  '#5a1a2a', '#a33a52', '#e07a8a', '#c0283a', //                                               51-54 mouth / red
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const PAL_RGB = PAL_HEX.map(hexToRgb);
// Little-endian RGBA packed into Uint32 (ImageData byte order R,G,B,A).
const P = PAL_RGB.map(([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0);

function nearestIndex(r, g, b) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < PAL_RGB.length; i += 1) {
    const c = PAL_RGB[i];
    const dr = (c[0] - r) * 0.30;
    const dg = (c[1] - g) * 0.59;
    const db = (c[2] - b) * 0.11;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Builds a palette → palette colour remap (keeps every pixel inside the fixed palette). */
function buildMap(fn) {
  const map = new Map();
  for (let i = 0; i < PAL_RGB.length; i += 1) {
    const [r, g, b] = fn(PAL_RGB[i]);
    let j = nearestIndex(r, g, b);
    if (j === i) {
      // Nudge harder so the map always visibly shifts the tone.
      const [r2, g2, b2] = fn(fn(PAL_RGB[i]));
      j = nearestIndex(r2, g2, b2);
    }
    map.set(P[i], P[j]);
  }
  return map;
}

function blendTo(target, k) {
  return (c) => [c[0] + (target[0] - c[0]) * k, c[1] + (target[1] - c[1]) * k, c[2] + (target[2] - c[2]) * k];
}

const MAP_WARM = buildMap(blendTo([255, 178, 84], 0.42));
const MAP_MOON = buildMap(blendTo([200, 230, 255], 0.3));
const MAP_TEAL = buildMap(blendTo([70, 240, 210], 0.36));
const MAP_FOG = buildMap(blendTo([150, 190, 226], 0.34));
const MAP_DARK = buildMap((c) => [c[0] * 0.55, c[1] * 0.58, c[2] * 0.68]);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function bay(x, y) {
  return BAYER[((y & 3) << 2) | (x & 3)];
}

/** Picks a ramp tone for value v∈[0,1] with ordered dithering between neighbours. */
function tone(ramp, v, x, y) {
  const n = ramp.length - 1;
  let i = Math.floor(v * n + (bay(x, y) + 0.5) / 16);
  if (i < 0) i = 0;
  else if (i > n) i = n;
  return ramp[i];
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function seededRand(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul((y | 0) + 1013, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(seededRand(i), seededRand(i + 1), u);
}

function vnoise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = lerp(hash2(xi, yi), hash2(xi + 1, yi), u);
  const b = lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u);
  return lerp(a, b, v);
}

function getSlotX(index, total) {
  if (total <= 1) return 240;
  const step = (SLOT_R - SLOT_L) / (total - 1);
  return Math.round(SLOT_L + index * step);
}

function getTrapdoorWidth(total) {
  if (total <= 1) return 26;
  const step = (SLOT_R - SLOT_L) / (total - 1);
  return clamp(Math.floor(step - 10), 16, 26);
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
  border: 2px solid #1e3a5f;
  background: #05060f;
  box-shadow: 0 12px 32px rgba(4, 11, 24, 0.42);
}
.penguin-arena-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 480 / 216;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  background: #05060f;
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
   Framebuffer primitives
   ========================================================================== */

function px(buf, x, y, c) {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  buf[y * W + x] = c;
}

function mapPx(buf, x, y, map) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x;
  const c = map.get(buf[i]);
  if (c !== undefined) buf[i] = c;
}

/** Dithered radial palette remap (glows, light pools, shadows). */
function mapRadial(buf, cx, cy, rx, ry, density, map, power = 2) {
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(W - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y += 1) {
    const dy = (y + 0.5 - cy) / ry;
    for (let x = x0; x <= x1; x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const d = dx * dx + dy * dy;
      if (d >= 1) continue;
      const t = 1 - Math.sqrt(d);
      const k = (power === 1 ? t : t * t) * density;
      if (bay(x, y) < k * 16) {
        const i = y * W + x;
        const c = map.get(buf[i]);
        if (c !== undefined) buf[i] = c;
      }
    }
  }
}

/* ==========================================================================
   Pixel font (5×7) for speech badges
   ========================================================================== */

const GLYPHS = {
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  '!': ['1', '1', '1', '1', '1', '0', '1'],
};

/** Draws outlined, drop-shadowed pixel text centred on (cx, cy) at integer scale s. */
function drawBadge(buf, text, cx, cy, s, fillTop, fillBot, border, outline, shadow) {
  let gw = 0;
  for (const ch of text) gw += (GLYPHS[ch] ? GLYPHS[ch][0].length : 3) + 1;
  gw -= 1;
  const pad = 3;
  const mw = gw * s + pad * 2 + 1;
  const mh = 7 * s + pad * 2 + 1;
  const m = new Uint8Array(mw * mh);
  let ox = pad;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) {
      ox += 4 * s;
      continue;
    }
    for (let gy = 0; gy < 7; gy += 1) {
      for (let gx = 0; gx < g[gy].length; gx += 1) {
        if (g[gy][gx] !== '1') continue;
        for (let sy = 0; sy < s; sy += 1) {
          for (let sx = 0; sx < s; sx += 1) {
            m[(pad + gy * s + sy) * mw + ox + gx * s + sx] = 1;
          }
        }
      }
    }
    ox += (g[0].length + 1) * s;
  }
  const dilate = (src, from, val) => {
    for (let y = 1; y < mh - 1; y += 1) {
      for (let x = 1; x < mw - 1; x += 1) {
        const i = y * mw + x;
        if (src[i]) continue;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const v = src[i + dy * mw + dx];
            if (v && v <= from) {
              src[i] = val;
              dy = 2;
              break;
            }
          }
        }
      }
    }
  };
  dilate(m, 1, 2);
  dilate(m, 2, 3);
  const X = Math.round(cx - mw / 2);
  const Y = Math.round(cy - mh / 2);
  for (let y = 0; y < mh; y += 1) {
    for (let x = 0; x < mw; x += 1) {
      if (m[y * mw + x]) px(buf, X + x + 1, Y + y + 1, shadow);
    }
  }
  const split = pad + Math.floor(7 * s * 0.45);
  for (let y = 0; y < mh; y += 1) {
    for (let x = 0; x < mw; x += 1) {
      const v = m[y * mw + x];
      if (!v) continue;
      const c = v === 3 ? outline : v === 2 ? border : y < split ? fillTop : fillBot;
      px(buf, X + x, Y + y, c);
    }
  }
}

/* ==========================================================================
   Procedural shaded sprite rasteriser
   ========================================================================== */

const MAT = [];
function defMat(id, ramp, ol, olLit, rim, rim2, tex, dith) {
  MAT[id] = {
    ramp: ramp.map((i) => P[i]),
    ol: P[ol],
    olLit: P[olLit],
    rim: rim >= 0 ? P[rim] : 0,
    rim2: rim2 >= 0 ? P[rim2] : 0,
    tex,
    dith,
  };
}
const M_FUR = 1;
const M_NOSE = 2;
const M_MOUTH = 3;
const M_TEETH = 4;
const M_TONGUE = 5;
const M_EYE = 6;
const M_CLAW = 7;
const M_PBLACK = 8;
const M_PSLATE = 9;
const M_PWHITE = 10;
const M_PGOLD = 11;
const M_PCREAM = 12;
const M_PBEAK = 13;
const M_PORANGE = 14;
const M_PFEET = 15;
const M_CATCH = 16;
const M_PEYE = 17;
defMat(M_FUR, [36, 37, 38, 39, 40, 41, 42], 3, 37, 13, 16, 0.16, 1);
defMat(M_NOSE, [43, 44, 33, 35], 3, 36, 35, -1, 0, 0.5);
defMat(M_MOUTH, [51, 52, 53], 3, 36, -1, -1, 0, 0.6);
defMat(M_TEETH, [12, 13], 3, 36, -1, -1, 0, 0);
defMat(M_TONGUE, [52, 53], 51, 52, -1, -1, 0, 0.4);
defMat(M_EYE, [43], 43, 43, -1, -1, 0, 0);
defMat(M_CLAW, [43, 44], 43, 43, -1, -1, 0, 0);
defMat(M_PBLACK, [43, 43, 44, 45, 46], 43, 44, 7, -1, 0.05, 0.7);
defMat(M_PSLATE, [43, 44, 45, 46, 7], 43, 44, 8, -1, 0.08, 0.8);
defMat(M_PWHITE, [8, 9, 10, 11, 12, 13], 43, 45, 13, -1, 0.03, 0.8);
defMat(M_PGOLD, [47, 48, 49, 50], 43, 44, 50, -1, 0, 0.6);
defMat(M_PCREAM, [48, 49, 50, 12], 43, 44, 13, -1, 0, 0.7);
defMat(M_PBEAK, [43, 44, 45], 43, 43, 46, -1, 0, 0);
defMat(M_PORANGE, [47, 48, 27], 43, 43, -1, -1, 0, 0);
defMat(M_PFEET, [43, 44, 33], 43, 43, -1, -1, 0, 0.5);
defMat(M_CATCH, [13], 43, 43, -1, -1, 0, 0);
defMat(M_PEYE, [44], 43, 43, -1, -1, 0, 0);

const LIGHT = (() => {
  const l = [0.55, -0.62, 0.56];
  const n = Math.hypot(l[0], l[1], l[2]);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

class Sprite {
  constructor(w, h, ox, oy) {
    this.w = w;
    this.h = h;
    this.ox = ox;
    this.oy = oy;
    this.mat = new Uint8Array(w * h);
    this.sh = new Float32Array(w * h);
    this.m = [1, 0, 0, 1, ox, oy];
    this.stack = [];
    this.lx = LIGHT[0];
    this._tx = 0;
    this._ty = 0;
  }

  begin(facing) {
    this.mat.fill(0);
    this.m = [1, 0, 0, 1, this.ox, this.oy];
    this.stack.length = 0;
    this.lx = LIGHT[0] * (facing < 0 ? -1 : 1);
  }

  save() {
    this.stack.push(this.m.slice());
  }

  restore() {
    this.m = this.stack.pop();
  }

  translate(x, y) {
    const m = this.m;
    m[4] += m[0] * x + m[2] * y;
    m[5] += m[1] * x + m[3] * y;
  }

  rotate(a) {
    if (!a) return;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const m = this.m;
    const a0 = m[0];
    const b0 = m[1];
    const c0 = m[2];
    const d0 = m[3];
    m[0] = a0 * c + c0 * s;
    m[1] = b0 * c + d0 * s;
    m[2] = -a0 * s + c0 * c;
    m[3] = -b0 * s + d0 * c;
  }

  scale(k) {
    const m = this.m;
    m[0] *= k;
    m[1] *= k;
    m[2] *= k;
    m[3] *= k;
  }

  rotateAbout(x, y, a) {
    this.translate(x, y);
    this.rotate(a);
    this.translate(-x, -y);
  }

  _tp(x, y) {
    const m = this.m;
    this._tx = m[0] * x + m[2] * y + m[4];
    this._ty = m[1] * x + m[3] * y + m[5];
  }

  _put(x, y, id, nx, ny, nz, bias, flat) {
    const i = y * this.w + x;
    let s;
    if (flat >= 0) {
      s = flat;
    } else {
      const d = nx * this.lx + ny * LIGHT[1] + nz * LIGHT[2];
      s = 0.26 + 0.74 * (d > 0 ? d : 0) + bias;
      const tex = MAT[id].tex;
      if (tex) s += tex * (hash2(x >> 1, (y + (x >> 2)) >> 1) - 0.5);
    }
    this.mat[i] = id;
    this.sh[i] = s;
  }

  ellipse(cx, cy, rx, ry, ang, id, bias = 0, flat = -1) {
    const m = this.m;
    this._tp(cx, cy);
    const wx = this._tx;
    const wy = this._ty;
    const k = Math.hypot(m[0], m[1]);
    rx *= k;
    ry *= k;
    if (rx < 0.4 || ry < 0.4) return;
    const A = ang + Math.atan2(m[1], m[0]);
    const ca = Math.cos(A);
    const sa = Math.sin(A);
    const R = Math.max(rx, ry) + 1;
    const x0 = Math.max(0, Math.floor(wx - R));
    const x1 = Math.min(this.w - 1, Math.ceil(wx + R));
    const y0 = Math.max(0, Math.floor(wy - R));
    const y1 = Math.min(this.h - 1, Math.ceil(wy + R));
    for (let y = y0; y <= y1; y += 1) {
      const dy = y + 0.5 - wy;
      for (let x = x0; x <= x1; x += 1) {
        const dx = x + 0.5 - wx;
        const u = (dx * ca + dy * sa) / rx;
        const v = (-dx * sa + dy * ca) / ry;
        const q = u * u + v * v;
        if (q > 1) continue;
        const nz = Math.sqrt(1 - q);
        this._put(x, y, id, u * ca - v * sa, u * sa + v * ca, nz, bias, flat);
      }
    }
  }

  capsule(x1, y1, r1, x2, y2, r2, id, bias = 0, flat = -1) {
    const m = this.m;
    const k = Math.hypot(m[0], m[1]);
    this._tp(x1, y1);
    const ax = this._tx;
    const ay = this._ty;
    this._tp(x2, y2);
    const bx = this._tx;
    const by = this._ty;
    r1 = r1 * k + 0.2;
    r2 = r2 * k + 0.2;
    const R = Math.max(r1, r2) + 1;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - R));
    const xe = Math.min(this.w - 1, Math.ceil(Math.max(ax, bx) + R));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - R));
    const ye = Math.min(this.h - 1, Math.ceil(Math.max(ay, by) + R));
    const abx = bx - ax;
    const aby = by - ay;
    const L2 = abx * abx + aby * aby || 1e-6;
    for (let y = y0; y <= ye; y += 1) {
      const py = y + 0.5;
      for (let x = x0; x <= xe; x += 1) {
        const pxx = x + 0.5;
        let t = ((pxx - ax) * abx + (py - ay) * aby) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = pxx - (ax + abx * t);
        const dy = py - (ay + aby * t);
        const r = r1 + (r2 - r1) * t;
        const d2 = dx * dx + dy * dy;
        if (d2 > r * r) continue;
        const nz = Math.sqrt(Math.max(0, 1 - d2 / (r * r)));
        this._put(x, y, id, dx / r, dy / r, nz, bias, flat);
      }
    }
  }

  dot(x, y, id, shade = 0.5) {
    this._tp(x, y);
    const bx = Math.floor(this._tx);
    const by = Math.floor(this._ty);
    if (bx < 0 || by < 0 || bx >= this.w || by >= this.h) return;
    this._put(bx, by, id, 0, 0, 1, 0, shade);
  }

  _at(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.mat[y * this.w + x];
  }

  /** Resolves materials → palette, adds rim light + selective outline, blits to framebuffer. */
  resolve(buf, worldX, worldY, flip, opts = {}) {
    const { w, h } = this;
    const X = flip ? worldX - (w - 1 - this.ox) : worldX - this.ox;
    const Y = worldY - this.oy;
    const lsx = this.lx >= 0 ? 1 : -1;
    const flash = !!opts.flash;
    const rim2 = !!opts.rim2;
    for (let by = 0; by < h; by += 1) {
      const ty = Y + by;
      if (ty < 0 || ty >= H) continue;
      for (let bx = 0; bx < w; bx += 1) {
        const tx = flip ? X + (w - 1 - bx) : X + bx;
        if (tx < 0 || tx >= W) continue;
        const i = by * w + bx;
        const id = this.mat[i];
        if (id) {
          const M = MAT[id];
          let c;
          if (flash) {
            c = P[13];
          } else if (M.rim && this._at(bx + lsx, by - 1) === 0) {
            c = M.rim;
          } else if (rim2 && M.rim2 && this._at(bx - lsx, by) === 0 && this.sh[i] < 0.62) {
            c = M.rim2;
          } else {
            const ramp = M.ramp;
            const n = ramp.length - 1;
            let k = Math.floor(this.sh[i] * n + 0.5 + ((bay(bx, by) + 0.5) / 16 - 0.5) * M.dith);
            if (k < 0) k = 0;
            else if (k > n) k = n;
            c = ramp[k];
          }
          buf[ty * W + tx] = c;
        } else {
          const below = this._at(bx, by + 1);
          const nb = below || this._at(bx - 1, by) || this._at(bx + 1, by) || this._at(bx, by - 1);
          if (!nb) continue;
          const M2 = MAT[nb];
          buf[ty * W + tx] = flash ? P[12] : below && !this._at(bx, by - 1) ? M2.olLit : M2.ol;
        }
      }
    }
  }
}

/* ==========================================================================
   Static layer builders (sky, moon, glaciers, cave, floor, crystals, foreground)
   ========================================================================== */

const CRYSTAL_CLUSTERS = [
  { gx: 60, gy: 184, gr: 28, phase: 0.2, list: [[60, 194, 19, 3.3, 0.32], [53, 195, 12, 2.6, -0.28], [67, 194, 11, 2.3, 0.82], [48, 196, 7, 2, -0.75]] },
  { gx: 420, gy: 184, gr: 28, phase: 2.1, list: [[419, 194, 21, 3.5, -0.3], [427, 195, 12, 2.6, 0.36], [411, 195, 9, 2.2, -0.85], [433, 196, 7, 2, 0.78]] },
  { gx: 52, gy: 142, gr: 20, phase: 1.1, list: [[43, 143, 12, 2.4, 1.2], [44, 149, 9, 2, 1.62], [43, 138, 7, 1.8, 0.9]] },
  { gx: 428, gy: 128, gr: 20, phase: 3.3, list: [[437, 129, 13, 2.6, -1.2], [436, 135, 9, 2, -1.58], [437, 124, 7, 1.7, -0.86]] },
  { gx: 246, gy: 184, gr: 15, phase: 4.2, list: [[246, 191, 10, 2.1, 0.12], [240, 192, 6, 1.6, -0.45], [252, 192, 6, 1.6, 0.55]] },
];

function cliffLeftEdge(y) {
  return 46 + (vnoise(y * 0.13 + 2) - 0.5) * 10 + (vnoise(y * 0.37 + 9) - 0.5) * 5 - Math.max(0, y - 165) * 0.2;
}

function cliffRightEdge(y) {
  return 434 - (vnoise(y * 0.12 + 31) - 0.5) * 10 - (vnoise(y * 0.41 + 17) - 0.5) * 5 + Math.max(0, y - 165) * 0.2;
}

function floorSurface(x) {
  let fs = FLOOR_Y - 1 + Math.round(1.6 * vnoise(x * 0.05 + 1) + 1.3 * vnoise(x * 0.13 + 8) - 1.2);
  if (x < 74) fs -= Math.round((74 - x) * 0.32);
  if (x > 406) fs -= Math.round((x - 406) * 0.32);
  return fs;
}

function ridgeY(x, base, amp, freq, seed) {
  let r = 0;
  let a = 1;
  let f = freq;
  let tot = 0;
  for (let o = 0; o < 4; o += 1) {
    const n = vnoise(x * f + seed + o * 17.3);
    r += a * (1 - Math.abs(2 * n - 1));
    tot += a;
    a *= 0.5;
    f *= 2.13;
  }
  r /= tot;
  return base - amp * r * r;
}

function drawCrystal(buf, x0, y0, len, hw, ang) {
  const dx = Math.sin(ang);
  const dy = -Math.cos(ang);
  const qx = Math.cos(ang);
  const qy = Math.sin(ang);
  const R = len + hw + 2;
  for (let y = Math.floor(y0 - R); y <= Math.ceil(y0 + R); y += 1) {
    for (let x = Math.floor(x0 - R); x <= Math.ceil(x0 + R); x += 1) {
      const rx = x + 0.5 - x0;
      const ry = y + 0.5 - y0;
      const u = rx * dx + ry * dy;
      const v = rx * qx + ry * qy;
      if (u < 0 || u > len) continue;
      const taper = u < len * 0.68 ? hw : (hw * (len - u)) / (len * 0.32);
      if (Math.abs(v) > taper + 0.15) continue;
      let c;
      const edge = Math.abs(v) > taper - 0.9;
      if (u < 1.5) c = P[14];
      else if (Math.abs(v) < Math.max(0.5, taper * 0.2)) c = u > len * 0.55 ? P[13] : P[18];
      else if (v < 0) c = edge ? P[14] : u > len * 0.6 ? P[16] : P[15];
      else c = edge ? P[18] : u > len * 0.5 ? P[17] : P[16];
      px(buf, x, y, c);
    }
  }
}

function buildStaticLayers() {
  const bg = new Uint32Array(W * H);
  const mask = new Uint8Array(W * H); // 1 = open sky (stars & aurora may draw)

  // 1. Night sky gradient (dithered) with a faint horizon glow toward the moon.
  const SKY = [P[1], P[2], P[3], P[4], P[5], P[6]];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const t = Math.min(1, y / 118);
      const glow = 0.12 * Math.exp(-(((x - 330) / 180) ** 2)) * t;
      bg[y * W + x] = tone(SKY, Math.pow(t, 1.2) * 0.92 + glow, x, y);
      mask[y * W + x] = 1;
    }
  }

  // 2. Moon: halo, limb-darkened disc, maria and craters.
  const MX = 404;
  const MY = 27;
  const MR = 13;
  for (let y = MY - 48; y <= MY + 48; y += 1) {
    for (let x = MX - 48; x <= MX + 48; x += 1) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot(x + 0.5 - MX, y + 0.5 - MY);
      if (d <= MR || d >= 48) continue;
      const t = 1 - (d - MR) / (48 - MR);
      if (bay(x, y) < t * t * 0.8 * 16) mapPx(bg, x, y, MAP_MOON);
      if (d < MR + 5 && bay(x, y) < 11) mapPx(bg, x, y, MAP_MOON);
    }
  }
  const MOON = [P[7], P[8], P[9], P[10], P[11], P[12], P[13]];
  const craters = [[-4, -3, 3.2], [3, 4, 2.4], [5, -5, 1.8], [-6, 5, 1.6], [1, -1, 1.3], [-1, 8, 1.5], [8, 1, 1.4]];
  for (let y = MY - MR; y <= MY + MR; y += 1) {
    for (let x = MX - MR; x <= MX + MR; x += 1) {
      const nx = (x + 0.5 - MX) / MR;
      const ny = (y + 0.5 - MY) / MR;
      const q = nx * nx + ny * ny;
      if (q > 1) continue;
      const nz = Math.sqrt(1 - q);
      const dif = Math.max(0, -0.38 * nx - 0.32 * ny + 0.87 * nz);
      let v = 0.18 + 0.82 * dif;
      if (vnoise2((x - MX) * 0.22 + 3, (y - MY) * 0.22 + 7) > 0.6) v -= 0.17;
      for (const [cx, cy, cr] of craters) {
        const ddx = x + 0.5 - (MX + cx);
        const ddy = y + 0.5 - (MY + cy);
        const dd = Math.hypot(ddx, ddy);
        if (dd < cr) {
          v -= 0.1;
          if (dd > cr - 1.1) v += (ddx + ddy) / dd > 0 ? 0.24 : -0.12;
        }
      }
      bg[y * W + x] = tone(MOON, v, x, y);
      mask[y * W + x] = 2;
    }
  }

  // 3. Three layers of jagged glacier mountains with moonlit facets and haze.
  const layers = [
    { base: 68, amp: 36, freq: 0.012, seed: 3.1, lit: [4, 5, 6, 7, 8], sh: [2, 3, 4], snow: 16, hz0: 56, hzL: 40, hzMax: 0.7, haze: 4 },
    { base: 86, amp: 32, freq: 0.017, seed: 11.7, lit: [5, 6, 7, 8, 9, 10], sh: [1, 2, 3, 4], snow: 13, hz0: 76, hzL: 28, hzMax: 0.6, haze: 3 },
    { base: 102, amp: 28, freq: 0.021, seed: 23.3, lit: [6, 7, 8, 9, 10, 11, 12], sh: [1, 2, 3, 4, 5], snow: 10, hz0: 90, hzL: 16, hzMax: 0.5, haze: 2 },
  ];
  for (const L of layers) {
    const lit = L.lit.map((i) => P[i]);
    const sh = L.sh.map((i) => P[i]);
    const ry = new Float32Array(W + 2);
    for (let x = -1; x <= W; x += 1) ry[x + 1] = ridgeY(x, L.base, L.amp, L.freq, L.seed);
    for (let x = 0; x < W; x += 1) {
      const top = Math.ceil(ry[x + 1]);
      for (let y = Math.max(0, top); y < 108; y += 1) {
        const d = y - ry[x + 1];
        const xs = x - d * 0.75;
        const slope = ridgeY(xs + 1, L.base, L.amp, L.freq, L.seed) - ridgeY(xs - 1, L.base, L.amp, L.freq, L.seed);
        const gully = (vnoise(xs * 0.23 + L.seed * 3 + d * 0.05) - 0.5) * 2.6;
        const isLit = slope + gully > 0;
        const sn = clamp(1 - d / L.snow + (hash2(x, y) - 0.5) * 0.3, 0, 1);
        let c;
        if (d < 1) c = isLit ? lit[lit.length - 1] : sh[sh.length - 1];
        else c = isLit ? tone(lit, 0.25 + 0.75 * sn, x, y) : tone(sh, 0.15 + 0.6 * sn, x, y);
        const hz = clamp((y - L.hz0) / L.hzL, 0, 1) * L.hzMax;
        if (bay(x, y) < hz * 16) c = P[L.haze];
        bg[y * W + x] = c;
        mask[y * W + x] = 0;
      }
    }
  }

  // 4. Ice cave back wall: layered translucent ice curtains with ribs.
  const WALL = [P[0], P[1], P[2], P[3], P[4], P[5], P[6], P[7]];
  for (let y = 94; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let k = -1;
      let yk = 0;
      for (let j = 0; j < 3; j += 1) {
        const e = 104 + j * 23 + 7 * Math.sin(x * 0.027 + j * 1.9) + 5 * vnoise(x * 0.09 + j * 13);
        if (y >= e) {
          k = j;
          yk = e;
        }
      }
      let v;
      if (k < 0) {
        v = 0.34 - (y - 94) * 0.004;
      } else {
        const dd = y - yk;
        v = 0.2 + k * 0.08 + 0.3 * Math.exp(-dd / 5);
        if (dd < 1) v += 0.22;
      }
      v += 0.05 * Math.sin(x * 0.31 + Math.sin(y * 0.07) * 2.2);
      v += (vnoise2(x * 0.08, y * 0.03) - 0.5) * 0.14;
      if (y > 160) v -= (y - 160) / 90;
      bg[y * W + x] = tone(WALL, v, x, y);
      mask[y * W + x] = 0;
    }
  }

  // 5. Translucent ice pillars (stalactite + stalagmite fused).
  const PILL = [P[3], P[4], P[5], P[6], P[7], P[8], P[9], P[10]];
  for (const [pcx, pw, ph] of [[168, 7, 0.3], [318, 8, 1.7], [112, 4, 2.6], [374, 4, 4.1]]) {
    for (let y = 98; y < FLOOR_Y + 2; y += 1) {
      const t = (y - 98) / (FLOOR_Y - 96);
      const pinch = 0.45 + 0.55 * Math.pow(Math.abs(t * 2 - 1), 1.4);
      const w = pw * pinch + Math.sin(y * 0.09 + ph) * 1.2;
      const cx = pcx + Math.sin(y * 0.05 + ph) * 1.5;
      for (let x = Math.floor(cx - w - 1); x <= Math.ceil(cx + w + 1); x += 1) {
        const u = (x + 0.5 - cx) / w;
        if (Math.abs(u) > 1) continue;
        if (Math.abs(u) > 0.78 && bay(x, y) > 7) continue; // translucent edges
        let v = 0.55 - u * 0.25 - t * 0.35;
        if (u > -0.55 && u < -0.3) v += 0.3;
        if (u > 0.82) v -= 0.3;
        bg[y * W + x] = tone(PILL, v, x, y);
      }
    }
  }

  // 6. Chasm cliffs with snow caps, strata and lit inner edges.
  const CLIFF = [P[1], P[2], P[3], P[4], P[5], P[6], P[7], P[8], P[9]];
  const SNOWCAP = [P[9], P[10], P[11], P[12], P[13]];
  for (let x = 0; x < W; x += 1) {
    const top = 81 + Math.round(2 * vnoise(x * 0.21 + 4));
    for (let y = top; y < H; y += 1) {
      const eL = cliffLeftEdge(y);
      const eR = cliffRightEdge(y);
      const isL = x < eL;
      const isR = x > eR;
      if (!isL && !isR) continue;
      let c;
      if (y < top + 5) {
        c = tone(SNOWCAP, 0.25 + 0.75 * (1 - (y - top) / 5), x, y);
        if (y === top) c = P[13];
      } else {
        const e = isL ? eL - x : x - eR;
        const strata = Math.sin(y * 0.55 + vnoise(x * 0.12 + y * 0.02) * 4);
        let v = 0.2 + 0.08 * strata + (vnoise2(x * 0.2, y * 0.2) - 0.5) * 0.16;
        if (isL) v += e < 2.5 ? 0.42 : e < 5 ? 0.18 : 0;
        else v += e < 2.5 ? 0.24 : e < 5 ? 0.08 : 0;
        if (y > 165) v -= (y - 165) / 120;
        c = tone(CLIFF, v, x, y);
      }
      bg[y * W + x] = c;
      mask[y * W + x] = 0;
    }
  }
  // Small icicles under the cliff snow lips.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k += 1) {
      const y0 = 86;
      const ex = side < 0 ? Math.floor(cliffLeftEdge(y0)) - 1 - k * 3 : Math.ceil(cliffRightEdge(y0)) + 1 + k * 3;
      const len = 2 + Math.floor(seededRand(k * 7 + side * 3) * 5);
      for (let j = 0; j < len; j += 1) px(bg, ex, y0 + j, j === len - 1 ? P[12] : P[10]);
    }
  }

  // 7. Snow floor with drifts, sparkles and ice pebbles.
  const SNOWR = [P[6], P[7], P[8], P[9], P[10], P[11], P[12], P[13]];
  for (let x = 0; x < W; x += 1) {
    const fs = floorSurface(x);
    const slope = floorSurface(x + 1) - floorSurface(x - 1);
    for (let y = fs; y < H; y += 1) {
      const d = y - fs;
      let v = 0.9 - d * 0.028 + (hash2(x >> 1, y) - 0.5) * 0.12 - slope * 0.08;
      if (d === 1 && slope > 0) v -= 0.15;
      let c = tone(SNOWR, v, x, y);
      if (d === 0) c = hash2(x, 7) > 0.82 ? P[13] : P[12];
      bg[y * W + x] = c;
      mask[y * W + x] = 0;
    }
  }
  for (let k = 0; k < 16; k += 1) {
    const x = Math.floor(70 + seededRand(k * 13 + 1) * 340);
    const y = floorSurface(x) + 3 + Math.floor(seededRand(k * 13 + 2) * 16);
    px(bg, x, y, P[12]);
    px(bg, x + 1, y, P[11]);
    px(bg, x - 1, y + 1, P[9]);
    px(bg, x, y + 1, P[8]);
    px(bg, x + 1, y + 1, P[7]);
    px(bg, x + 2, y + 1, P[6]);
  }

  // 8. Glowing crystal clusters.
  for (const cl of CRYSTAL_CLUSTERS) {
    for (const [x, y, len, hw, ang] of cl.list) drawCrystal(bg, x, y, len, hw, ang);
  }

  // 9. Foreground silhouettes (separate transparent layer).
  const fg = new Uint32Array(W * H);
  const mound = (cx, cy, rx, ry) => {
    for (let y = Math.floor(cy - ry); y < H; y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const ddy = (y - 0.5 - cy) / ry;
        const edge = dx * dx + ddy * ddy > 1;
        px(fg, x, y, edge ? P[4] : P[1]);
      }
    }
  };
  const shard = (bx, w, h, lean) => {
    const tipX = bx + lean;
    const tipY = H - h;
    for (let y = tipY; y < H; y += 1) {
      const t = (y - tipY) / h;
      const xl = Math.round(tipX + (bx - w / 2 - tipX) * t);
      const xr = Math.round(tipX + (bx + w / 2 - tipX) * t);
      for (let x = xl; x <= xr; x += 1) {
        px(fg, x, y, x === xr ? P[4] : x === xr - 1 ? P[2] : P[0]);
      }
    }
  };
  shard(8, 12, 36, -3);
  shard(20, 9, 25, 4);
  shard(31, 6, 14, 2);
  mound(14, 220, 36, 13);
  shard(470, 13, 40, 3);
  shard(457, 9, 23, -4);
  shard(446, 6, 13, -2);
  mound(468, 221, 38, 14);

  // 10. Vignette pixel list (dithered darkening toward the edges).
  const vig = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const dx = (x - 240) / 240;
      const dy = (y - 108) / 140;
      const v = clamp((Math.sqrt(dx * dx + dy * dy) - 0.8) / 0.45, 0, 1);
      if (bay(x, y) < v * 11) vig.push(y * W + x);
    }
  }

  return { bg, mask, fg, vig: Int32Array.from(vig) };
}

/** Bridge layer (rebuilt on reset because trapdoor slots depend on penguin count). */
function buildBridgeLayer(total) {
  const buf = new Uint32Array(W * H);
  const doorW = getTrapdoorWidth(total);
  const doors = [];
  const slots = [];
  for (let i = 0; i < total; i += 1) {
    const sx = getSlotX(i, total);
    slots.push(sx);
    doors.push({ x0: sx - Math.floor(doorW / 2), w: doorW });
  }
  const doorAt = (x) => {
    for (let i = 0; i < doors.length; i += 1) {
      if (x >= doors[i].x0 && x < doors[i].x0 + doors[i].w) return i;
    }
    return -1;
  };

  // Ice block boundaries
  const bounds = [];
  let bx = BRIDGE_L;
  let k = 0;
  while (bx < BRIDGE_R) {
    const bw = 12 + Math.floor(seededRand(k * 5 + 3) * 7);
    bounds.push([bx, Math.min(bw, BRIDGE_R - bx)]);
    bx += bw;
    k += 1;
  }

  const ICE = [P[4], P[5], P[6], P[7], P[8], P[9], P[10]];
  for (const [b0, bw] of bounds) {
    for (let x = b0; x < b0 + bw; x += 1) {
      if (doorAt(x) >= 0) continue;
      // Snow cap with drift lumps (flattened where penguins stand)
      let dd = Infinity;
      for (const s of slots) dd = Math.min(dd, Math.abs(x - s));
      const f = clamp((dd - 11) / 8, 0, 1);
      const drift = Math.round(f * (0.6 + 2.8 * vnoise(x * 0.15 + 2)));
      const top = SNOW_Y - drift;
      for (let y = top; y < BLOCK_Y; y += 1) {
        const sv = (y - top) / (BLOCK_Y - top);
        px(buf, x, y, y === top ? P[13] : tone([P[10], P[11], P[12]], 1 - sv, x, y));
      }
      for (let y = BLOCK_Y; y < DECK_BOTTOM; y += 1) {
        const lx = x - b0;
        const ly = y - BLOCK_Y;
        let c;
        if (lx === 0) c = P[4];
        else if (lx === 1) c = P[9];
        else if (ly === 0) c = P[11];
        else if (ly === 9) c = P[3];
        else if (ly === 8) c = P[5];
        else {
          const v = 0.64 - ly * 0.05 + (lx / bw) * 0.14 + (hash2(x, y) - 0.5) * 0.1;
          c = tone(ICE, v, x, y);
          if (hash2(x * 3, y * 7) > 0.97) c = P[11];
        }
        px(buf, x, y, c);
      }
      if (hash2(x, 3) > 0.7) px(buf, x, BLOCK_Y, P[11]);
      if (hash2(x, 5) > 0.88) px(buf, x, BLOCK_Y + 1, P[10]);
    }
    // Internal crack
    let cx = b0 + 3 + Math.floor(seededRand(b0 * 0.7) * Math.max(1, bw - 6));
    let cy = BLOCK_Y + 1 + Math.floor(seededRand(b0 * 1.3) * 3);
    const steps = 3 + Math.floor(seededRand(b0 * 2.1) * 4);
    for (let s = 0; s < steps; s += 1) {
      if (doorAt(cx) < 0 && doorAt(cx + 1) < 0 && cy < DECK_BOTTOM - 2) {
        px(buf, cx, cy, P[10]);
        px(buf, cx + 1, cy, P[5]);
      }
      cy += 1;
      cx += Math.floor(seededRand(b0 + s * 9.1) * 3) - 1;
    }
  }

  // Trapdoor frame faces
  for (const d of doors) {
    for (let y = SNOW_Y - 1; y < DECK_BOTTOM; y += 1) {
      const c = y < BLOCK_Y ? P[9] : P[3];
      px(buf, d.x0 - 1, y, c);
      px(buf, d.x0 + d.w, y, y < BLOCK_Y ? P[10] : P[4]);
    }
  }

  // Hanging icicles
  const tips = [];
  let ix = BRIDGE_L + 3;
  let n = 0;
  while (ix < BRIDGE_R - 3) {
    let near = false;
    for (const d of doors) if (ix >= d.x0 - 2 && ix <= d.x0 + d.w + 1) near = true;
    if (!near) {
      const r = seededRand(n * 11 + 4);
      const len = 2 + Math.floor(r * r * 11);
      for (let j = 0; j < len; j += 1) {
        const y = DECK_BOTTOM + j;
        const wdt = j < len * 0.35 ? 3 : j < len * 0.7 ? 2 : 1;
        if (wdt === 3) {
          px(buf, ix - 1, y, P[12]);
          px(buf, ix, y, P[10]);
          px(buf, ix + 1, y, P[7]);
        } else if (wdt === 2) {
          px(buf, ix, y, P[11]);
          px(buf, ix + 1, y, P[8]);
        } else {
          px(buf, ix, y, j === len - 1 ? P[12] : P[10]);
        }
      }
      if (len >= 7) tips.push({ x: ix, y: DECK_BOTTOM + len });
    }
    ix += 3 + Math.floor(seededRand(n * 7 + 1) * 5);
    n += 1;
  }

  // Lantern posts with iron lanterns
  for (const L of LANTERNS) {
    const p0 = L.post;
    for (let y = 47; y < SNOW_Y + 1; y += 1) {
      px(buf, p0, y, P[30]);
      px(buf, p0 + 1, y, hash2(p0, y) > 0.8 ? P[30] : P[31]);
      px(buf, p0 + 2, y, P[32]);
    }
    for (let x = p0 - 1; x <= p0 + 3; x += 1) px(buf, x, 46, P[31]);
    const a0 = L.arm > 0 ? p0 + 3 : p0 - 1;
    for (let j = 0; j <= 9; j += 1) {
      const x = a0 + L.arm * j;
      px(buf, x, 50, P[32]);
      px(buf, x, 51, P[31]);
    }
    for (let j = 0; j < 5; j += 1) px(buf, a0 + L.arm * j, 56 - j, P[31]);
    const hx = L.x;
    px(buf, hx, 52, P[35]);
    px(buf, hx, 53, P[34]);
    for (let x = hx - 2; x <= hx + 2; x += 1) px(buf, x, 54, P[33]);
    for (let x = hx - 3; x <= hx + 3; x += 1) px(buf, x, 55, x === hx + 3 ? P[35] : P[34]);
    for (let y = 56; y <= 63; y += 1) {
      px(buf, hx - 3, y, P[33]);
      px(buf, hx + 3, y, P[34]);
      for (let x = hx - 2; x <= hx + 2; x += 1) {
        const v = 0.85 - Math.abs(x - hx) * 0.22 - Math.abs(y - 61) * 0.06;
        px(buf, x, y, tone([P[25], P[26], P[27], P[28]], v, x, y));
      }
    }
    for (let x = hx - 3; x <= hx + 3; x += 1) px(buf, x, 64, x === hx + 3 ? P[35] : P[34]);
    for (let x = hx - 2; x <= hx + 2; x += 1) px(buf, x, 65, P[33]);
    px(buf, hx, 66, P[33]);
  }

  return { buf, doors, tips, doorW };
}

/* ==========================================================================
   Character builders
   ========================================================================== */

/**
 * Emperor penguin (~18×28 px), local coords facing right, feet at (0,0).
 */
function buildPenguin(spr, o) {
  spr.begin(o.dir);
  spr.translate(o.shake || 0, -(o.hop || 0));
  if (o.rot) spr.rotateAbout(0, -13, o.rot * (o.dir < 0 ? -1 : 1));
  if (o.lean) spr.rotate(o.lean);
  spr.scale(o.s);
  const sq = o.squash || 1;
  const br = o.breath * 0.35;
  const headY = -22.8 * sq + br * 0.4;
  const shoulderY = -16.5 * sq;
  const flLen = 10;

  // Far flipper (behind body)
  if (o.ff > 0.45) {
    const a = o.ff;
    spr.capsule(0.5, shoulderY, 1.6, 0.5 + Math.sin(a) * flLen * 0.8, shoulderY + Math.cos(a) * flLen, 0.7, M_PSLATE, -0.3);
  }
  // Tail & far foot
  spr.capsule(-5, -2, 1.5, -8, 0, 0.8, M_PSLATE, -0.2);
  spr.ellipse(-1.5, -0.8, 2.6, 1.1, 0, M_PFEET, -0.2);
  // Pear-shaped body
  spr.ellipse(-0.3, -8 * sq, 7, 8.2 * sq + br * 0.3, 0, M_PSLATE);
  spr.ellipse(0, -15.5 * sq, 5.6, 7 * sq, 0, M_PSLATE);
  // White belly forming the front silhouette
  spr.ellipse(1.7, -8.5 * sq, 5.3, 8 * sq + br * 0.4, 0, M_PWHITE);
  spr.ellipse(2.1, -14.5 * sq, 3.7, 5.5 * sq, 0, M_PWHITE);
  // Pale yellow upper chest
  spr.ellipse(2.5, -18 * sq, 2.7, 2.3, 0, M_PCREAM);
  // Neck & head
  const turn = o.turn || 0;
  spr.ellipse(0.6, -19.6 * sq, 4.2, 3, 0, M_PBLACK);
  spr.save();
  spr.rotateAbout(1, headY, o.pitch || 0);
  spr.ellipse(1 - turn * 0.6, headY, 3.9, 3.6, 0, M_PBLACK);
  // Golden ear patch flowing toward chest
  spr.ellipse(-0.4 - turn * 0.4, headY + 2.4, 1.3, 2.4, 0.35, M_PGOLD);
  spr.ellipse(1.6, headY + 4.3, 1.2, 1.4, 0, M_PGOLD, 0.15);
  // Long slender beak with orange mandible stripe
  const bl = 1 - turn * 0.55;
  const open = o.beak || 0;
  const bx0 = 3.6 - turn * 0.8;
  if (open > 0.05) {
    spr.save();
    spr.rotateAbout(bx0, headY, -0.28 * open);
    spr.capsule(bx0, headY - 0.4, 1.0, bx0 + 5.2 * bl, headY + 0.6, 0.45, M_PBEAK);
    spr.restore();
    spr.dot(bx0 + 2, headY + 1.2, M_MOUTH, 0.6);
    spr.dot(bx0 + 3, headY + 1.4, M_MOUTH, 0.6);
    spr.save();
    spr.rotateAbout(bx0, headY + 0.5, 0.4 * open);
    spr.capsule(bx0 + 0.4, headY + 1, 0.6, bx0 + 4.4 * bl, headY + 1.3, 0.45, M_PORANGE);
    spr.restore();
  } else {
    spr.capsule(bx0, headY - 0.4, 1.0, bx0 + 5.2 * bl, headY + 0.8, 0.45, M_PBEAK);
    spr.capsule(bx0 + 0.4, headY + 0.9, 0.5, bx0 + 4.2 * bl, headY + 1.2, 0.4, M_PORANGE);
  }
  // Eye with catchlight
  const ex = 2.4 - turn * 0.7;
  spr.dot(ex, headY - 1, M_PEYE);
  if (!o.blink) spr.dot(ex + 0.9, headY - 1.9, M_CATCH);
  if (o.alert) spr.dot(ex, headY - 1.9, M_CATCH);
  spr.restore();
  // Near foot
  spr.ellipse(2.2, -0.8, 2.8, 1.1, 0, M_PFEET);
  // Near flipper
  const a = o.fl;
  spr.capsule(-1.2, shoulderY, 1.7, -1.2 - Math.sin(a) * flLen, shoulderY + Math.cos(a) * flLen, 0.7, M_PSLATE, 0.05);
}

/**
 * Polar bear (~72×44 px), local coords facing right, paws on (0,0).
 */
function buildBear(spr, b) {
  spr.begin(b.dir);
  const yo = b.yo;
  const f = b.flex;
  const br = b.breath;

  const leg = (hx, hy, a1, a2, l1, l2, r1, r2, r3, bias, claws) => {
    const kx = hx + Math.sin(a1) * l1;
    const ky = hy + Math.cos(a1) * l1;
    const ax = kx + Math.sin(a1 + a2) * l2;
    const ay = ky + Math.cos(a1 + a2) * l2;
    spr.capsule(hx, hy, r1, kx, ky, r2, M_FUR, bias);
    spr.capsule(kx, ky, r2, ax, ay, r3, M_FUR, bias);
    spr.ellipse(ax + 1.6, ay + 0.2, 4.8, 2.3, 0, M_FUR, bias - 0.04);
    if (claws) {
      spr.dot(ax + 5.2, ay + 1.5, M_CLAW);
      spr.dot(ax + 4, ay + 1.8, M_CLAW);
      spr.dot(ax + 2.8, ay + 1.9, M_CLAW);
    }
  };

  const L = b.legs;
  // Far legs (darker, cooler)
  leg(-20 - f * 2.5, -19 + yo, L.hf[0], L.hf[1], 9, 6.8, 6.5, 4, 3.3, -0.3, false);
  leg(12 + f * 2.5, -19 + yo, L.ff[0], L.ff[1], 9, 6.8, 6, 3.8, 3.2, -0.3, false);

  // Massive body: heavy rump, barrel, humped shoulders
  spr.ellipse(-18 - f * 2.5, -19.5 + yo, 13, 12.5 + br * 0.5, -0.1, M_FUR);
  spr.ellipse(-2, -18.5 + yo - Math.max(0, -f) * 1.5, 19, 11 + br * 0.7, 0, M_FUR);
  spr.ellipse(13 + f * 2.5, -21 + yo, 12, 12, 0.15, M_FUR);
  // Belly fur fringe
  spr.capsule(-14, -9 + yo + br * 0.3, 2.2, 8, -9.5 + yo + br * 0.3, 2.4, M_FUR, -0.12);

  // Long neck
  const nx = 28 + f * 2.5;
  const ny = -24 + yo + (b.neckDrop || 0);
  spr.capsule(18 + f * 2.5, -22 + yo, 8.5, nx, ny, 5.6, M_FUR);

  // Head group
  spr.save();
  spr.translate(f * 2.5 + (b.lunge || 0), yo + (b.neckDrop || 0));
  spr.rotateAbout(28, -24, b.pitch);
  // Ear (small, rounded)
  spr.ellipse(29.6 + (b.ear || 0) * 0.6, -29.4 - (b.ear || 0) * 0.5, 2.1, 1.8, 0.3, M_FUR, -0.05);
  spr.dot(29.6, -29.4, M_FUR, 0.2);
  spr.ellipse(33, -25, 6, 5.2, 0, M_FUR);
  const jaw = b.jaw;
  if (jaw > 0.08) {
    spr.ellipse(38.5, -20.4 + jaw * 1.6, 4.4, 0.8 + jaw * 2.3, 0.05, M_MOUTH);
  }
  // Lower jaw
  spr.save();
  spr.rotateAbout(34, -21, jaw * 0.62);
  spr.capsule(33.5, -20.6, 2.7, 42, -20.2, 1.6, M_FUR, -0.1);
  spr.capsule(36, -19.2, 0.5, 41.6, -19.2, 0.5, M_NOSE);
  if (jaw > 0.25) {
    spr.dot(40.6, -21.4, M_TEETH, 1);
    spr.dot(38.6, -21.3, M_TEETH, 0.4);
  }
  spr.restore();
  // Roman-nose muzzle
  spr.capsule(35, -24, 3.7, 43, -22.4, 2.4, M_FUR);
  spr.ellipse(38.6, -25.1, 3.6, 2.4, 0.15, M_FUR, 0.04);
  spr.capsule(37, -20.6, 0.55, 43.2, -21, 0.55, M_NOSE);
  if (jaw > 0.25) {
    spr.dot(41.2, -20.2, M_TEETH, 1);
    spr.dot(39, -20.2, M_TEETH, 0.4);
  }
  spr.ellipse(43.7, -22.7, 1.7, 1.35, 0, M_NOSE);
  spr.dot(43.6, -23.6, M_NOSE, 1);
  // Eye
  if (b.blink) {
    spr.dot(35.6, -26.4, M_FUR, 0.1);
    spr.dot(36.6, -26.4, M_FUR, 0.1);
  } else {
    spr.dot(35.8, -26.6, M_EYE);
    spr.dot(36.8, -26.6, M_EYE);
  }
  // Tongue lick
  if (b.tongue > 0.05) {
    const t = b.tongue;
    spr.capsule(39.5, -20.6 + jaw, 1.2, 41 + t * 3.2, -20.8 - t * 2.6, 1.1, M_TONGUE);
  }
  spr.restore();

  // Near legs (front of body)
  leg(-17 - f * 2.5, -18 + yo, L.hn[0], L.hn[1], 9, 6.8, 7.4, 4.5, 3.8, 0, true);
  leg(15 + f * 2.5, -18 + yo, L.fn[0], L.fn[1], 9, 6.8, 6.8, 4.4, 3.7, 0, true);
}

/* ==========================================================================
   PenguinArena — pixel-art canvas controller (480 × 216)
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
    this._drips = [];
    this._stars = this._createStars();
    this._flakes = this._createSnowflakes();
    this._shooting = { active: false, cd: 4 + Math.random() * 6, x: 0, y: 0, vx: 0, vy: 0, life: 0 };
    this._bear = this._createInitialBear();
    this._shakeTimer = 0;
    this._screenFlash = 0;

    this._static = buildStaticLayers();
    this._bridge = null;
    this._penguinSprite = new Sprite(40, 46, 20, 41);
    this._bearSprite = new Sprite(116, 76, 52, 68);

    this._canvas = null;
    this._ctx = null;
    this._low = null;
    this._lowCtx = null;
    this._img = null;
    this._fb = new Uint32Array(W * H);
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
      yOffset: 0,
      dir: 1,
      mode: 'wait', // 'wait' | 'watch' | 'sprint' | 'chompOpen' | 'chompSnap' | 'chompChew' | 'chompLick' | 'grumble'
      modeTimer: 0,
      targetIndex: null,
      targetX: null,
      stridePhase: 0,
      headPitch: -0.2,
      jawOpen: 0,
      tongueOut: 0,
      blinkCooldown: 2.2,
      blinkTimer: 0,
      breathTimer: 1.2,
      sniffTimer: 3.5,
      sniff: 0,
      earTimer: 2.5,
      ear: 0,
      dustTimer: 0,
      pawprintCooldown: 0,
      pawSide: 0,
      pawStamp: 0,
      stompHit: false,
      lunge: 0,
      hitFlashTimer: 0,
      bubbleText: null,
      bubbleTimer: 0,
      bubbleMax: 1,
    };
  }

  /**
   * Resets all penguins onto the bridge, closes trapdoors, and resets the bear.
   * @param {number} [totalPenguins]
   */
  reset(totalPenguins = this._state ? this._state.total : 10) {
    this._clearTimers();
    this._state = createPenguinState(totalPenguins);
    this._particles = [];
    this._pawprints = [];
    this._shakeTimer = 0;
    this._screenFlash = 0;

    const total = this._state.total;
    this._bridge = buildBridgeLayer(total);
    this._drips = this._bridge.tips
      .filter((_, i) => i % 2 === 0)
      .slice(0, 8)
      .map((t, i) => ({ x: t.x, y0: t.y, y: t.y, vy: 0, active: false, cd: 1 + seededRand(i * 19 + 4) * 5 }));

    this._penguins = [];
    this._trapdoors = [];
    for (let i = 0; i < total; i += 1) {
      const slotX = getSlotX(i, total);
      const d = this._bridge.doors[i];
      this._trapdoors.push({ x0: d.x0, w: d.w, angle: 0, targetAngle: 0, vel: 0, crackGlow: 0, snow: true });
      this._penguins.push({
        index: i,
        x: slotX,
        y: SNOW_Y,
        vy: 0,
        rotation: 0,
        rotSpeed: 0,
        status: 'idle', // 'idle' | 'cheer' | 'panic' | 'falling' | 'landed' | 'eaten'
        timer: 0,
        landedTimer: 0,
        cheerDelay: 0,
        breathPhase: seededRand(i * 13 + 5) * Math.PI * 2,
        swayPhase: seededRand(i * 17 + 11) * Math.PI * 2,
        swaySpeed: 1.1 + seededRand(i * 31 + 2) * 0.7,
        scale: 0.94 + seededRand(i * 7 + 3) * 0.12,
        blinkCooldown: 1.4 + seededRand(i * 29 + 7) * 3.8,
        blinkTimer: 0,
        lookTimer: 0.5 + seededRand(i * 37 + 1) * 3,
        lookMode: 0,
        turn: 0,
        pitch: 0,
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
   * Wrong answer: trapdoor cracks open, penguin panics, falls, lands — then the bear
   * sprints over and eats it.
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
        door.snow = false;
      }
      if (penguin) penguin.status = 'eaten';
      const bear = this._bear;
      bear.dir = targetX >= bear.x ? 1 : -1;
      bear.x = clamp(targetX - bear.dir * 44, 50, W - 50);
      bear.mode = 'chompLick';
      bear.modeTimer = 0.42;
      bear.tongueOut = 1;
      bear.jawOpen = 0.22;
      this._setBubble('NOM!', 1.0);
      this._render();

      this._schedule(() => {
        bear.bubbleText = null;
        bear.tongueOut = 0;
        bear.jawOpen = 0;
        bear.mode = 'wait';
        this._aimBearTowardRemaining();
        this._state = { ...this._state, bearState: 'patrol' };
        this._render();
      }, 1000);

      return { ...this._state };
    }

    if (door) {
      door.targetAngle = 92;
      door.vel = 520;
      door.crackGlow = 1;
      this._spawnIceShards(targetX, SNOW_Y + 6);
    }

    if (penguin) {
      penguin.status = 'panic';
      penguin.timer = 0.28;
      penguin.vy = 0;
      penguin.rotation = 0;
      penguin.y = SNOW_Y;
      this._spawnSweat(targetX, SNOW_Y - 26);
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
   * Correct answer: remaining penguins hop and flap joyfully, the bear grumbles.
   */
  onCorrectAnswer() {
    this._state = celebratePenguins(this._state);
    const reduced = prefersReducedMotion();

    for (let i = 0; i < this._state.remaining; i += 1) {
      const p = this._penguins[i];
      if (!p || p.status !== 'idle' && p.status !== 'cheer') continue;
      if (!reduced) {
        p.status = 'cheer';
        p.cheerDelay = i * 0.04;
        p.timer = 0.72;
        this._spawnSparkles(p.x, SNOW_Y - 30);
      }
    }

    const bear = this._bear;
    if (bear.mode === 'wait' || bear.mode === 'grumble') {
      bear.mode = 'grumble';
      bear.modeTimer = 1.05;
      bear.pawStamp = 1;
      bear.stompHit = false;
      this._setBubble('GRRR!', 1.05);
      if (!reduced) this._spawnBreath(true);
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
      }, 950);
    }

    return { ...this._state };
  }

  /** Returns a snapshot of the current arena state. */
  getState() {
    return { ...this._state };
  }

  /** Stops the animation loop, clears timers and removes DOM nodes. */
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
    this._low = null;
    this._lowCtx = null;
    this._img = null;
  }

  /* ------------------------------------------------------------------------
     Setup helpers
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
    this._bear.bubbleMax = duration;
  }

  /** @private */
  _aimBearTowardRemaining() {
    const remaining = this._state.remaining;
    if (remaining <= 0) return;
    let sum = 0;
    for (let i = 0; i < remaining; i += 1) sum += this._penguins[i] ? this._penguins[i].x : 0;
    const cx = sum / remaining;
    if (Math.abs(cx - this._bear.x) > 12) this._bear.dir = cx >= this._bear.x ? 1 : -1;
  }

  /** @private */
  _createStars() {
    const stars = [];
    for (let i = 0; i < 90; i += 1) {
      stars.push({
        x: Math.floor(seededRand(i * 3 + 1) * W),
        y: Math.floor(seededRand(i * 3 + 2) * 80),
        b: seededRand(i * 5 + 4),
        phase: seededRand(i * 3 + 3) * Math.PI * 2,
        speed: 1 + seededRand(i * 7 + 9) * 2.6,
      });
    }
    return stars;
  }

  /** @private */
  _createSnowflakes() {
    const flakes = [];
    for (let i = 0; i < 90; i += 1) {
      const layer = i < 40 ? 0 : i < 72 ? 1 : 2;
      flakes.push({
        x: seededRand(i * 7 + 1) * W,
        y: seededRand(i * 7 + 2) * H,
        layer,
        speed: layer === 0 ? 6 + seededRand(i * 7 + 3) * 5 : layer === 1 ? 13 + seededRand(i * 7 + 3) * 8 : 28 + seededRand(i * 7 + 3) * 14,
        drift: layer === 0 ? 3 : layer === 1 ? 6 : 11,
        phase: seededRand(i * 7 + 4) * Math.PI * 2,
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
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Isbro med pingviner over en ishule med en sulten isbjørn');
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    if (this._ctx) this._ctx.imageSmoothingEnabled = false;

    const low = document.createElement('canvas');
    low.width = W;
    low.height = H;
    this._low = low;
    this._lowCtx = low.getContext('2d');
    if (this._lowCtx && typeof this._lowCtx.createImageData === 'function') {
      this._img = this._lowCtx.createImageData(W, H);
      this._fb = new Uint32Array(this._img.data.buffer);
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
     Particle emitters
     ------------------------------------------------------------------------ */

  /** @private */
  _addParticle(p) {
    if (this._particles.length < 420) this._particles.push(p);
  }

  /** @private */
  _spawnIceShards(x, y) {
    const colors = [P[13], P[12], P[11], P[10], P[9]];
    for (let i = 0; i < 16; i += 1) {
      this._addParticle({
        kind: 'shard',
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 120,
        vy: -30 - Math.random() * 60,
        g: 300,
        rot: Math.random() * Math.PI * 2,
        rs: (Math.random() - 0.5) * 14,
        life: 0.6 + Math.random() * 0.4,
        max: 1,
        c: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _spawnSweat(x, y) {
    for (let i = 0; i < 4; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      this._addParticle({ kind: 'drop', x: x + side * 7, y, vx: side * (22 + i * 8), vy: -36 - i * 8, g: 180, life: 0.4, max: 0.4, c: P[11] });
    }
  }

  /** @private */
  _spawnSnow(x, y, dir, count, spread = 1) {
    for (let i = 0; i < count; i += 1) {
      const r = Math.random();
      this._addParticle({
        kind: 'snow',
        x: x + (r - 0.5) * 10,
        y: y - 1 - r * 3,
        vx: dir * (26 + r * 55) * spread + (Math.random() - 0.5) * 22,
        vy: -24 - Math.random() * 42,
        g: 150,
        size: Math.random() < 0.35 ? 2 : 1,
        life: 0.35 + r * 0.3,
        max: 0.65,
        c: Math.random() < 0.6 ? P[13] : P[11],
        floor: FLOOR_Y + 2,
      });
    }
  }

  /** @private */
  _spawnLandingSplash(x, y) {
    for (let i = 0; i < 18; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const r = Math.random();
      this._addParticle({
        kind: 'snow',
        x: x + side * (2 + r * 8),
        y: y - 1,
        vx: side * (20 + r * 60),
        vy: -30 - r * 55,
        g: 170,
        size: r < 0.4 ? 2 : 1,
        life: 0.4 + r * 0.3,
        max: 0.7,
        c: i % 3 === 0 ? P[11] : P[13],
        floor: FLOOR_Y + 2,
      });
    }
    for (let i = 0; i < 3; i += 1) {
      this._addParticle({ kind: 'puff', x: x + (i - 1) * 6, y: y - 2, vx: (i - 1) * 14, vy: -6, g: 0, r: 2, gr: 5, life: 0.5, max: 0.5, c: P[12] });
    }
  }

  /** @private */
  _spawnChompBurst(x, y) {
    for (let i = 0; i < 20; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 25 + Math.random() * 75;
      this._addParticle({
        kind: 'snow',
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp * 0.7 - 30,
        g: 140,
        size: Math.random() < 0.5 ? 2 : 1,
        life: 0.5 + Math.random() * 0.3,
        max: 0.8,
        c: i % 3 === 0 ? P[11] : P[13],
        floor: FLOOR_Y + 2,
      });
    }
    const fc = [P[43], P[13], P[48], P[45], P[50]];
    for (let i = 0; i < 12; i += 1) {
      const ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const sp = 30 + Math.random() * 55;
      this._addParticle({
        kind: 'feather',
        x: x + (Math.random() - 0.5) * 12,
        y: y - 6,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 20,
        g: 32,
        sway: Math.random() * Math.PI * 2,
        life: 1.2 + Math.random() * 0.6,
        max: 1.8,
        c: fc[i % fc.length],
      });
    }
    for (let i = 0; i < 4; i += 1) {
      this._addParticle({ kind: 'puff', x: x + (i - 1.5) * 6, y: y + 4, vx: (i - 1.5) * 16, vy: -10, g: 0, r: 3, gr: 7, life: 0.6, max: 0.6, c: P[12] });
    }
  }

  /** @private */
  _spawnSparkles(x, y) {
    const colors = [P[49], P[13], P[18], P[28]];
    for (let i = 0; i < 5; i += 1) {
      this._addParticle({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 22,
        vy: -18 - Math.random() * 26,
        g: 14,
        life: 0.6 + Math.random() * 0.35,
        max: 0.95,
        c: colors[i % colors.length],
      });
    }
  }

  /** @private */
  _bearNose() {
    const b = this._bear;
    return { x: b.x + b.dir * (44 + b.lunge), y: FLOOR_Y - 23 + b.yOffset + b.headPitch * 14 };
  }

  /** @private */
  _spawnBreath(heavy = false) {
    const b = this._bear;
    const n = this._bearNose();
    const count = heavy ? 4 : 2;
    for (let i = 0; i < count; i += 1) {
      this._addParticle({
        kind: 'puff',
        x: n.x + b.dir * (2 + i * 3),
        y: n.y + (i - 0.5) * 2,
        vx: b.dir * (heavy ? 26 + i * 8 : 10 + i * 4),
        vy: -6 - i * 3,
        g: 0,
        r: heavy ? 2 : 1.2,
        gr: heavy ? 6 : 4,
        life: heavy ? 1.1 : 0.95,
        max: heavy ? 1.1 : 0.95,
        c: P[12],
      });
    }
  }

  /* ------------------------------------------------------------------------
     Animation loop & simulation
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
    dt = Math.min(0.05, dt);
    this._elapsed += dt;
    const t = this._elapsed;

    if (this._shakeTimer > 0) this._shakeTimer = Math.max(0, this._shakeTimer - dt);
    if (this._screenFlash > 0) this._screenFlash = Math.max(0, this._screenFlash - dt);

    // Snowfall
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

    // Shooting star
    const ss = this._shooting;
    if (ss.active) {
      ss.life -= dt;
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      if (ss.life <= 0) ss.active = false;
    } else {
      ss.cd -= dt;
      if (ss.cd <= 0) {
        ss.active = true;
        ss.x = 40 + Math.random() * 300;
        ss.y = 4 + Math.random() * 22;
        ss.vx = 150 + Math.random() * 80;
        ss.vy = 45 + Math.random() * 30;
        ss.life = 0.55;
        ss.cd = 7 + Math.random() * 9;
      }
    }

    // Icicle drips
    for (let i = 0; i < this._drips.length; i += 1) {
      const d = this._drips[i];
      if (!d.active) {
        d.cd -= dt;
        if (d.cd <= 0) {
          d.active = true;
          d.y = d.y0;
          d.vy = 8;
        }
      } else {
        d.vy += 380 * dt;
        d.y += d.vy * dt;
        const floorY = floorSurface(d.x);
        if (d.y >= floorY) {
          d.active = false;
          d.cd = 2.5 + Math.random() * 5;
          for (let s = -1; s <= 1; s += 2) {
            this._addParticle({ kind: 'drop', x: d.x, y: floorY - 1, vx: s * 16, vy: -26, g: 170, life: 0.25, max: 0.25, c: P[11] });
          }
        }
      }
    }

    // Trapdoor spring physics
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const door = this._trapdoors[i];
      if (door.crackGlow > 0) door.crackGlow = Math.max(0, door.crackGlow - dt * 2.2);
      if (door.targetAngle > 0 && (Math.abs(door.angle - door.targetAngle) > 0.2 || Math.abs(door.vel) > 1)) {
        const accel = (door.targetAngle - door.angle) * 140 - door.vel * 12;
        door.vel += accel * dt;
        door.angle += door.vel * dt;
        if (door.angle < 0) {
          door.angle = 0;
          door.vel = 0;
        }
      }
      if (door.snow && door.angle > 6) {
        door.snow = false;
        for (let k = 0; k < 10; k += 1) {
          this._addParticle({
            kind: 'snow',
            x: door.x0 + Math.random() * door.w,
            y: SNOW_Y + 1,
            vx: (Math.random() - 0.5) * 30,
            vy: -10 + Math.random() * 20,
            g: 260,
            size: Math.random() < 0.5 ? 2 : 1,
            life: 0.9,
            max: 0.9,
            c: P[12],
            floor: FLOOR_Y + 2,
          });
        }
      }
    }

    // Penguins
    const bear = this._bear;
    const danger = bear.mode === 'watch' || bear.mode === 'sprint' || bear.mode.startsWith('chomp');
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;
      p.breathPhase += dt * 2.4;
      p.swayPhase += dt * p.swaySpeed;

      if (p.blinkTimer > 0) {
        p.blinkTimer = Math.max(0, p.blinkTimer - dt);
      } else {
        p.blinkCooldown -= dt;
        if (p.blinkCooldown <= 0) {
          p.blinkTimer = 0.12;
          p.blinkCooldown = 2 + Math.random() * 4.2;
        }
      }

      if (p.status === 'idle' || p.status === 'cheer') {
        const dx = bear.x - p.x;
        if (Math.abs(dx) > 30) p.facingDir = dx > 0 ? 1 : -1;
        p.lookTimer -= dt;
        if (p.lookTimer <= 0) {
          const r = Math.random();
          p.lookMode = r < 0.5 ? 0 : r < 0.75 ? 1 : 2;
          p.lookTimer = 1.2 + Math.random() * 2.6;
        }
        let tTurn = p.lookMode === 1 ? 1 : 0;
        let tPitch = p.lookMode === 2 ? 0.42 : 0;
        if (danger && p.status === 'idle') {
          tTurn = 0;
          tPitch = 0.5;
        }
        if (p.status === 'cheer') {
          tTurn = 0;
          tPitch = -0.35;
        }
        p.turn = lerp(p.turn, tTurn, Math.min(1, dt * 10));
        p.pitch = lerp(p.pitch, tPitch, Math.min(1, dt * 9));
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
          p.vy = 12;
          p.rotSpeed = (p.index % 2 === 0 ? 1 : -1) * 5.8;
        }
      } else if (p.status === 'falling') {
        p.timer += dt;
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;
        if (Math.random() < dt * 8) {
          this._addParticle({
            kind: 'feather',
            x: p.x + (Math.random() - 0.5) * 8,
            y: p.y - 12,
            vx: (Math.random() - 0.5) * 22,
            vy: -14,
            g: 26,
            sway: Math.random() * Math.PI * 2,
            life: 0.8,
            max: 0.8,
            c: Math.random() < 0.5 ? P[13] : P[44],
          });
        }
        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = 0;
          p.rotation = 0;
          p.status = 'landed';
          p.landedTimer = 0;
          p.squashY = 0.7;
          this._spawnLandingSplash(p.x, FLOOR_Y);
          this._shakeTimer = Math.max(this._shakeTimer, 0.08);
        }
      } else if (p.status === 'landed') {
        p.landedTimer += dt;
        p.squashY = lerp(p.squashY, 1, Math.min(1, dt * 10));
      }
    }

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
        pt.x += Math.sin(t * 5 + pt.sway) * 16 * dt;
        pt.vx *= 0.96;
      } else if (pt.kind === 'shard') {
        pt.rot += pt.rs * dt;
      } else if (pt.kind === 'puff') {
        pt.r += pt.gr * dt;
        pt.vx *= 0.96;
      }
      if (pt.floor && pt.y > pt.floor) {
        pt.y = pt.floor;
        pt.vy = 0;
        pt.vx *= 0.5;
      }
    }

    // Pawprints fade
    for (let i = this._pawprints.length - 1; i >= 0; i -= 1) {
      this._pawprints[i].life -= dt;
      if (this._pawprints[i].life <= 0) this._pawprints.splice(i, 1);
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
      if ((p.status === 'falling' || p.status === 'panic') && !airborne) airborne = p;
    }
    return { landed, airborne };
  }

  /** @private */
  _updatePolarBear(dt) {
    const bear = this._bear;
    const t = this._elapsed;

    if (bear.hitFlashTimer > 0) bear.hitFlashTimer = Math.max(0, bear.hitFlashTimer - dt);
    if (bear.bubbleTimer > 0) {
      bear.bubbleTimer -= dt;
      if (bear.bubbleTimer <= 0) bear.bubbleText = null;
    }
    if (bear.pawStamp > 0) {
      bear.pawStamp = Math.max(0, bear.pawStamp - dt * 2.4);
      if (!bear.stompHit && bear.pawStamp < 0.55) {
        bear.stompHit = true;
        const px0 = bear.x + bear.dir * 21;
        this._spawnSnow(px0, FLOOR_Y, bear.dir, 6);
        this._spawnSnow(px0, FLOOR_Y, -bear.dir, 6);
        this._addParticle({ kind: 'puff', x: px0, y: FLOOR_Y - 1, vx: 0, vy: -4, g: 0, r: 2, gr: 6, life: 0.45, max: 0.45, c: P[12] });
        this._shakeTimer = Math.max(this._shakeTimer, 0.1);
      }
    }
    bear.lunge = lerp(bear.lunge, bear.mode === 'chompOpen' ? 3 : 0, Math.min(1, dt * 14));

    // Blink, sniff, ear twitch
    if (bear.blinkTimer > 0) {
      bear.blinkTimer = Math.max(0, bear.blinkTimer - dt);
    } else {
      bear.blinkCooldown -= dt;
      if (bear.blinkCooldown <= 0) {
        bear.blinkTimer = 0.14;
        bear.blinkCooldown = 2.4 + Math.random() * 3.6;
      }
    }
    bear.earTimer -= dt;
    if (bear.earTimer <= 0) {
      bear.ear = 1;
      bear.earTimer = 2 + Math.random() * 4;
    }
    bear.ear = Math.max(0, bear.ear - dt * 6);
    bear.sniffTimer -= dt;
    if (bear.sniffTimer <= 0) {
      bear.sniff = 1;
      bear.sniffTimer = 3 + Math.random() * 4;
    }
    bear.sniff = Math.max(0, bear.sniff - dt * 1.4);

    if (bear.mode === 'wait' || bear.mode === 'watch') {
      bear.breathTimer -= dt;
      if (bear.breathTimer <= 0) {
        this._spawnBreath(false);
        bear.breathTimer = bear.mode === 'watch' ? 1.1 : 2.2;
      }
    }

    const { landed, airborne } = this._findActiveDropTarget();

    if (bear.mode === 'wait') {
      bear.yOffset = lerp(bear.yOffset, 0, Math.min(1, dt * 8));
      bear.jawOpen = lerp(bear.jawOpen, 0, Math.min(1, dt * 10));
      bear.tongueOut = lerp(bear.tongueOut, 0, Math.min(1, dt * 10));
      const sniffNod = bear.sniff > 0 ? Math.sin(bear.sniff * Math.PI * 4) * 0.08 : 0;
      bear.headPitch = lerp(bear.headPitch, -0.2 + Math.sin(t * 1.3) * 0.04 + sniffNod, Math.min(1, dt * 6));
      this._aimBearTowardRemaining();
      if (landed) {
        if (landed.landedTimer >= 0.14) this._beginBearSprint(landed);
        else {
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
      const focus = landed || airborne;
      if (!focus) {
        bear.mode = 'wait';
      } else {
        bear.targetIndex = focus.index;
        bear.targetX = focus.x;
        if (Math.abs(focus.x - bear.x) > 10) bear.dir = focus.x >= bear.x ? 1 : -1;
        const dy = focus.y - 14 - (FLOOR_Y - 26);
        const dx = Math.max(24, Math.abs(focus.x - bear.x) - 30);
        const desired = clamp(Math.atan2(dy, dx) * 0.75, -0.62, 0.15);
        bear.headPitch = lerp(bear.headPitch, desired, Math.min(1, dt * 10));
        bear.jawOpen = lerp(bear.jawOpen, 0.2, Math.min(1, dt * 6));
        bear.yOffset = lerp(bear.yOffset, 1.4, Math.min(1, dt * 8));
        if (landed && landed.landedTimer >= 0.14) this._beginBearSprint(landed);
      }
    } else if (bear.mode === 'sprint') {
      const target = (bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null) || landed;
      if (!target || target.status === 'eaten') {
        bear.mode = 'wait';
        return;
      }
      const stopDist = 44;
      const dx = target.x - bear.x;
      const dist = Math.abs(dx);
      bear.dir = dx >= 0 ? 1 : -1;
      bear.stridePhase += dt * 13.5;
      bear.headPitch = lerp(bear.headPitch, 0.1, Math.min(1, dt * 10));
      bear.jawOpen = lerp(bear.jawOpen, 0.45, Math.min(1, dt * 8));

      bear.dustTimer -= dt;
      if (bear.dustTimer <= 0) {
        this._spawnSnow(bear.x - bear.dir * 20, FLOOR_Y, -bear.dir, 4);
        bear.dustTimer = 0.085;
      }
      bear.pawprintCooldown -= dt;
      if (bear.pawprintCooldown <= 0) {
        bear.pawSide = 1 - bear.pawSide;
        this._pawprints.push({ x: Math.round(bear.x - bear.dir * 14), y: FLOOR_Y + 2 + bear.pawSide * 2, life: 5, max: 5 });
        bear.pawprintCooldown = 0.12;
      }

      if (dist <= stopDist) {
        bear.mode = 'chompOpen';
        bear.modeTimer = 0.16;
        bear.targetIndex = target.index;
      } else {
        const step = Math.min(dist - stopDist + 1, 250 * dt);
        bear.x = clamp(bear.x + bear.dir * step, 50, W - 50);
      }
    } else if (bear.mode === 'chompOpen') {
      bear.modeTimer -= dt;
      bear.headPitch = lerp(bear.headPitch, 0.26, Math.min(1, dt * 16));
      bear.jawOpen = lerp(bear.jawOpen, 1, Math.min(1, dt * 22));
      bear.yOffset = lerp(bear.yOffset, -2, Math.min(1, dt * 14));
      if (bear.modeTimer <= 0) {
        const target = bear.targetIndex !== null ? this._penguins[bear.targetIndex] : null;
        const burstX = target ? target.x : bear.x + bear.dir * 44;
        if (target && target.status !== 'eaten') target.status = 'eaten';
        bear.mode = 'chompSnap';
        bear.modeTimer = 0.18;
        bear.hitFlashTimer = 0.07;
        this._screenFlash = 0.05;
        this._setBubble('NOM!', 1.15);
        this._shakeTimer = 0.28;
        this._spawnChompBurst(burstX, FLOOR_Y - 10);
      }
    } else if (bear.mode === 'chompSnap') {
      bear.modeTimer -= dt;
      bear.jawOpen = lerp(bear.jawOpen, 0, Math.min(1, dt * 28));
      bear.yOffset = lerp(bear.yOffset, 1.5, Math.min(1, dt * 18));
      if (bear.modeTimer <= 0) {
        bear.mode = 'chompChew';
        bear.modeTimer = 0.56;
      }
    } else if (bear.mode === 'chompChew') {
      bear.modeTimer -= dt;
      bear.headPitch = lerp(bear.headPitch, 0.04, Math.min(1, dt * 8));
      bear.jawOpen = 0.05 + (Math.floor(t * 9) % 2) * 0.28;
      bear.yOffset = lerp(bear.yOffset, 0, Math.min(1, dt * 10));
      if (bear.modeTimer <= 0) {
        bear.mode = 'chompLick';
        bear.modeTimer = 0.42;
      }
    } else if (bear.mode === 'chompLick') {
      bear.modeTimer -= dt;
      bear.jawOpen = lerp(bear.jawOpen, 0.22, Math.min(1, dt * 12));
      bear.tongueOut = Math.sin(clamp(1 - bear.modeTimer / 0.42, 0, 1) * Math.PI);
      if (bear.modeTimer <= 0) {
        bear.tongueOut = 0;
        bear.jawOpen = 0;
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
      bear.headPitch = lerp(bear.headPitch, 0.18, Math.min(1, dt * 10));
      bear.jawOpen = lerp(bear.jawOpen, 0.12 + (Math.floor(t * 14) % 2) * 0.12, Math.min(1, dt * 12));
      bear.yOffset = Math.floor(t * 22) % 2 ? 0.6 : 0;
      if (bear.modeTimer <= 0) {
        bear.mode = 'wait';
        bear.jawOpen = 0;
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
    bear.bubbleText = null;
    bear.dustTimer = 0;
    bear.pawprintCooldown = 0;
    this._spawnSnow(bear.x - bear.dir * 18, FLOOR_Y, -bear.dir, 8);
  }

  /* ------------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------------ */

  /** @private */
  _render() {
    const fb = this._fb;
    const t = this._elapsed;
    const S = this._static;

    // 1. Static backdrop
    fb.set(S.bg);

    // 2. Sky life: stars, shooting star, aurora (masked to open sky)
    this._drawSky(fb, t);

    // 3. Far snow
    this._drawSnow(fb, 0);

    // 4. Floor details & shadows
    this._drawPawprints(fb);
    this._drawBearShadow(fb);

    // 5. Bridge, trapdoors, lanterns
    this._drawBridge(fb, t);

    // 6. Mid snow & drips
    this._drawSnow(fb, 1);
    this._drawDrips(fb);

    // 7. Characters
    this._drawPenguins(fb, t);
    this._drawBear(fb, t);

    // 8. Particles
    this._drawParticles(fb);

    // 9. Lighting passes
    this._drawLighting(fb, t);

    // 10. Foreground silhouettes & near snow
    const fg = S.fg;
    for (let i = 160 * W; i < W * H; i += 1) {
      if (fg[i]) fb[i] = fg[i];
    }
    this._drawSnow(fb, 2);

    // 11. Vignette
    const vig = S.vig;
    for (let i = 0; i < vig.length; i += 1) {
      const c = MAP_DARK.get(fb[vig[i]]);
      if (c !== undefined) fb[vig[i]] = c;
    }

    // 12. Hit flash (one frame of moonlight wash)
    if (this._screenFlash > 0) {
      for (let i = 0; i < fb.length; i += 2) {
        const c = MAP_MOON.get(fb[i]);
        if (c !== undefined) fb[i] = c;
      }
    }

    // 13. UI badges
    this._drawBadges(fb, t);

    this._present();
  }

  /** @private */
  _present() {
    if (!this._ctx || !this._lowCtx || !this._img) return;
    this._lowCtx.putImageData(this._img, 0, 0);
    let sx = 0;
    let sy = 0;
    if (this._shakeTimer > 0) {
      const mag = Math.ceil((this._shakeTimer / 0.28) * 3);
      sx = Math.round((Math.random() * 2 - 1) * mag);
      sy = Math.round((Math.random() * 2 - 1) * mag);
    }
    const ctx = this._ctx;
    ctx.imageSmoothingEnabled = false;
    if (sx || sy) {
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, W * SCALE, H * SCALE);
    }
    ctx.drawImage(this._low, sx * SCALE, sy * SCALE, W * SCALE, H * SCALE);
  }

  /** @private */
  _drawSky(fb, t) {
    const mask = this._static.mask;
    // Stars
    for (let i = 0; i < this._stars.length; i += 1) {
      const s = this._stars[i];
      const idx = s.y * W + s.x;
      if (mask[idx] !== 1) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const v = s.b * 0.7 + tw * 0.3;
      if (v > 0.86) {
        fb[idx] = P[13];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (s.y + dy) * W + s.x + dx;
          if (s.y + dy >= 0 && mask[j] === 1) fb[j] = P[9];
        }
      } else {
        fb[idx] = v > 0.65 ? P[12] : v > 0.45 ? P[10] : v > 0.25 ? P[8] : P[6];
      }
    }

    // Shooting star
    const ss = this._shooting;
    if (ss.active) {
      const len = 12;
      const nx = ss.vx / Math.hypot(ss.vx, ss.vy);
      const ny = ss.vy / Math.hypot(ss.vx, ss.vy);
      for (let k = 0; k < len; k += 1) {
        const x = Math.round(ss.x - nx * k);
        const y = Math.round(ss.y - ny * k);
        if (x < 0 || y < 0 || x >= W || y >= H || mask[y * W + x] !== 1) continue;
        if (k > 3 && bay(x, y) > (1 - k / len) * 16) continue;
        fb[y * W + x] = k === 0 ? P[13] : k < 3 ? P[12] : k < 7 ? P[10] : P[8];
      }
    }

    // Aurora ribbons with vertical light rays
    const ribbons = [
      { base: 30, amp: 7, f1: 0.017, f2: 0.043, s1: 0.32, s2: 0.21, x0: 0, x1: 300, k: 0 },
      { base: 42, amp: 6, f1: 0.021, f2: 0.037, s1: 0.27, s2: 0.33, x0: 120, x1: 480, k: 1 },
      { base: 22, amp: 5, f1: 0.025, f2: 0.051, s1: 0.4, s2: 0.18, x0: 230, x1: 480, k: 2 },
    ];
    for (const r of ribbons) {
      const span = r.x1 - r.x0;
      for (let x = r.x0; x < r.x1; x += 1) {
        const edge = Math.sin((Math.PI * (x - r.x0)) / span);
        const cy = r.base + r.amp * Math.sin(x * r.f1 + t * r.s1 + r.k) + r.amp * 0.5 * Math.sin(x * r.f2 - t * r.s2 + r.k * 2);
        const I = edge * (0.5 + 0.5 * Math.sin(x * 0.06 + t * 0.8 + r.k * 2.3)) * 0.85;
        if (I < 0.05) continue;
        const ray = vnoise(x * 0.22 + t * 0.55 + r.k * 7);
        const Lr = 8 + ray * 18;
        const yb = Math.round(cy + 2);
        const yt = Math.round(cy - Lr);
        for (let y = Math.max(0, yt); y <= yb; y += 1) {
          const idx = y * W + x;
          if (mask[idx] !== 1) continue;
          const f = (yb - y) / (yb - yt + 1);
          const dens = I * (f < 0.15 ? 0.95 : (1 - f) * (0.45 + ray * 0.45));
          if (bay(x, y) >= dens * 16) continue;
          fb[idx] = f < 0.12 ? P[21] : f < 0.35 ? P[20] : f < 0.6 ? P[17] : f < 0.82 ? P[23] : P[22];
        }
      }
    }
  }

  /** @private */
  _drawSnow(fb, layer) {
    for (let i = 0; i < this._flakes.length; i += 1) {
      const f = this._flakes[i];
      if (f.layer !== layer) continue;
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      if (layer === 0) px(fb, x, y, P[8]);
      else if (layer === 1) px(fb, x, y, P[11]);
      else {
        px(fb, x, y, P[13]);
        px(fb, x + 1, y, P[12]);
        px(fb, x, y + 1, P[12]);
        px(fb, x + 1, y + 1, P[11]);
      }
    }
  }

  /** @private */
  _drawPawprints(fb) {
    for (const pp of this._pawprints) {
      const dens = pp.life / pp.max;
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = pp.x + dx;
        if (bay(x, pp.y) < dens * 16) px(fb, x, pp.y, dx === 0 ? P[8] : P[9]);
      }
      if (bay(pp.x, pp.y - 1) < dens * 12) px(fb, pp.x, pp.y - 1, P[10]);
    }
  }

  /** @private */
  _drawBearShadow(fb) {
    const b = this._bear;
    const lift = Math.max(0, -b.yOffset);
    mapRadial(fb, Math.round(b.x + b.dir * 4), FLOOR_Y + 1, 34 - lift * 2, 4, 1.4 - lift * 0.15, MAP_DARK, 1);
    for (const p of this._penguins) {
      if (p.status === 'landed') mapRadial(fb, p.x, FLOOR_Y + 1, 9, 2.5, 1.2, MAP_DARK, 1);
      if (p.status === 'falling') {
        const k = clamp((p.y - SNOW_Y) / (FLOOR_Y - SNOW_Y), 0, 1);
        mapRadial(fb, p.x, FLOOR_Y + 1, 4 + k * 6, 2, 0.4 + k * 0.8, MAP_DARK, 1);
      }
    }
  }

  /** @private */
  _drawBridge(fb, t) {
    const B = this._bridge;
    if (!B) return;
    const bb = B.buf;
    for (let i = 44 * W; i < 112 * W; i += 1) {
      if (bb[i]) fb[i] = bb[i];
    }

    // Trapdoors (iron-banded timber, rotating in-plane about the lower hinge)
    const T = DECK_BOTTOM - SNOW_Y;
    for (let i = 0; i < this._trapdoors.length; i += 1) {
      const d = this._trapdoors[i];
      const a = (d.angle * Math.PI) / 180;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const hx = d.x0;
      const hy = DECK_BOTTOM;
      const R = d.w + T + 2;
      for (let y = hy - T - 1; y <= hy + R; y += 1) {
        for (let x = hx - 2; x <= hx + R; x += 1) {
          const dx = x + 0.5 - hx;
          const dy = y + 0.5 - hy;
          const u = dx * ca + dy * sa;
          const v = -dx * sa + dy * ca;
          if (u < 0 || u >= d.w || v < -T || v >= 0) continue;
          const uu = Math.floor(u);
          const vv = Math.floor(v + T);
          let c;
          if (d.snow && vv < 4) {
            const lump = vv === 0 && (hash2(uu + i * 31, 1) > 0.6 || uu === 0 || uu === d.w - 1);
            if (lump) continue;
            c = vv <= 1 ? P[13] : vv === 2 ? P[12] : P[11];
          } else if (uu === 0 || uu === d.w - 1 || vv === T - 1 || (!d.snow && vv === 0)) {
            c = P[30];
          } else if (vv === 6 || vv === 11) {
            c = uu % 5 === 2 ? P[35] : P[34];
          } else if (vv === 7 || vv === 12) {
            c = P[33];
          } else if (uu % 6 === 0) {
            c = P[30];
          } else {
            const g = hash2(uu * 7 + i, vv >> 1);
            c = g > 0.82 ? P[30] : uu % 6 === 5 ? P[32] : g > 0.4 ? P[31] : P[32];
          }
          if (uu < 3 && vv > T - 4) c = P[33];
          if (d.angle > 40 && bay(x, y) < 6) c = MAP_DARK.get(c) || c;
          px(fb, x, y, c);
        }
      }
      // Cracks glowing along the frame while breaking open
      if (d.crackGlow > 0) {
        for (let k = 0; k < 6; k += 1) {
          if (hash2(k, Math.floor(t * 20)) > d.crackGlow) continue;
          const side = k % 2 === 0 ? d.x0 - 2 - (k >> 1) : d.x0 + d.w + 1 + (k >> 1);
          const y = BLOCK_Y + 1 + Math.floor(hash2(k * 7, i) * 8);
          px(fb, side, y, P[13]);
          px(fb, side + (k % 2 === 0 ? -1 : 1), y + 1, P[12]);
        }
      }
    }

    // Lantern flames
    for (let k = 0; k < LANTERNS.length; k += 1) {
      const L = LANTERNS[k];
      const fl = Math.sin(t * 13 + k * 2) * Math.sin(t * 7.3 + k);
      const sway = Math.round(Math.sin(t * 9 + k * 3) * 0.7);
      const tall = fl > 0.2 ? 1 : 0;
      for (let x = L.x - 1; x <= L.x + 1; x += 1) px(fb, x, 62, P[27]);
      px(fb, L.x, 62, P[29]);
      px(fb, L.x, 61, P[28]);
      px(fb, L.x + sway, 60, P[28]);
      px(fb, L.x + sway, 59 - tall, P[29]);
      if (tall) px(fb, L.x + sway, 59, P[28]);
    }
  }

  /** @private */
  _drawDrips(fb) {
    for (const d of this._drips) {
      if (!d.active) continue;
      const y = Math.round(d.y);
      px(fb, d.x, y, P[12]);
      if (d.vy > 60) px(fb, d.x, y - 1, P[10]);
    }
  }

  /** @private */
  _penguinPose(p, t) {
    const o = {
      dir: p.facingDir,
      s: p.scale,
      lean: 0,
      rot: 0,
      breath: Math.sin(p.breathPhase),
      blink: p.blinkTimer > 0,
      turn: p.turn,
      pitch: p.pitch,
      fl: 0.12,
      ff: 0,
      beak: 0,
      squash: 1,
      alert: false,
      hop: 0,
      shake: 0,
    };
    if (p.status === 'idle') {
      o.lean = Math.sin(p.swayPhase) * 0.05;
      o.fl = 0.12 + Math.sin(p.swayPhase * 0.7) * 0.06;
    } else if (p.status === 'cheer') {
      if (p.cheerDelay <= 0) {
        const el = 0.72 - p.timer;
        o.hop = Math.round(Math.abs(Math.sin((el * Math.PI) / 0.36)) * 6);
        const flap = Math.sin(el * 30 + p.index);
        o.fl = 1.2 + flap * 0.8;
        o.ff = 1.2 - flap * 0.8;
        o.beak = 0.6;
      }
    } else if (p.status === 'panic') {
      o.shake = Math.floor(t * 30) % 2 ? 1 : -1;
      o.fl = 1.9 + Math.sin(t * 40) * 0.7;
      o.ff = 1.9 + Math.cos(t * 40) * 0.7;
      o.beak = 1;
      o.alert = true;
      o.pitch = 0.45;
      o.turn = 0;
    } else if (p.status === 'falling') {
      o.rot = p.rotation;
      o.fl = 2 + Math.sin(t * 42) * 0.8;
      o.ff = 2 + Math.cos(t * 42) * 0.8;
      o.beak = 1;
      o.alert = true;
      o.turn = 0;
      o.pitch = -0.2;
    } else if (p.status === 'landed') {
      o.squash = p.squashY;
      o.shake = Math.floor(t * 16) % 2;
      o.fl = 1.4 + Math.sin(t * 34) * 0.9;
      o.ff = 1.4 + Math.cos(t * 34) * 0.9;
      o.beak = Math.floor(t * 10) % 2 ? 1 : 0.4;
      o.alert = true;
      o.turn = 0;
      o.pitch = -0.25;
      o.lean = Math.sin(t * 20) * 0.1;
      o.hop = Math.round(Math.abs(Math.sin(t * 12)) * 1.4);
    }
    return o;
  }

  /** @private */
  _drawPenguins(fb, t) {
    const spr = this._penguinSprite;
    for (let i = 0; i < this._penguins.length; i += 1) {
      const p = this._penguins[i];
      if (p.status === 'eaten') continue;
      const o = this._penguinPose(p, t);
      if (p.status === 'idle' || p.status === 'cheer') {
        mapRadial(fb, p.x + 1, SNOW_Y, 8, 1.6, o.hop ? 0.7 : 1.3, MAP_DARK, 1);
      }
      buildPenguin(spr, o);
      spr.resolve(fb, Math.round(p.x), Math.round(p.y), o.dir < 0);
      if (p.status === 'panic' || (p.status === 'landed' && Math.floor(t * 6) % 2 === 0)) {
        const by = Math.round(p.y) - 36 - (Math.floor(t * 12) % 2);
        drawBadge(fb, '!', p.x, by, 1, P[13], P[12], P[54], P[43], P[1]);
      }
    }
  }

  /** @private */
  _bearPose(t) {
    const b = this._bear;
    let flex = 0;
    let yo = b.yOffset;
    const stand = 0.15 + Math.max(0, yo) * 0.1;
    const legs = {
      hn: [stand, -0.3 - Math.max(0, yo) * 0.2],
      hf: [stand + 0.05, -0.32],
      fn: [0.04, -0.06],
      ff: [-0.02, -0.04],
    };
    if (b.mode === 'sprint') {
      const frame = Math.floor((b.stridePhase / (Math.PI * 2)) * 6) % 6;
      const phi = (frame / 6) * Math.PI * 2;
      const pose = (off, front) => {
        const sw = Math.sin(phi + off);
        const lift = Math.max(0, Math.cos(phi + off));
        return front ? [0.7 * sw, -1.15 * lift] : [0.65 * sw + 0.1, -0.35 - 0.85 * lift];
      };
      legs.hn = pose(0, false);
      legs.hf = pose(0.55, false);
      legs.fn = pose(2.7, true);
      legs.ff = pose(3.25, true);
      flex = -Math.sin(phi);
      yo = -Math.round(1 + 3 * Math.max(0, Math.sin(phi + 0.4)));
    }
    if (b.pawStamp > 0.55) {
      legs.fn = [0.55, -1.25];
    }
    return {
      dir: b.dir,
      yo,
      flex,
      breath: Math.sin(t * 1.7),
      legs,
      pitch: b.headPitch,
      jaw: b.jawOpen,
      tongue: b.tongueOut,
      blink: b.blinkTimer > 0,
      ear: b.ear,
      lunge: b.lunge,
      neckDrop: b.mode === 'grumble' ? 1.5 : 0,
    };
  }

  /** @private */
  _drawBear(fb, t) {
    const b = this._bear;
    const pose = this._bearPose(t);
    buildBear(this._bearSprite, pose);
    this._bearSprite.resolve(fb, Math.round(b.x), FLOOR_Y, b.dir < 0, { rim2: true, flash: b.hitFlashTimer > 0 });
  }

  /** @private */
  _drawParticles(fb) {
    for (const pt of this._particles) {
      const x = Math.round(pt.x);
      const y = Math.round(pt.y);
      const lf = pt.life / pt.max;
      switch (pt.kind) {
        case 'snow':
          px(fb, x, y, pt.c);
          if (pt.size > 1 && lf > 0.3) {
            px(fb, x + 1, y, P[12]);
            px(fb, x, y + 1, P[11]);
          }
          break;
        case 'shard': {
          px(fb, x, y, pt.c);
          px(fb, x + Math.round(Math.cos(pt.rot)), y + Math.round(Math.sin(pt.rot)), P[10]);
          if (lf > 0.5) px(fb, x - Math.round(Math.cos(pt.rot)), y - Math.round(Math.sin(pt.rot)), P[13]);
          break;
        }
        case 'feather': {
          const s = Math.sin(this._elapsed * 6 + pt.sway) > 0 ? 1 : 0;
          px(fb, x, y, pt.c);
          px(fb, x + 1, y + s, pt.c);
          if (lf > 0.4) px(fb, x - 1, y - s, pt.c === P[13] ? P[11] : P[44]);
          break;
        }
        case 'drop':
          px(fb, x, y, pt.c);
          break;
        case 'spark':
          px(fb, x, y, pt.c);
          if (lf > 0.5) {
            px(fb, x + 1, y, pt.c);
            px(fb, x - 1, y, pt.c);
            px(fb, x, y + 1, pt.c);
            px(fb, x, y - 1, pt.c);
          }
          break;
        case 'puff': {
          const r = pt.r;
          const dens = lf * 0.75;
          for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy += 1) {
            for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx += 1) {
              const d = Math.hypot(xx - x, yy - y) / (r + 0.01);
              if (d > 1) continue;
              if (bay(xx, yy) < dens * (1 - d * 0.6) * 16) px(fb, xx, yy, d < 0.5 ? pt.c : P[11]);
            }
          }
          break;
        }
        default:
          break;
      }
    }
  }

  /** @private */
  _drawLighting(fb, t) {
    // Volumetric moonlight shafts falling into the cave
    const shafts = [[150, 22, 0], [268, 15, 1.7], [362, 26, 3.1]];
    for (const [sx, sw, ph] of shafts) {
      const inten = 0.26 * (0.8 + 0.2 * Math.sin(t * 0.7 + ph));
      for (let y = DECK_BOTTOM; y < FLOOR_Y + 3; y += 1) {
        const xl = sx - (y - DECK_BOTTOM) * 0.32;
        const vf = 1 - (y - DECK_BOTTOM) / 112;
        for (let x = Math.floor(xl); x < xl + sw; x += 1) {
          const e = Math.sin((Math.PI * (x - xl)) / sw);
          if (bay(x, y) < inten * e * vf * 16) mapPx(fb, x, y, MAP_MOON);
        }
      }
    }

    // Pulsing crystal glows
    for (const cl of CRYSTAL_CLUSTERS) {
      const pulse = 0.42 + 0.22 * Math.sin(t * 1.8 + cl.phase);
      mapRadial(fb, cl.gx, cl.gy, cl.gr, cl.gr * 0.85, pulse, MAP_TEAL);
    }

    // Warm lantern light pools (tint nearby penguins & snow)
    for (let k = 0; k < LANTERNS.length; k += 1) {
      const L = LANTERNS[k];
      const fl = 0.5 + 0.5 * Math.sin(t * 13 + k * 2) * Math.sin(t * 7.3 + k);
      const R = 44 + fl * 4;
      mapRadial(fb, L.x, L.y + 4, R, R * 0.85, 0.7 + fl * 0.12, MAP_WARM);
      mapRadial(fb, L.x, L.y + 1, 9, 9, 0.9, MAP_WARM);
    }

    // Drifting fog bands near the cave floor
    for (let y = 170; y < 202; y += 1) {
      const fall = 1 - Math.abs(y - 187) / 16;
      if (fall <= 0) continue;
      for (let x = 0; x < W; x += 1) {
        const d = fall * (0.5 + 0.5 * Math.sin(x * 0.045 + t * 0.5 + Math.sin(y * 0.3))) * (0.6 + 0.4 * Math.sin(x * 0.013 - t * 0.3));
        if (bay(x, y) < d * 0.42 * 16) mapPx(fb, x, y, MAP_FOG);
      }
    }
  }

  /** @private */
  _drawBadges(fb) {
    const b = this._bear;
    if (!b.bubbleText) return;
    const age = b.bubbleMax - b.bubbleTimer;
    const s = age < 0.05 ? 1 : age < 0.13 ? 3 : 2;
    const cx = clamp(Math.round(b.x + b.dir * 30), 34, W - 34);
    const cy = FLOOR_Y - 60 - Math.min(3, Math.floor(age * 6));
    if (b.bubbleText === 'NOM!') {
      drawBadge(fb, 'NOM!', cx, cy, s, P[50], P[49], P[54], P[43], P[1]);
    } else {
      drawBadge(fb, b.bubbleText, cx, cy, s, P[28], P[27], P[25], P[43], P[1]);
    }
  }
}
