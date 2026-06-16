import type { DrawCtx } from '../DrawCtx';

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
  /** Horizontally mirror each stamp (use for a symmetric flag; off for a logo). */
  mirror?: boolean;
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

// Draw the image in vertical strips with a slight arch so it bulges convexly
// over the cheek. `dir` flips the arch so the two cheeks mirror each other.
function drawArched(pctx: CanvasRenderingContext2D, image: HTMLImageElement, w: number, h: number, dir: 1 | -1) {
  const iw = image.naturalWidth, ih = image.naturalHeight;
  const N = 22;
  const sw = w / N;
  const bulge = h * 0.03 * dir;   // very subtle — avoids a forward-leaning look
  for (let i = 0; i < N; i++) {
    const tt = i / (N - 1);
    const dy = -bulge * Math.sin(tt * Math.PI);
    const sqz = 1 - 0.12 * Math.sin(tt * Math.PI);   // always compress (symmetric)
    pctx.drawImage(
      image,
      (i * iw) / N, 0, iw / N, ih,
      -w / 2 + i * sw, -h / 2 + dy, sw + 0.6, h * sqz,
    );
  }
}

export function paintOnCheeks(d: DrawCtx, image: HTMLImageElement, opts: CheekPaintOptions = {}): void {
  const { ctx, W, H, angle } = d;
  const mirror = opts.mirror ?? false;
  const tilt = opts.tilt ?? 0.26;
  const inward = opts.inward ?? 0.15;
  const heightScale = opts.heightScale ?? 0.5;
  const opacity = opts.opacity ?? 0.75;

  const aspect = image.naturalWidth / image.naturalHeight || 1;
  const h = d.s * heightScale;
  const w = h * aspect;
  const fc = d.faceCenter();

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

  // 1) Draw the image onto the paint layer (tilted, arched, optionally mirrored).
  for (const c of cheeks) {
    const side = c.idx === CHEEK_LEFT ? -1 : 1;
    pctx.save();
    pctx.translate(c.x, c.y);
    pctx.rotate(angle + Math.PI);
    pctx.rotate(side * tilt);
    if (mirror) { pctx.scale(-1, 1); if (c.idx === CHEEK_LEFT) pctx.rotate(Math.PI); }
    // Only flip the arch when the image is mirrored (Danmark): the mirror already
    // reverses the local frame, so the flip keeps the two cheeks symmetric. For an
    // un-mirrored logo (AGF) both cheeks use the same arch so they match.
    const arch: 1 | -1 = (mirror && c.idx === CHEEK_RIGHT) ? -1 : 1;
    drawArched(pctx, image, w, h, arch);
    pctx.restore();
  }

  // 2) Feathered coverage mask: soft radial ellipse per cheek ∩ the image shape.
  for (const c of cheeks) {
    const rx = w * 0.62, ry = h * 0.62;
    const g = sctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(rx, ry));
    g.addColorStop(0.0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,1)');
    g.addColorStop(1.0, 'rgba(0,0,0,0)');
    sctx.save();
    sctx.translate(c.x, c.y); sctx.rotate(angle + Math.PI);
    sctx.scale(1, ry / Math.max(rx, ry));
    sctx.translate(-c.x, -c.y);
    sctx.fillStyle = g;
    sctx.beginPath(); sctx.arc(c.x, c.y, Math.max(rx, ry), 0, Math.PI * 2); sctx.fill();
    sctx.restore();
  }
  sctx.globalCompositeOperation = 'destination-in';
  sctx.drawImage(paintCv, 0, 0);
  sctx.globalCompositeOperation = 'source-over';

  // 3) Lifted luminance of the live skin, masked to the paint shape.
  lctx.save();
  lctx.filter = 'grayscale(1) contrast(0.9)';
  lctx.drawImage(ctx.canvas, 0, 0);
  lctx.filter = 'none';
  lctx.fillStyle = 'rgba(255,255,255,0.45)';
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
  d.clipToFace(1.18);
  ctx.globalAlpha = opacity;
  ctx.drawImage(paintCv, 0, 0);
  ctx.restore();
}
