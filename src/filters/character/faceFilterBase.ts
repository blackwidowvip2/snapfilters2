import { DrawCtx } from '../DrawCtx';

/** Shared helpers used by character face-warp filters. */

export interface FaceRegion {
  cx: number; cy: number;
  rx: number; ry: number;
}

/** Return an ellipse region centred on a landmark with a given radius scale. */
export function landmarkRegion(d: DrawCtx, idx: number, rx: number, ry: number): FaceRegion {
  const p = d.pt(idx);
  return { cx: p.x, cy: p.y, rx: rx * d.s, ry: ry * d.s };
}

/** Bi-linear sample from ImageData — clamped to edges. */
export function sampleBilinear(data: Uint8ClampedArray, W: number, H: number, sx: number, sy: number): [number, number, number, number] {
  const x0 = Math.max(0, Math.min(W - 1, Math.floor(sx)));
  const y0 = Math.max(0, Math.min(H - 1, Math.floor(sy)));
  const x1 = Math.min(W - 1, x0 + 1);
  const y1 = Math.min(H - 1, y0 + 1);
  const fx = sx - x0, fy = sy - y0;
  const w00 = (1 - fx) * (1 - fy);
  const w10 =       fx * (1 - fy);
  const w01 = (1 - fx) *       fy;
  const w11 =       fx *       fy;
  const i00 = (y0 * W + x0) * 4;
  const i10 = (y0 * W + x1) * 4;
  const i01 = (y1 * W + x0) * 4;
  const i11 = (y1 * W + x1) * 4;
  return [
    data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11,
    data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11,
    data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11,
    data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11,
  ];
}

/**
 * Apply a radial warp to a circular region of an ImageData.
 * @param scale  > 1 = magnify (big eyes), < 1 = shrink (slim)
 */
export function radialWarp(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  W: number, H: number,
  cx: number, cy: number,
  radius: number,
  scale: number,
): void {
  // `scale` > 1 magnifies. To magnify, each destination pixel must read its
  // colour from a source point CLOSER to the centre (sm < 1), so the content
  // near the centre is spread outward. The effect is strongest at the centre
  // (t = 0) and smoothly fades to identity at the edge (t = 1).
  const amount = 1 - 1 / scale;          // 0 = none, →1 as scale grows
  const yStart = Math.max(0, Math.floor(cy - radius));
  const yEnd   = Math.min(H, Math.ceil(cy + radius));
  const xStart = Math.max(0, Math.floor(cx - radius));
  const xEnd   = Math.min(W, Math.ceil(cx + radius));

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius) continue;
      const t  = dist / radius;          // 0 at centre, 1 at edge
      // Smooth falloff (1 at centre → 0 at edge); sample nearer the centre.
      const fall = (1 - t) * (1 - t);
      const sm = 1 - amount * fall;       // < 1 in the interior → magnifies
      const sx = cx + dx * sm;
      const sy = cy + dy * sm;
      const [r, g, b, a] = sampleBilinear(src, W, H, sx, sy);
      const di = (y * W + x) * 4;
      dst[di] = r; dst[di + 1] = g; dst[di + 2] = b; dst[di + 3] = a;
    }
  }
}
