import { sampleBilinear } from '../character/faceFilterBase';

// ════════════════════════════════════════════════════════════════════════
//  Warp primitives for the "Forvrængning 2" filters. Each returns a new
//  ImageData; the originals copy through untouched outside the affected region.
// ════════════════════════════════════════════════════════════════════════

/**
 * Anisotropic magnify / shrink inside an ellipse.
 *  • scaleX / scaleY  > 1 magnify that axis, < 1 shrink it.
 *  • `plateau` (0–1) keeps FULL strength out to that normalised radius before
 *    tapering smoothly to 0 at the edge — useful so a whole feature scales
 *    evenly instead of only its centre.
 */
export function pxAniso(
  data: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  rx: number, ry: number,
  scaleX: number, scaleY: number,
  plateau = 0,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const axAmt = 1 - 1 / scaleX;     // >0 magnify, <0 shrink
  const ayAmt = 1 - 1 / scaleY;
  const x0 = Math.max(0, (cx - rx) | 0), x1 = Math.min(W, (cx + rx + 1) | 0);
  const y0 = Math.max(0, (cy - ry) | 0), y1 = Math.min(H, (cy + ry + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      const r = Math.sqrt(nx * nx + ny * ny);
      if (r >= 1) continue;
      let fall: number;
      if (r <= plateau) fall = 1;
      else { const tt = (r - plateau) / (1 - plateau); fall = (1 - tt) * (1 - tt); }
      const smX = 1 - axAmt * fall;
      const smY = 1 - ayAmt * fall;
      const sx = cx + (x - cx) * smX;
      const sy = cy + (y - cy) * smY;
      const [r2, g2, b2, a2] = sampleBilinear(data, W, H, sx, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r2; out.data[di + 1] = g2; out.data[di + 2] = b2; out.data[di + 3] = a2;
    }
  }
  return out;
}

/**
 * Explode — push the face radially outward by `push` (0 = assembled, 1 = fully
 * burst). A high-frequency radial ripple adds a shattered look while it expands.
 * Drive `push` with a 0→1→0 envelope so the face explodes and reassembles.
 */
export function pxExplode(
  data: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  radius: number,
  push: number,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);
  if (push <= 0.001) return out;

  const x0 = Math.max(0, (cx - radius) | 0), x1 = Math.min(W, (cx + radius + 1) | 0);
  const y0 = Math.max(0, (cy - radius) | 0), y1 = Math.min(H, (cy + radius + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius) continue;
      const t = dist / radius;
      const fall = 1 - t;
      // Sample nearer the centre so content spreads outward; ripple = shatter.
      const sm = 1 - push * fall - Math.sin(t * Math.PI * 6) * push * 0.07;
      const sx = cx + dx * sm, sy = cy + dy * sm;
      const [r, g, b, a] = sampleBilinear(data, W, H, sx, sy);
      // Blend back to the original toward the edge so there is no hard circle.
      const w = t <= 0.55 ? 1 : (1 - (t - 0.55) / 0.45);
      const di = (y * W + x) * 4;
      out.data[di]     = data[di]     + (r - data[di]) * w;
      out.data[di + 1] = data[di + 1] + (g - data[di + 1]) * w;
      out.data[di + 2] = data[di + 2] + (b - data[di + 2]) * w;
      out.data[di + 3] = a;
    }
  }
  return out;
}

/**
 * Jelly / wobble — animated sinusoidal displacement inside a circle. The
 * displacement is a travelling wave (driven by `t`) whose strength fades to 0 at
 * the edge so the head melts into a wobbling blob without a hard seam.
 */
export function pxJelly(
  data: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  radius: number,
  t: number,
  amp: number,
  freq: number,
  speed: number,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const x0 = Math.max(0, (cx - radius) | 0), x1 = Math.min(W, (cx + radius + 1) | 0);
  const y0 = Math.max(0, (cy - radius) | 0), y1 = Math.min(H, (cy + radius + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius) continue;
      const fall = 1 - dist / radius;        // 1 centre → 0 edge
      const w = fall * fall;
      const ox = Math.sin(y * freq + t * speed) * amp * w;
      const oy = Math.cos(x * freq + t * speed * 0.85) * amp * w;
      const [r, g, b, a] = sampleBilinear(data, W, H, x + ox, y + oy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}

/**
 * Slow-motion jelly — a thick, viscous wobble: a single slow swaying
 * displacement (low frequency, large amplitude) plus a gentle global drift, so
 * the whole face sloshes as if suspended in gel. `t` drives the motion.
 */
export function pxSlowJelly(
  data: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  radius: number,
  t: number,
  amp: number,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  // Slow global sway vector — the body of gel drifts as one.
  const swayX = Math.sin(t * 0.9) * amp;
  const swayY = Math.cos(t * 0.7) * amp * 0.6;
  const x0 = Math.max(0, (cx - radius) | 0), x1 = Math.min(W, (cx + radius + 1) | 0);
  const y0 = Math.max(0, (cy - radius) | 0), y1 = Math.min(H, (cy + radius + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius) continue;
      const fall = 1 - dist / radius;
      const w = fall * fall * (3 - 2 * fall);   // smoothstep — gooey, soft edge
      // Long-wavelength internal undulation, lagging across the face.
      const ox = swayX * w + Math.sin(dy * 0.012 + t * 0.9) * amp * 0.5 * w;
      const oy = swayY * w + Math.sin(dx * 0.012 + t * 1.1) * amp * 0.5 * w;
      const [r, g, b, a] = sampleBilinear(data, W, H, x + ox, y + oy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}

/**
 * Blockify — quantise an elliptical region to a coarse grid so the face turns
 * into chunky Minecraft-style cubes. Every pixel in a block reads the colour at
 * that block's centre. The grid is aligned to the head roll so the blocks stay
 * square-on to the face when the head tilts.
 */
export function pxBlockify(
  data: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  rx: number, ry: number,
  block: number,
  angle: number,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const cos = Math.cos(angle), sin = Math.sin(angle);
  const maxR = Math.max(rx, ry) + 2;
  const x0 = Math.max(0, (cx - maxR) | 0), x1 = Math.min(W, (cx + maxR + 1) | 0);
  const y0 = Math.max(0, (cy - maxR) | 0), y1 = Math.min(H, (cy + maxR + 1) | 0);
  const half = block / 2;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      // Into the face frame (so the grid follows the head tilt).
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if ((u / rx) * (u / rx) + (v / ry) * (v / ry) >= 1) continue;
      // Snap to the block centre in face space, then rotate back to sample.
      const bu = Math.floor(u / block) * block + half;
      const bv = Math.floor(v / block) * block + half;
      const sx = cx + bu * cos - bv * sin;
      const sy = cy + bu * sin + bv * cos;
      const [r, g, b, a] = sampleBilinear(data, W, H, sx, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}

/**
 * Taper — squeeze the face horizontally by an amount that varies down the head,
 * turning it into a triangle/funnel. `topScale`…`botScale` are the width factors
 * at the top and bottom of the region (1 = unchanged, <1 = narrower). The taper
 * follows the head roll.
 */
export function pxTaper(
  data: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  rx: number, ry: number,
  topScale: number, botScale: number,
  angle: number,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const cos = Math.cos(angle), sin = Math.sin(angle);
  const maxR = Math.max(rx, ry) + 2;
  const x0 = Math.max(0, (cx - maxR) | 0), x1 = Math.min(W, (cx + maxR + 1) | 0);
  const y0 = Math.max(0, (cy - maxR) | 0), y1 = Math.min(H, (cy + maxR + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      const u = dx * cos + dy * sin;     // along face-right
      const v = -dx * sin + dy * cos;    // down the face
      const er = Math.sqrt((u / rx) * (u / rx) + (v / ry) * (v / ry));
      if (er >= 1) continue;
      const f = (v / ry + 1) / 2;        // 0 at top … 1 at bottom
      const rowScale = topScale + (botScale - topScale) * f;
      // Fade the taper to identity toward the edge so there is NO hard circular
      // seam — only the person tapers, blending smoothly into the surroundings.
      const blend = er <= 0.6 ? 1 : (1 - (er - 0.6) / 0.4);
      const effScale = 1 + (rowScale - 1) * blend;
      // Narrow the row: sample farther out along u so content is pulled inward.
      const su = u / effScale;
      const sx = cx + su * cos - v * sin;
      const sy = cy + su * sin + v * cos;
      const [r, g, b, a] = sampleBilinear(data, W, H, sx, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}

/**
 * Mirror one half of the face onto the other across the face's symmetry axis.
 * The axis passes through (cx,cy) at the head-roll `angle`. Pixels on the
 * destination half (chosen by `srcSign`: -1 = copy the LEFT half onto the right)
 * are replaced by their mirror image, so the face becomes perfectly symmetric.
 */
export function pxMirrorFace(
  data: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  rx: number, ry: number,
  angle: number,
  srcSign: -1 | 1,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const cos = Math.cos(angle), sin = Math.sin(angle);
  const maxR = Math.max(rx, ry) + 2;
  const x0 = Math.max(0, (cx - maxR) | 0), x1 = Math.min(W, (cx + maxR + 1) | 0);
  const y0 = Math.max(0, (cy - maxR) | 0), y1 = Math.min(H, (cy + maxR + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      // Into the face frame: u = along face-right, v = down the face.
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      const er = Math.sqrt((u / rx) * (u / rx) + (v / ry) * (v / ry));
      if (er >= 1) continue;
      // Destination half is the side OPPOSITE the source: copy srcSign half over.
      if (u * srcSign >= 0) continue;
      // Mirror u, rotate back to image space.
      const mu = -u;
      const sx = cx + mu * cos - v * sin;
      const sy = cy + mu * sin + v * cos;
      const [r, g, b] = sampleBilinear(data, W, H, sx, sy);
      // Blend back to the original toward the edge so there is no hard circle.
      const w = er <= 0.6 ? 1 : (1 - (er - 0.6) / 0.4);
      const di = (y * W + x) * 4;
      out.data[di]     = data[di]     + (r - data[di]) * w;
      out.data[di + 1] = data[di + 1] + (g - data[di + 1]) * w;
      out.data[di + 2] = data[di + 2] + (b - data[di + 2]) * w;
    }
  }
  return out;
}
