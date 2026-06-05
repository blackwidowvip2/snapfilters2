import { sampleBilinear } from './faceFilterBase';

/**
 * Slim Face pixel filter — horizontally contracts the face region
 * toward the centre, giving a slimmer look.
 */
export function pxSlimFace(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  faceCX: number,
  faceCY: number,
  faceRX: number,
  faceRY: number,
  strength = 0.22,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const x0 = Math.max(0, faceCX - faceRX | 0);
  const x1 = Math.min(W, faceCX + faceRX + 1 | 0);
  const y0 = Math.max(0, faceCY - faceRY | 0);
  const y1 = Math.min(H, faceCY + faceRY + 1 | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const nx = (x - faceCX) / faceRX;
      const ny = (y - faceCY) / faceRY;
      const r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;

      // Smooth falloff at edges
      const t   = 1 - r2;
      const warp = strength * t * t;

      // Pull x toward the centre
      const sx = x - (x - faceCX) * warp;
      const sy = y;

      const [r, g, b, a] = sampleBilinear(data, W, H, sx, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}
