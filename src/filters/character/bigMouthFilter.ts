import { radialWarp } from './faceFilterBase';

/**
 * Big Mouth pixel filter — magnifies the mouth region with a radial warp so the
 * mouth becomes much larger than the rest of the head. Call on the ImageData
 * before drawing overlays.
 */
export function pxBigMouth(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  cx: number,
  cy: number,
  radius: number,
  scale = 2.2,
): ImageData {
  const out = new ImageData(W, H);
  out.data.set(data);
  radialWarp(data, out.data, W, H, cx, cy, radius, scale);
  return out;
}
