import { radialWarp } from './faceFilterBase';

/**
 * Big Eyes pixel filter — magnifies the eye regions using a radial warp.
 * Call this on the ImageData BEFORE drawing overlays.
 */
export function pxBigEyes(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  eyeCenters: Array<{ x: number; y: number }>,
  radius: number,
  scale = 1.38,
): ImageData {
  const out = new ImageData(W, H);
  // Copy original first
  out.data.set(data);

  for (const eye of eyeCenters) {
    radialWarp(data, out.data, W, H, eye.x, eye.y, radius, scale);
  }
  return out;
}
