import type { DrawCtx } from '../DrawCtx';
import { getPersonMask } from '../../lib/personMask';

// ════════════════════════════════════════════════════════════════════════
//  Wild Man — a colourful crazy-haired cartoon face stamped over the head,
//  aligned to the real face by the eye line (position, size from inter-ocular
//  distance, rotation from head roll).
//
//  • The artwork is CROPPED to the person's own head/face silhouette (jawline +
//    forehead landmarks), so the crop follows each person's head shape rather
//    than a fixed oval — it is not the same crop from person to person.
//  • The cartoon's irises are replaced PRECISELY by the person's real irises:
//    the live iris is sampled from the video and stamped onto the cartoon's
//    iris position, so the eyes are truly the person's own.
// ════════════════════════════════════════════════════════════════════════

// Where the cartoon's eyes sit in the source artwork, as fractions of the
// image (measured from wild_man.jpg). Used to line the artwork up so its face
// lands on the real face.
const IMG_LEFT_EYE  = { x: 0.402, y: 0.527 };   // viewer-left eye
const IMG_RIGHT_EYE = { x: 0.588, y: 0.525 };   // viewer-right eye

// Iris landmarks from MediaPipe FaceMesh (refineLandmarks: true).
const LEFT_IRIS  = { center: 468, ring: 469 };
const RIGHT_IRIS = { center: 473, ring: 474 };

// Where the cartoon's irises sit relative to the person's irises, so the stamped
// real iris lands on the cartoon's eye: a little further DOWN the face and a
// little further OUT from the centre (fractions of inter-ocular distance).
const HOLE_DOWN = -0.1;
const HOLE_OUT  = 0.07;
// Stamped iris size, as a multiple of the measured iris radius.
const IRIS_PAD = 1.15;
// Magnify the person's eye when stamping it in (and the hole) — 2.0 = 100% bigger.
const EYE_MAG = 2.0;

let img: HTMLImageElement | null = null;
let ready = false;

function ensureImage() {
  if (img) return;
  img = new Image();
  img.onload = () => { ready = true; };
  img.src = `${import.meta.env.BASE_URL}images/wild_man.jpg`;
}

// Reused offscreen canvas so we don't allocate one every frame.
let off: HTMLCanvasElement | null = null;

export function drawWildMan(d: DrawCtx): void {
  ensureImage();
  if (!ready || !img) return;

  const { ctx, W, H } = d;
  const iw = img.naturalWidth, ih = img.naturalHeight;

  // Real face anchors.
  const lEye = d.eyeCenter('left');
  const rEye = d.eyeCenter('right');
  const realMid = { x: (lEye.x + rEye.x) / 2, y: (lEye.y + rEye.y) / 2 };
  const realDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);

  // Artwork eye geometry in pixels.
  const aL = { x: IMG_LEFT_EYE.x * iw,  y: IMG_LEFT_EYE.y * ih };
  const aR = { x: IMG_RIGHT_EYE.x * iw, y: IMG_RIGHT_EYE.y * ih };
  const aMid = { x: (aL.x + aR.x) / 2, y: (aL.y + aR.y) / 2 };
  const aDist = Math.hypot(aR.x - aL.x, aR.y - aL.y) || 1;

  // Eye-aligned scale: the cartoon's eyes sit `realDist` apart, so the cartoon
  // face fits the real face naturally (no artificial enlargement — the crop, not
  // the scale, decides coverage).
  const scale = realDist / aDist;

  // Head-shaped crop (derived from this person's landmarks, so it follows their
  // head shape and varies person to person). Built from chin (152) and forehead
  // (10), extended well above the brow to take in the HAIR, and wide enough to
  // include the ears/side hair.
  const chin = d.pt(152);
  const brow = d.pt(10);
  const cheekL = d.pt(234), cheekR = d.pt(454);
  const faceWidth = Math.hypot(cheekR.x - cheekL.x, cheekR.y - cheekL.y);
  // Generous bound — when the person mask is available it trims this down to the
  // real silhouette, so we make it large enough to never clip the hair.
  const headTop = { x: brow.x + (brow.x - chin.x) * 1.3, y: brow.y + (brow.y - chin.y) * 1.3 };
  const headCtr = { x: (chin.x + headTop.x) / 2, y: (chin.y + headTop.y) / 2 };
  const headRy = (Math.hypot(headTop.x - chin.x, headTop.y - chin.y) / 2) * 1.25;
  const headRx = faceWidth * 1.3;

  // Offscreen canvas matching the frame.
  if (!off) off = document.createElement('canvas');
  if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
  const octx = off.getContext('2d');
  if (!octx) return;
  octx.clearRect(0, 0, W, H);

  // 1) Draw the artwork aligned to the face, bounded by a generous head oval (so
  //    the body is never covered).
  octx.save();
  octx.beginPath();
  octx.ellipse(headCtr.x, headCtr.y, headRx, headRy, d.angle, 0, Math.PI * 2);
  octx.clip();
  octx.translate(realMid.x, realMid.y);
  octx.rotate(d.angle + Math.PI);   // rotated 180°
  octx.scale(scale, scale);
  octx.drawImage(img, -aMid.x, -aMid.y, iw, ih);
  octx.restore();

  // 1b) CROP to the person's real silhouette (head + hair) using the live
  //     segmentation mask, so the crop follows the whole person and varies from
  //     person to person. The mask is in un-mirrored video space, so flip it to
  //     match the mirrored canvas. If segmentation isn't ready the head oval
  //     above is used as-is.
  const mask = getPersonMask();
  if (mask) {
    octx.save();
    octx.globalCompositeOperation = 'destination-in';
    octx.scale(-1, 1);
    octx.drawImage(mask, -W, 0, W, H);
    octx.restore();
  }

  // 2) Replace the cartoon's irises with the PERSON'S real irises: sample each
  //    live iris from the video and stamp it onto the cartoon's iris position
  //    (down + out from the real iris, where the cartoon's eye sits).
  const eyeUx = (rEye.x - lEye.x) / (realDist || 1);   // eye-line unit vector
  const eyeUy = (rEye.y - lEye.y) / (realDist || 1);
  const downX = -eyeUy, downY = eyeUx;                 // perpendicular → down the face
  for (const [iris, sign] of [[LEFT_IRIS, -1], [RIGHT_IRIS, 1]] as const) {
    const c = d.pt(iris.center);
    const r = d.pt(iris.ring);
    // Hole grows with the magnified eye so the bigger iris fits inside it.
    const radius = Math.hypot(r.x - c.x, r.y - c.y) * IRIS_PAD * EYE_MAG;
    // Where the cartoon's iris sits: from the real iris, push down the face and
    // outward (away from centre) along the eye line.
    const hx = c.x + eyeUx * sign * HOLE_OUT * realDist + downX * HOLE_DOWN * realDist;
    const hy = c.y + eyeUy * sign * HOLE_OUT * realDist + downY * HOLE_DOWN * realDist;
    octx.save();
    octx.beginPath();
    octx.ellipse(hx, hy, radius, radius, 0, 0, Math.PI * 2);
    octx.clip();
    // Copy the live canvas, magnified by EYE_MAG around the iris centre, so the
    // person's eye (at c) lands enlarged at the cartoon iris (h).
    octx.translate(hx, hy);
    octx.scale(EYE_MAG, EYE_MAG);
    octx.translate(-c.x, -c.y);
    octx.drawImage(ctx.canvas, 0, 0);
    octx.restore();
  }

  // 3) Composite the cropped artwork (with the real irises) onto the main canvas.
  ctx.drawImage(off, 0, 0);
}
