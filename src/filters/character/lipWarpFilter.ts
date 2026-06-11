import { sampleBilinear } from './faceFilterBase';

/**
 * Wide-lips warp — an anisotropic magnification confined to a lip-shaped ellipse
 * (rx wide, ry short). The horizontal magnification (`scaleX`) is larger than the
 * vertical (`scaleY`) so the lips grow mostly WIDER, and the elliptical falloff
 * keeps the effect on the lips instead of bulging the chin/cheeks.
 */
export function pxWideLips(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  scaleX = 2.6,
  scaleY = 1.7,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const x0 = Math.max(0, (cx - rx) | 0);
  const x1 = Math.min(W, (cx + rx + 1) | 0);
  const y0 = Math.max(0, (cy - ry) | 0);
  const y1 = Math.min(H, (cy + ry + 1) | 0);

  const ax = 1 - 1 / scaleX;   // horizontal magnification amount
  const ay = 1 - 1 / scaleY;   // vertical magnification amount

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const r = Math.sqrt(nx * nx + ny * ny);
      if (r >= 1) continue;            // outside the lip ellipse

      // Plateau falloff: FULL magnification across the inner region (so the whole
      // lip — including its corners — widens), tapering to 0 only near the edge.
      const PLATEAU = 0.72;
      let fall: number;
      if (r <= PLATEAU) {
        fall = 1;
      } else {
        const tt = (r - PLATEAU) / (1 - PLATEAU);
        fall = 1 - tt * tt * (3 - 2 * tt);   // smoothstep → 0 at the edge
      }

      const smX = 1 - ax * fall;       // < 1 → sample nearer centre → magnify
      const smY = 1 - ay * fall;
      const sx = cx + (x - cx) * smX;
      const sy = cy + (y - cy) * smY;

      const [rr, g, b, a] = sampleBilinear(data, W, H, sx, sy);
      const di = (y * W + x) * 4;
      out.data[di] = rr; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}
