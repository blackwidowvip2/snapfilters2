import type { DrawCtx } from '../DrawCtx';
import { getPersonMask } from '../../lib/personMask';
import type { LandmarkList } from '../../types';

// All faces detected this frame, set by the render loop before drawing. Used to
// keep each person's artwork on their OWN side of the midline between
// neighbouring heads, so two people standing close together don't overlap.
let allFaces: LandmarkList[] = [];
export function setAssFaces(faces: LandmarkList[]) { allFaces = faces; }

// Eye-line midpoint of a face in mirrored canvas pixels (matches DrawCtx.pt).
function eyeMidOf(lm: LandmarkList, W: number, H: number) {
  const px = (i: number) => ({ x: (1 - lm[i].x) * W, y: lm[i].y * H });
  const l1 = px(33), l2 = px(133), r1 = px(263), r2 = px(362);
  return { x: (l1.x + l2.x + r1.x + r2.x) / 4, y: (l1.y + l2.y + r1.y + r2.y) / 4 };
}

// ════════════════════════════════════════════════════════════════════════
//  Røv — a butt-shaped face (Ass.png) stamped over the head, aligned to the
//  real face by the eye line (position, size from inter-ocular distance,
//  rotation from head roll). Works like the Wild Man filter:
//
//  • The artwork is CROPPED to the person's own head silhouette (person mask +
//    head oval), so it follows each person's head shape and never covers the
//    body.
//  • The two eye holes in the artwork are replaced PRECISELY by the person's
//    real eyes: the live eye is sampled from the video and stamped onto the
//    artwork's eye position, so the eyes are truly the person's own.
// ════════════════════════════════════════════════════════════════════════

// Where the artwork's eyes (pupils) sit, as fractions of Ass.png — measured by
// scanning for the dark pupils while excluding the central seam (which had
// skewed an earlier measurement toward the centre). The artwork's eye line is
// genuinely tilted (~6.5°: right pupil higher than left); the alignment
// transform rotates the whole image so these anchors map onto the real eyes, so
// using the TRUE pupil positions makes the painted sockets sit on the irises.
const IMG_LEFT_EYE  = { x: 0.314, y: 0.522 };   // viewer-left eye
const IMG_RIGHT_EYE = { x: 0.596, y: 0.498 };   // viewer-right eye

// Iris landmarks from MediaPipe FaceMesh (refineLandmarks: true): only the
// person's iris is shown through the artwork's painted eye, so it replaces the
// artwork's iris rather than the whole eye.
const LEFT_IRIS  = { center: 468, ring: 469 };
const RIGHT_IRIS = { center: 473, ring: 474 };

// Iris radius padding so the whole iris is covered.
const IRIS_PAD = 1.1;
// Scale the whole artwork down a touch so the head isn't fully covered.
const SHRINK = 0.85;

let img: HTMLImageElement | null = null;
let ready = false;

function ensureImage() {
  if (img) return;
  img = new Image();
  img.onload = () => { ready = true; };
  img.src = `${import.meta.env.BASE_URL}images/Ass.png`;
}

// Reused offscreen canvas so we don't allocate one every frame.
let off: HTMLCanvasElement | null = null;

export function drawAss(d: DrawCtx): void {
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

  // Eye-aligned scale: the artwork's eyes sit `realDist` apart, so the butt
  // face fits the real face naturally.
  const scale = (realDist / aDist) * SHRINK;

  // Head-shaped crop derived from this person's landmarks, so it follows their
  // head shape. Built from chin (152) and forehead (10), extended above the brow
  // to take in the whole head, and wide enough to include the sides.
  const chin = d.pt(152);
  const brow = d.pt(10);
  const cheekL = d.pt(234), cheekR = d.pt(454);
  const faceWidth = Math.hypot(cheekR.x - cheekL.x, cheekR.y - cheekL.y);
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

  // When several people are in frame, also clip to THIS person's side of the
  // perpendicular bisector between their head and each neighbour, so the artwork
  // never spills onto an adjacent face.
  if (allFaces.length > 1) {
    const mids = allFaces.map((lm) => eyeMidOf(lm, W, H));
    let self = 0, best = Infinity;
    mids.forEach((m, i) => {
      const dd = (m.x - realMid.x) ** 2 + (m.y - realMid.y) ** 2;
      if (dd < best) { best = dd; self = i; }
    });
    const BIG = W + H;
    mids.forEach((m, i) => {
      if (i === self) return;
      let dx = m.x - realMid.x, dy = m.y - realMid.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;                       // unit vector toward neighbour
      const px = (realMid.x + m.x) / 2, py = (realMid.y + m.y) / 2;  // bisector point
      const ex = -dy, ey = dx;                    // along the bisector line
      octx.beginPath();
      octx.moveTo(px + ex * BIG, py + ey * BIG);
      octx.lineTo(px - ex * BIG, py - ey * BIG);
      octx.lineTo(px - ex * BIG - dx * BIG, py - ey * BIG - dy * BIG);
      octx.lineTo(px + ex * BIG - dx * BIG, py + ey * BIG - dy * BIG);
      octx.closePath();
      octx.clip();
    });
  }

  octx.translate(realMid.x, realMid.y);
  octx.rotate(d.angle + Math.PI);   // flipped 180°
  octx.scale(scale, scale);
  octx.drawImage(img, -aMid.x, -aMid.y, iw, ih);
  octx.restore();

  // 1b) CROP to the person's real silhouette using the live segmentation mask,
  //     so the artwork follows the whole head. The mask is in un-mirrored video
  //     space, so flip it to match the mirrored canvas.
  const mask = getPersonMask();
  if (mask) {
    octx.save();
    octx.globalCompositeOperation = 'destination-in';
    octx.scale(-1, 1);
    octx.drawImage(mask, -W, 0, W, H);
    octx.restore();
  }

  // 2) Show only the PERSON'S iris through the artwork's painted eye. The iris is
  //    placed where the artwork's PAINTED pupil actually lands (not at the raw
  //    real-eye position) — the artwork is shrunk and tilted, so its eyes sit
  //    closer together than the real eyes; binding the iris to the painted socket
  //    keeps it dead-centre in the hole regardless of shrink/scale. We map the
  //    artwork eye anchor through the exact same transform used to draw the image,
  //    then sample the person's real iris and translate it onto that spot.
  const cosA = Math.cos(d.angle + Math.PI), sinA = Math.sin(d.angle + Math.PI);
  const paintedPupil = (a: { x: number; y: number }) => ({
    x: realMid.x + scale * ((a.x - aMid.x) * cosA - (a.y - aMid.y) * sinA),
    y: realMid.y + scale * ((a.x - aMid.x) * sinA + (a.y - aMid.y) * cosA),
  });
  for (const [anchor, iris] of [[aL, LEFT_IRIS], [aR, RIGHT_IRIS]] as const) {
    const P = paintedPupil(anchor);            // where the painted pupil sits
    const c = d.pt(iris.center);               // person's real iris centre
    const r = d.pt(iris.ring);
    const radius = Math.hypot(r.x - c.x, r.y - c.y) * IRIS_PAD;
    octx.save();
    octx.beginPath();
    octx.ellipse(P.x, P.y, radius, radius, 0, 0, Math.PI * 2);
    octx.clip();
    // Translate the live video so the real iris (at c) lands on the socket (at P).
    octx.translate(P.x - c.x, P.y - c.y);
    octx.drawImage(ctx.canvas, 0, 0);
    octx.restore();
  }

  // 3) Composite the cropped artwork (with the real eyes) onto the main canvas.
  ctx.drawImage(off, 0, 0);
}
