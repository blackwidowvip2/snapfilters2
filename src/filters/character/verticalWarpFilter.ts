import { sampleBilinear } from './faceFilterBase';

/**
 * Vertical region scale — compress or stretch a band of the face along the Y
 * axis around a fixed `anchorY` line.
 *
 *   • `side = +1` affects the area BELOW the anchor, `-1` the area ABOVE it.
 *   • The band of length `L` (measured from the anchor along `side`) is scaled
 *     by `k`:  k < 1 compresses it, k > 1 stretches it (k = 2 → twice as long).
 *   • Content beyond the band is shifted to stay attached, then smoothly tapered
 *     back to the original over `blend` pixels so there is no seam.
 *   • A horizontal falloff keeps the warp within the face width (`rx`).
 */
export function pxVerticalScale(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  cx: number,
  rx: number,
  anchorY: number,
  side: 1 | -1,
  L: number,
  k: number,
  blend = L,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const x0 = Math.max(0, (cx - rx) | 0);
  const x1 = Math.min(W, (cx + rx + 1) | 0);
  const extra = (1 - k) * L;          // how far the "beyond" region is shifted

  for (let y = 0; y < H; y++) {
    const u = (y - anchorY) * side;   // distance from anchor on the active side
    if (u <= 0) continue;             // other side stays identity

    // Source distance along the column for this output row.
    let src: number;
    if (u <= k * L) {
      src = u / k;                    // inside the scaled band
    } else {
      const beyond = u - k * L;
      const tt = Math.min(1, beyond / blend);
      const fall = 1 - tt * tt * (3 - 2 * tt);  // smoothstep → 0
      src = u + extra * fall;         // shifted, tapering back to identity
    }

    for (let x = x0; x < x1; x++) {
      const nx = (x - cx) / rx;
      if (nx <= -1 || nx >= 1) continue;
      const hfall = 1 - nx * nx;            // 1 centre → 0 at the face edge
      const sdist = u + (src - u) * hfall;  // blend warp → identity sideways
      const sy = anchorY + side * sdist;

      const [r, g, b, a] = sampleBilinear(data, W, H, x, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}
