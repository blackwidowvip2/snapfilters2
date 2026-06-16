import type { DrawCtx } from '../DrawCtx';
import { getPersonMask } from '../../lib/personMask';

// ════════════════════════════════════════════════════════════════════════
//  Shared "face paint on the cheeks" renderer used by the Danmark and AGF fans.
//
//  An image is built up on offscreen canvases so it reads as real face paint:
//   • partial opacity over the skin;
//   • the colour MULTIPLIED by the camera luminance (lifted greyscale of the
//     underlying skin), so the cheek's own light & shadow shape the paint;
//   • a soft radial alpha feather (Gaussian-like) — no hard edges;
//   • a fine noise layer (skin texture / paint roughness) via soft-light;
//   • a diagonal highlight (cheap normal-map/specular cue);
//   • a subtle convex deformation (arched strips), opposite on each cheek;
//   • clipped to the cheeks ∩ the face oval, so it only paints the cheeks.
// ════════════════════════════════════════════════════════════════════════

// Cheek "apple" landmarks (MediaPipe FaceMesh).
const CHEEK_LEFT = 50;
const CHEEK_RIGHT = 280;

export interface CheekPaintOptions {
  /** Horizontally mirror the stamp on this cheek (for a symmetric flag). */
  flipCheek?: 'left' | 'right' | 'none';
  /** Direction of the vertical bow/convexity (1 = default, -1 = opposite way). */
  bowDir?: 1 | -1;
  /** Outward tilt so the image follows the cheek (radians). */
  tilt?: number;
  /** Nudge toward the face centre (0 = on the cheekbone, 1 = on the nose). */
  inward?: number;
  /** Image height as a multiple of the inter-ocular distance. */
  heightScale?: number;
  /** Final opacity over the skin. */
  opacity?: number;
}

// ── Reusable offscreen canvases (allocated once, shared across both fans) ──
let paintCv: HTMLCanvasElement | null = null;
let shapeCv: HTMLCanvasElement | null = null;
let lumCv: HTMLCanvasElement | null = null;
let noiseCv: HTMLCanvasElement | null = null;

function getCv(cur: HTMLCanvasElement | null, W: number, H: number): HTMLCanvasElement {
  const cv = cur ?? document.createElement('canvas');
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  return cv;
}

function ensureNoise(): HTMLCanvasElement {
  if (noiseCv) return noiseCv;
  const N = 128;
  noiseCv = document.createElement('canvas');
  noiseCv.width = N; noiseCv.height = N;
  const nctx = noiseCv.getContext('2d')!;
  const id = nctx.createImageData(N, N);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 90;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  nctx.putImageData(id, 0, 0);
  return noiseCv;
}

// Draw one textured triangle: map the image's source triangle (s*) onto the
// destination triangle (d*) with an affine transform, clipped to the triangle.
function texTri(
  pctx: CanvasRenderingContext2D, image: HTMLImageElement,
  sx0: number, sy0: number, sx1: number, sy1: number, sx2: number, sy2: number,
  dx0: number, dy0: number, dx1: number, dy1: number, dx2: number, dy2: number,
) {
  const d1 = sx1 - sx0, d2 = sx2 - sx0, e1 = sy1 - sy0, e2 = sy2 - sy0;
  const det = d1 * e2 - d2 * e1;
  if (!det) return;
  const ax = ((dx1 - dx0) * e2 - (dx2 - dx0) * e1) / det;
  const cx = (d1 * (dx2 - dx0) - d2 * (dx1 - dx0)) / det;
  const ex = dx0 - ax * sx0 - cx * sy0;
  const ay = ((dy1 - dy0) * e2 - (dy2 - dy0) * e1) / det;
  const cy = (d1 * (dy2 - dy0) - d2 * (dy1 - dy0)) / det;
  const ey = dy0 - ay * sx0 - cy * sy0;

  pctx.save();
  pctx.beginPath();
  pctx.moveTo(dx0, dy0); pctx.lineTo(dx1, dy1); pctx.lineTo(dx2, dy2); pctx.closePath();
  pctx.clip();
  pctx.setTransform(ax, ay, cx, cy, ex, ey);
  pctx.drawImage(image, 0, 0);
  pctx.setTransform(1, 0, 0, 1, 0, 0);
  pctx.restore();
}

interface Vec { x: number; y: number; }

// Warp the image onto the cheek's own surface patch. The patch is anchored at
// the cheek apple `A` and spans the face-aligned axes `uAxis` (across the cheek)
// and `vAxis` (down the cheek), which are built from face landmarks — so the
// patch automatically rotates, skews and FORESHORTENS exactly as the cheek does
// when the head turns. A cylinder term adds the cheek's left–right roundness and
// a vertical term its convexity, so the paint truly hugs the cheek in 3D.
function drawCheekMesh(
  pctx: CanvasRenderingContext2D, image: HTMLImageElement,
  A: Vec, uAxis: Vec, vAxis: Vec, flipX: boolean, bowDir: number,
) {
  const iw = image.naturalWidth, ih = image.naturalHeight;
  const COLS = 12, ROWS = 10;
  const arc = 1.2;                  // horizontal wrap angle (cheek roundness)
  const halfArc = arc / 2;

  const dx: number[][] = [], dy: number[][] = [];
  for (let j = 0; j <= ROWS; j++) {
    dx[j] = []; dy[j] = [];
    const ny = j / ROWS - 0.5;
    for (let i = 0; i <= COLS; i++) {
      const nx = i / COLS - 0.5;
      const theta = nx * arc;
      // Cylinder across the cheek: edges wrap back, so they compress toward the
      // sides (the [-0.5, 0.5] span maps through sin).
      const cu = (Math.sin(theta) / Math.sin(halfArc)) * 0.5;
      const depth = (Math.cos(theta) - Math.cos(halfArc)) / (1 - Math.cos(halfArc)); // 1 centre → 0 edge
      // Vertical convexity + slight compression toward the wrapped edges.
      const cv = ny * (0.92 + 0.08 * depth) - bowDir * 0.06 * (depth - 0.5) * (1 - 4 * ny * ny);
      dx[j][i] = A.x + cu * uAxis.x + cv * vAxis.x;
      dy[j][i] = A.y + cu * uAxis.y + cv * vAxis.y;
    }
  }

  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const si0 = flipX ? COLS - i : i;
      const si1 = flipX ? COLS - i - 1 : i + 1;
      const sx0 = (si0 / COLS) * iw, sy0 = (j / ROWS) * ih;
      const sx1 = (si1 / COLS) * iw, sy1 = sy0;
      const sx2 = sx0, sy2 = ((j + 1) / ROWS) * ih;
      const sx3 = sx1, sy3 = sy2;
      texTri(pctx, image, sx0, sy0, sx1, sy1, sx2, sy2,
        dx[j][i], dy[j][i], dx[j][i + 1], dy[j][i + 1], dx[j + 1][i], dy[j + 1][i]);
      texTri(pctx, image, sx1, sy1, sx3, sy3, sx2, sy2,
        dx[j][i + 1], dy[j][i + 1], dx[j + 1][i + 1], dy[j + 1][i + 1], dx[j + 1][i], dy[j + 1][i]);
    }
  }
}

export function paintOnCheeks(d: DrawCtx, image: HTMLImageElement, opts: CheekPaintOptions = {}): void {
  const { ctx, W, H } = d;
  const flipCheek = opts.flipCheek ?? 'none';
  const bowDir = opts.bowDir ?? 1;
  const tilt = opts.tilt ?? 0.26;
  const inward = opts.inward ?? 0.15;
  const heightScale = opts.heightScale ?? 0.5;
  const opacity = opts.opacity ?? 0.75;

  const aspect = image.naturalWidth / image.naturalHeight || 1;
  const h = d.s * heightScale;
  const w = h * aspect;
  const fc = d.faceCenter();

  // ── Face-oriented basis with head-turn foreshortening ──────────────────
  // Across-face axis (cheek to cheek) and down-face axis (forehead to chin),
  // taken from landmarks so they rotate & foreshorten with the head. The
  // across-axis shrinks under yaw; the down-axis under pitch — exactly how a
  // real cheek's surface projects, so the paint tracks the turn.
  const cl = d.pt(234), cr = d.pt(454);
  const top = d.pt(10), chin = d.pt(152);
  const rMag = Math.hypot(cr.x - cl.x, cr.y - cl.y) || 1;
  const dMag = Math.hypot(chin.x - top.x, chin.y - top.y) || 1;
  // Across-face axis, forced to point toward screen-right so the (un-mirrored)
  // image's left edge maps to screen-left — otherwise the logo reads mirrored.
  let rvx = cr.x - cl.x, rvy = cr.y - cl.y;
  if (rvx < 0) { rvx = -rvx; rvy = -rvy; }
  const rightHat = { x: rvx / rMag, y: rvy / rMag };
  const downHat = { x: (chin.x - top.x) / dMag, y: (chin.y - top.y) / dMag };
  // Frontal references from the rotation-robust dimensions (a typical face is
  // ~0.78 as wide as tall), so the ratio = how square-on the cheek is.
  const foreX = Math.max(0.25, Math.min(1.15, rMag / (dMag * 0.78)));

  paintCv = getCv(paintCv, W, H);
  shapeCv = getCv(shapeCv, W, H);
  lumCv = getCv(lumCv, W, H);
  const pctx = paintCv.getContext('2d')!;
  const sctx = shapeCv.getContext('2d')!;
  const lctx = lumCv.getContext('2d')!;
  pctx.clearRect(0, 0, W, H);
  sctx.clearRect(0, 0, W, H);
  lctx.clearRect(0, 0, W, H);

  const cheeks = [CHEEK_LEFT, CHEEK_RIGHT].map((idx) => {
    const p = d.pt(idx);
    return { idx, x: p.x + (fc.x - p.x) * inward, y: p.y + (fc.y - p.y) * inward };
  });

  // Base face-aligned axes (before the per-cheek tilt).
  const baseU = { x: rightHat.x * w * foreX, y: rightHat.y * w * foreX };
  const baseV = { x: downHat.x * h, y: downHat.y * h };
  const roll = Math.atan2(rightHat.y, rightHat.x);
  const rot = (v: Vec, a: number): Vec => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

  // 1) Warp the image onto each cheek's own surface patch (face-aligned axes +
  //    foreshortening + an outward tilt so it sits naturally along the cheek).
  for (const c of cheeks) {
    const side = c.idx === CHEEK_LEFT ? -1 : 1;
    const ta = side * tilt;
    const uAxis = rot(baseU, ta);
    const vAxis = rot(baseV, ta);
    const flipX = (flipCheek === 'left' && c.idx === CHEEK_LEFT) || (flipCheek === 'right' && c.idx === CHEEK_RIGHT);
    drawCheekMesh(pctx, image, { x: c.x, y: c.y }, uAxis, vAxis, flipX, bowDir);
  }

  // 2) Feathered coverage mask: soft ellipse per cheek ∩ the image shape, matching
  //    the cheek's roll + tilt + foreshortened width so the feather tracks the warp.
  for (const c of cheeks) {
    const side = c.idx === CHEEK_LEFT ? -1 : 1;
    const rx = w * 0.66 * foreX, ry = h * 0.66;
    const maxR = Math.max(rx, ry);
    const g = sctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, maxR);
    g.addColorStop(0.0, 'rgba(0,0,0,1)');
    g.addColorStop(0.62, 'rgba(0,0,0,1)');
    g.addColorStop(1.0, 'rgba(0,0,0,0)');
    sctx.save();
    sctx.translate(c.x, c.y); sctx.rotate(roll + side * tilt);
    sctx.scale(rx / maxR, ry / maxR);
    sctx.translate(-c.x, -c.y);
    sctx.fillStyle = g;
    sctx.beginPath(); sctx.arc(c.x, c.y, Math.max(rx, ry), 0, Math.PI * 2); sctx.fill();
    sctx.restore();
  }
  sctx.globalCompositeOperation = 'destination-in';
  sctx.drawImage(paintCv, 0, 0);
  // Also confine to the person's real silhouette so the paint can never spill off
  // the face into the background when the head turns. The mask is in un-mirrored
  // video space, so flip it to match the mirrored canvas.
  const mask = getPersonMask();
  if (mask) {
    sctx.scale(-1, 1);
    sctx.drawImage(mask, -W, 0, W, H);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  sctx.globalCompositeOperation = 'source-over';

  // 3) Lifted luminance of the live skin, masked to the paint shape.
  lctx.save();
  lctx.filter = 'grayscale(1) contrast(0.9)';
  lctx.drawImage(ctx.canvas, 0, 0);
  lctx.filter = 'none';
  lctx.fillStyle = 'rgba(255,255,255,0.35)';   // less lift → skin shading shows through more
  lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(shapeCv, 0, 0);
  lctx.restore();

  // 4) Multiply the paint by the skin luminance → reacts to the camera light.
  pctx.globalCompositeOperation = 'multiply';
  pctx.drawImage(lumCv, 0, 0);

  // 5) Skin texture / paint roughness — fine noise via soft-light.
  pctx.globalCompositeOperation = 'soft-light';
  pctx.globalAlpha = 0.5;
  const nz = ensureNoise();
  for (let ty = 0; ty < H; ty += nz.height) {
    for (let tx = 0; tx < W; tx += nz.width) pctx.drawImage(nz, tx, ty);
  }
  pctx.globalAlpha = 1;

  // 6) Diagonal highlight — cheap normal-map/specular cue (light from top-left).
  const hg = pctx.createLinearGradient(0, 0, W, H);
  hg.addColorStop(0, 'rgba(255,255,255,0.22)');
  hg.addColorStop(0.5, 'rgba(255,255,255,0)');
  hg.addColorStop(1, 'rgba(0,0,0,0.16)');
  pctx.globalCompositeOperation = 'overlay';
  pctx.fillStyle = hg;
  pctx.fillRect(0, 0, W, H);

  // 7) Restore the feathered alpha (steps 4–6 filled the whole frame).
  pctx.globalCompositeOperation = 'destination-in';
  pctx.drawImage(shapeCv, 0, 0);
  pctx.globalCompositeOperation = 'source-over';

  // 8) Composite onto the face. The cheek feather already keeps it on the cheek,
  //    so the face clip is only a loose safety bound — kept generous (1.18) so the
  //    paint isn't cut off before the cheek ends when the head turns.
  ctx.save();
  // Generous face clip — the cheek feather already limits the footprint, so this
  // is only a loose safety bound and must NOT cut the paint at the outer cheek.
  d.clipToFace(1.45);
  ctx.globalAlpha = opacity;
  ctx.drawImage(paintCv, 0, 0);
  ctx.restore();
}
