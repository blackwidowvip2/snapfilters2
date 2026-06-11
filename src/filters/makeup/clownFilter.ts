import { DrawCtx } from '../DrawCtx';
import { drawLipRed } from './lipstickFilter';
import { pxBigMouth } from '../character/index';

/**
 * Clown filter (2D layer).
 *
 *   1. White face paint — the face is painted white but at partial opacity, so
 *      the skin's own features and shading still read through underneath.
 *      Eye and mouth holes are cut so the eyes and lips stay visible.
 *   2. Rosy cheeks + exaggerated red brows.
 *   3. Big red lips — reuses the professional lipstick engine.
 *   4. Big-mouth warp — applied LAST, so the freshly-painted red lips are
 *      magnified together with the mouth into a classic oversized clown grin.
 *
 * The 3D red nose and curly rainbow wig are rendered on the Three.js layer
 * (see filters/props/clown.ts), so this only handles the painted-on parts.
 */

// Face silhouette (jaw + forehead) — same outline DrawCtx.clipToFace uses.
const FACE_OUTLINE = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
const LEFT_EYE  = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const MOUTH_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];

const WHITE_ALPHA = 0.66;   // < 1 so skin texture still shows through the paint

// Cached offscreen layer for the feathered white-paint matte.
let faceCanvas: HTMLCanvasElement | null = null;
let faceCtx: CanvasRenderingContext2D | null = null;
let fcw = 0, fch = 0;

function ensureFaceLayer(W: number, H: number): boolean {
  if (!faceCanvas) {
    faceCanvas = document.createElement('canvas');
    faceCtx = faceCanvas.getContext('2d');
  }
  if (!faceCtx) return false;
  if (fcw !== W || fch !== H) { faceCanvas.width = W; faceCanvas.height = H; fcw = W; fch = H; }
  return true;
}

/** Trace a landmark polygon, optionally scaled about a centre (to enlarge holes). */
function tracePoly(
  ctx: CanvasRenderingContext2D, d: DrawCtx, idx: number[],
  cx = 0, cy = 0, scale = 1,
) {
  ctx.beginPath();
  idx.forEach((id, i) => {
    const p = d.pt(id);
    const x = scale === 1 ? p.x : cx + (p.x - cx) * scale;
    const y = scale === 1 ? p.y : cy + (p.y - cy) * scale;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawWhiteFace(d: DrawCtx) {
  const { ctx, s } = d;
  const W = d.W, H = d.H;
  if (!ensureFaceLayer(W, H)) return;
  const mctx = faceCtx!;
  const fc = d.faceCenter();
  const lEye = d.eyeCenter('left'), rEye = d.eyeCenter('right');

  mctx.clearRect(0, 0, W, H);
  mctx.save();
  mctx.filter = `blur(${Math.max(2, s * 0.03)}px)`;   // soft feathered edge
  mctx.fillStyle = '#fcfcff';
  // Face region, pulled in slightly so the white stops short of the jaw edge.
  tracePoly(mctx, d, FACE_OUTLINE, fc.x, fc.y, 0.97); mctx.fill();
  // Cut holes so eyes and mouth read through the paint.
  mctx.globalCompositeOperation = 'destination-out';
  tracePoly(mctx, d, LEFT_EYE,  lEye.x, lEye.y, 1.7); mctx.fill();
  tracePoly(mctx, d, RIGHT_EYE, rEye.x, rEye.y, 1.7); mctx.fill();
  const mc = d.mouthCenter();
  tracePoly(mctx, d, MOUTH_OUTER, mc.x, mc.y, 1.35); mctx.fill();
  mctx.restore();

  ctx.save();
  ctx.globalAlpha = WHITE_ALPHA;
  ctx.drawImage(faceCanvas!, 0, 0);
  ctx.restore();
}

function drawCheeks(d: DrawCtx) {
  const { ctx, s } = d;
  // Soft pink blush that multiplies into the white paint, so it reads as a
  // natural flush of colour rather than a hard red disc.
  [d.pt(205), d.pt(425)].forEach(ch => {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createRadialGradient(ch.x, ch.y, 0, ch.x, ch.y, s * 0.27);
    g.addColorStop(0,   'rgba(255,142,156,0.55)');
    g.addColorStop(0.5, 'rgba(255,168,180,0.26)');
    g.addColorStop(1,   'rgba(255,180,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(ch.x, ch.y, s * 0.27, s * 0.21, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

/** Stroke a landmark polygon (optionally scaled about a centre) on the main canvas. */
function strokePoly(
  d: DrawCtx, idx: number[], cx: number, cy: number, scale: number,
  color: string, width: number,
) {
  const { ctx } = d;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  tracePoly(ctx, d, idx, cx, cy, scale);
  ctx.stroke();
  ctx.restore();
}

/** Black almond outlines (with an outer flick) around each eye — clown eyeliner. */
function drawEyeContours(d: DrawCtx) {
  const { ctx, s } = d;
  const eyes = [
    { o: 33,  i: 133, up: 159, lo: 145 },
    { o: 263, i: 362, up: 386, lo: 374 },
  ];
  for (const e of eyes) {
    const o = d.pt(e.o), i = d.pt(e.i), up = d.pt(e.up), lo = d.pt(e.lo);
    const cx = (o.x + i.x) / 2, cy = (o.y + i.y) / 2;
    const P = (p: { x: number; y: number }, sxx: number, syy: number) =>
      ({ x: cx + (p.x - cx) * sxx, y: cy + (p.y - cy) * syy });
    const O = P(o, 1.5, 1.2), I = P(i, 1.5, 1.2), U = P(up, 1.2, 2.0), L = P(lo, 1.2, 2.0);
    const flick = { x: O.x + (O.x - cx) * 0.35, y: O.y - s * 0.06 };
    ctx.save();
    ctx.strokeStyle = '#141414'; ctx.lineWidth = s * 0.018;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(flick.x, flick.y);
    ctx.quadraticCurveTo((flick.x + U.x) / 2, U.y - s * 0.03, U.x, U.y);
    ctx.quadraticCurveTo((U.x + I.x) / 2, U.y, I.x, I.y);
    ctx.quadraticCurveTo((I.x + L.x) / 2, L.y + s * 0.02, L.x, L.y);
    ctx.quadraticCurveTo((L.x + flick.x) / 2, L.y + s * 0.02, flick.x, flick.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBrows(d: DrawCtx) {
  const { s } = d;
  // Exaggerated arched red brows, raised above the real ones.
  d.polyline([70, 63, 105, 66, 107], '#c01020', s * 0.05);
  d.polyline([336, 296, 334, 293, 300], '#c01020', s * 0.05);
}

/** Dark outline traced just outside the painted lips — the classic clown mouth. */
function drawMouthContour(d: DrawCtx) {
  const mc = d.mouthCenter();
  strokePoly(d, MOUTH_OUTER, mc.x, mc.y, 1.12, '#241414', d.s * 0.022);
}

export function drawClown(d: DrawCtx) {
  const { ctx, s } = d;
  const W = d.W, H = d.H;

  drawWhiteFace(d);
  drawCheeks(d);
  drawBrows(d);
  drawEyeContours(d);
  drawLipRed(d);
  drawMouthContour(d);

  // Big-mouth warp last → magnifies the painted lips + mouth into a clown grin.
  try {
    const mc = d.mouthCenter();
    const mL = d.pt(61), mR = d.pt(291);
    const mouthW = Math.hypot(mR.x - mL.x, mR.y - mL.y);
    const radius = Math.max(s * 0.7, mouthW * 1.25);
    const id = ctx.getImageData(0, 0, W, H);
    const warped = pxBigMouth(id.data, W, H, mc.x, mc.y, radius, 2.0);
    ctx.putImageData(warped, 0, 0);
  } catch (_) { /* tainted-canvas guard */ }
}
