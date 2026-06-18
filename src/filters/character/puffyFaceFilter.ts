import { sampleBilinear } from './faceFilterBase';

export interface Cheek {
  cx: number; cy: number; rx: number; ry: number;
  push: number;   // max outward displacement (px)
  dirX: number;   // +1/-1 pointing toward the face centre (sample side)
}

/**
 * Puffy Face pixel filter — inflates the CHEEKS only, like a chubby lens.
 *
 * Each cheek pushes its skin OUTWARD (away from the face centre) with a smooth
 * bump that is strongest at the cheek centre and 0 at its rim. This widens the
 * face side into a full, round cheek without magnifying, and fades out before
 * reaching the eyes, nose or mouth (those features stay untouched). A pixel is
 * warped by whichever cheek lobe it falls inside.
 */
export function pxPuffyFace(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  cheeks: Cheek[],
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (const c of cheeks) {
    x0 = Math.min(x0, c.cx - c.rx - c.push); x1 = Math.max(x1, c.cx + c.rx + c.push);
    y0 = Math.min(y0, c.cy - c.ry); y1 = Math.max(y1, c.cy + c.ry);
  }
  x0 = Math.max(0, x0 | 0); x1 = Math.min(W, (x1 + 1) | 0);
  y0 = Math.max(0, y0 | 0); y1 = Math.min(H, (y1 + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let best: Cheek | null = null, bestR2 = 1;
      for (const c of cheeks) {
        const nx = (x - c.cx) / c.rx, ny = (y - c.cy) / c.ry;
        const r2 = nx * nx + ny * ny;
        if (r2 < bestR2) { bestR2 = r2; best = c; }
      }
      if (!best) continue;

      // Smooth bump, max at the cheek centre, 0 at the rim. Sampling toward the
      // face centre makes the cheek content move outward → a wider, fuller cheek.
      const t = 1 - bestR2;
      const sx = x + best.dirX * best.push * t * t;

      const [r, g, b, a] = sampleBilinear(data, W, H, sx, y);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}
