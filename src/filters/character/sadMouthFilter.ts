import { sampleBilinear } from './faceFilterBase';

/**
 * Sad-mouth pixel filter — pulls only the MOUTH CORNERS downward into a frown.
 *
 * The downward displacement is proportional to the horizontal distance from the
 * mouth centre: it is 0 in the middle of the mouth and greatest at the corners,
 * so the centre of the lips stays put while the corners droop. The effect is
 * confined to a thin elliptical band around the lip line so the cheeks and chin
 * are left untouched.
 *
 * @param cx,cy   mouth centre
 * @param halfW   half the mouth width (corners sit at ±halfW)
 * @param bandH   vertical half-height of the affected lip band (px)
 * @param maxDrop maximum downward displacement at the corners (px)
 */
export function pxSadMouth(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  cx: number,
  cy: number,
  halfW: number,
  bandH: number,
  maxDrop: number,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const x0 = Math.max(0, (cx - halfW) | 0);
  const x1 = Math.min(W, (cx + halfW + 1) | 0);
  const y0 = Math.max(0, (cy - bandH - maxDrop) | 0);
  const y1 = Math.min(H, (cy + bandH + 1) | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const nx = (x - cx) / halfW;          // −1 … +1 across the mouth
      const ny = (y - cy) / bandH;          // −1 … +1 across the lip band
      if (nx * nx + ny * ny >= 1) continue; // outside the lip ellipse

      // Horizontal weight: 0 at the centre, 1 at the corners → only corners drop.
      // Steep power keeps the effect tightly focused on the very corners.
      const nx2 = nx * nx;
      const hw = nx2 * nx2 * nx2;          // nx^6 → almost nothing until near the corners
      // Vertical weight: full across the band, tapering smoothly to 0 at top/bottom.
      const vw = 1 - ny * ny;
      const drop = maxDrop * hw * vw;
      if (drop <= 0) continue;

      // Sample from FURTHER UP so the corner content moves down → a frown.
      const sy = y - drop;

      const [r, g, b, a] = sampleBilinear(data, W, H, x, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}
