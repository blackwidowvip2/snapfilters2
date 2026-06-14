// ════════════════════════════════════════════════════════════════════════
//  Person segmentation mask — a shared singleton.
//
//  MediaPipe Selfie Segmentation (see useSelfieSegmentation) writes the latest
//  person mask here every frame; filters read it to crop themselves to the
//  person's actual silhouette (head, hair and body) rather than to a fixed shape.
//
//  The mask is stored in VIDEO pixel space (un-mirrored), exactly as MediaPipe
//  produces it. The on-screen canvas is mirrored, so consumers must flip it
//  horizontally when applying it (scale(-1, 1)).
// ════════════════════════════════════════════════════════════════════════

let maskCanvas: HTMLCanvasElement | null = null;
let hasMask = false;
let lastUpdate = 0;

// The segmentation mask is processed at a small fixed resolution (it's only a
// soft silhouette, so consumers can scale it up smoothly). The matte is stored
// in the ALPHA channel — person opaque, background transparent — so it works
// with `destination-in` regardless of how MediaPipe packs the raw mask.
const MASK_W = 256, MASK_H = 256;

export function setPersonMask(source: CanvasImageSource, _w: number, _h: number): void {
  if (!maskCanvas) {
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = MASK_W; maskCanvas.height = MASK_H;
  }
  const ctx = maskCanvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, MASK_W, MASK_H);
  ctx.drawImage(source, 0, 0, MASK_W, MASK_H);
  // Build an alpha matte from the mask's luminance (person → white → opaque).
  const id = ctx.getImageData(0, 0, MASK_W, MASK_H);
  const px = id.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    // Handle both mask conventions: alpha-matte (rgb white, alpha = person) and
    // luminance-matte (alpha opaque, rgb = white person on black). When alpha is
    // fully opaque it carries no info, so fall back to luminance.
    const matte = a < 255 ? a : Math.max(px[i], px[i + 1], px[i + 2]);
    px[i] = px[i + 1] = px[i + 2] = 255;
    px[i + 3] = matte;
  }
  ctx.putImageData(id, 0, 0);
  hasMask = true;
  lastUpdate = performance.now();
}

/**
 * The shared mask canvas, or null if segmentation isn't ready / has gone stale
 * (e.g. segmentation stopped). Stale masks are ignored so a filter falls back
 * to its geometric crop instead of freezing on an old silhouette.
 */
export function getPersonMask(): HTMLCanvasElement | null {
  if (!hasMask) return null;
  if (performance.now() - lastUpdate > 1000) return null;
  return maskCanvas;
}
