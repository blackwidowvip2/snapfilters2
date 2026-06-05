import { sampleBilinear } from './faceFilterBase';

/**
 * Alien Head pixel filter — narrows the LOWER part of the head horizontally so
 * the face tapers to a small chin while the top stays wide (classic "grey
 * alien" silhouette). The horizontal squeeze is ~0 around the eyes and grows
 * smoothly toward the chin.
 */
export function pxAlienHead(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  strength = 0.5,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const x0 = Math.max(0, (cx - rx) | 0);
  const x1 = Math.min(W, (cx + rx + 1) | 0);
  const y0 = Math.max(0, (cy - ry) | 0);
  const y1 = Math.min(H, (cy + ry + 1) | 0);

  for (let y = y0; y < y1; y++) {
    const ny = (y - cy) / ry;          // −1 top … +1 bottom (relative to centre)
    // Vertical weight: nothing above the centre line, grows toward the chin.
    const vw = ny <= 0 ? 0 : (ny >= 1 ? 1 : ny * ny);
    if (vw <= 0) continue;

    for (let x = x0; x < x1; x++) {
      const nx = (x - cx) / rx;
      const r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;

      const t = 1 - r2;                 // smooth falloff toward the ellipse edge
      const warp = strength * t * vw;   // squeeze grows toward the chin

      // Sample from FURTHER OUT so outer content moves inward → face narrows.
      const sx = cx + (x - cx) * (1 + warp);
      const sy = y;

      const [r, g, b, a] = sampleBilinear(data, W, H, sx, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}
