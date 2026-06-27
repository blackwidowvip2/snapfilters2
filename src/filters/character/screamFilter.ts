import type { DrawCtx } from '../DrawCtx';

// ════════════════════════════════════════════════════════════════════════
//  Scream — the iconic Ghostface mask (Scream_mask.png) laid over the face,
//  aligned to the real face by the eye line: position from the eye midpoint,
//  size from the inter-ocular distance, rotation from head roll. It is an
//  opaque mask (the PNG's transparent background means only the mask + hood
//  draw), so the eyes sit behind the mask's dark eye holes like the real prop.
// ════════════════════════════════════════════════════════════════════════

// Where the mask's eye holes sit, as fractions of Scream_mask.png (measured) —
// used only as the size reference (their distance sets the mask scale).
const IMG_LEFT_EYE  = { x: 0.367, y: 0.175 };   // viewer-left eye hole
const IMG_RIGHT_EYE = { x: 0.623, y: 0.166 };   // viewer-right eye hole
// The mask's nose (nostril shape), as a fraction — the anchor point that is
// pinned to the person's nose tip.
const IMG_NOSE = { x: 0.502, y: 0.328 };

// Scale the mask relative to bare eye-distance alignment.
const SCALE = 0.82;
// Shift the mask up, as a fraction of the inter-ocular distance.
const OFFSET_UP = 0.8;

let img: HTMLImageElement | null = null;
let ready = false;

function ensureImage() {
  if (img) return;
  img = new Image();
  img.onload = () => { ready = true; };
  img.src = `${import.meta.env.BASE_URL}images/Scream_mask.png`;
}

export function drawScream(d: DrawCtx): void {
  ensureImage();
  if (!ready || !img) return;

  const { ctx } = d;
  const iw = img.naturalWidth, ih = img.naturalHeight;

  // Real face anchor: the person's nose tip.
  const nose = d.pt(1);
  const lEye = d.eyeCenter('left');
  const rEye = d.eyeCenter('right');
  const realDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);

  // Mask eye geometry in pixels — size + rotation reference only.
  const aL = { x: IMG_LEFT_EYE.x * iw,  y: IMG_LEFT_EYE.y * ih };
  const aR = { x: IMG_RIGHT_EYE.x * iw, y: IMG_RIGHT_EYE.y * ih };
  const aDist = Math.hypot(aR.x - aL.x, aR.y - aL.y) || 1;
  // Mask nose anchor in pixels — pinned to the person's nose tip.
  const aNose = { x: IMG_NOSE.x * iw, y: IMG_NOSE.y * ih };

  const scale = (realDist / aDist) * SCALE;

  ctx.save();
  // Pin the mask's nose to the real nose, shifted up a little.
  ctx.translate(nose.x, nose.y - realDist * OFFSET_UP);
  ctx.rotate(d.angle + Math.PI);         // upright mask, flipped 180°, follows head roll
  ctx.scale(scale, scale);
  ctx.drawImage(img, -aNose.x, -aNose.y, iw, ih);
  ctx.restore();
}
