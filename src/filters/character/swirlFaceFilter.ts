import { sampleBilinear } from './faceFilterBase';

/**
 * Swirl Face pixel filter — rotates pixels in a circular region around
 * the face centre, strongest at the middle and fading to zero at the edge.
 */
export function pxSwirlFace(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  faceCX: number,
  faceCY: number,
  radius: number,
  maxAngle = 1.8,    // radians, positive = clockwise
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);

  const x0 = Math.max(0, faceCX - radius | 0);
  const x1 = Math.min(W, faceCX + radius + 1 | 0);
  const y0 = Math.max(0, faceCY - radius | 0);
  const y1 = Math.min(H, faceCY + radius + 1 | 0);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - faceCX;
      const dy = y - faceCY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius) continue;

      // Swirl angle: strongest at centre, 0 at edge
      const t   = (radius - dist) / radius;
      const rot = maxAngle * t * t;

      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const sx  = faceCX + dx * cos - dy * sin;
      const sy  = faceCY + dx * sin + dy * cos;

      const [r, g, b, a] = sampleBilinear(data, W, H, sx, sy);
      const di = (y * W + x) * 4;
      out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = a;
    }
  }
  return out;
}
