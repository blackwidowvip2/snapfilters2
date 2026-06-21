// ════════════════════════════════════════════════════════════════════════
//  Man Utd — the Manchester United crest as a BACKGROUND behind the person.
//
//  A background has to sit BEHIND the person, but the person lives in the 2D
//  canvas, so we composite here in the 2D pipeline:
//
//    1. snapshot the current frame (mirrored video) and cut out the person with
//       the selfie-segmentation mask  → a transparent-background person layer;
//    2. paint the themed backdrop (club red) + the crest (a 2D SVG image);
//    3. draw the person layer back on top → person in front, crest behind.
//
//  Until segmentation is ready the person layer is the full frame, so the filter
//  degrades to plain video rather than drawing the crest over the person.
// ════════════════════════════════════════════════════════════════════════
import { getPersonMask } from '../../lib/personMask';

// NB: the supplied "…logo.svg" was actually a PNG (wrong extension), which the
// browser refused to decode when served as image/svg+xml — renamed to .png.
const MAN_UTD_URL = `${import.meta.env.BASE_URL}models/Manchester_United_logo.png`;
const AGF_URL = `${import.meta.env.BASE_URL}images/agf_fan.png`;
const RED = '#DA291C';   // Manchester United red

// A crest image with a `ready` latch so we never draw a half-loaded image.
type Logo = { img: HTMLImageElement; ready: boolean };
function loadLogo(url: string, tag: string): Logo {
  const img = new Image();
  const logo: Logo = { img, ready: false };
  img.onload = () => { logo.ready = true; };
  img.onerror = () => console.warn(`[man_utd] ${tag} logo failed to load`);
  img.src = url;
  return logo;
}

let manUtd: Logo | null = null;   // drawn on the RIGHT of the person
let agf: Logo | null = null;      // drawn on the LEFT of the person
function ensureLogos() {
  if (!manUtd) manUtd = loadLogo(MAN_UTD_URL, 'Man Utd');
  if (!agf) agf = loadLogo(AGF_URL, 'AGF');
}

// Draw a loaded crest fitted into a centred box at (cx, cy), preserving aspect.
function drawLogo(ctx: CanvasRenderingContext2D, logo: Logo | null, cx: number, cy: number, box: number) {
  if (!logo || !logo.ready) return;
  const ar = (logo.img.naturalWidth || 1) / (logo.img.naturalHeight || 1);
  const w = ar >= 1 ? box : box * ar;
  const h = ar >= 1 ? box / ar : box;
  ctx.drawImage(logo.img, cx - w / 2, cy - h / 2, w, h);
}

// Reused offscreen canvas for the cut-out person layer.
let personCanvas: HTMLCanvasElement | null = null;
function sized(c: HTMLCanvasElement | null, W: number, H: number): HTMLCanvasElement {
  if (!c) c = document.createElement('canvas');
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  return c;
}

export function drawManUtdBackground(ctx: CanvasRenderingContext2D, W: number, H: number, _t: number): void {
  ensureLogos();
  const src = ctx.canvas;

  // 1) Person layer: copy the current frame, then keep only the person via the
  //    segmentation mask. The mask is in un-mirrored video space, so flip it to
  //    match the mirrored on-screen frame. No mask yet → keep the whole frame.
  personCanvas = sized(personCanvas, W, H);
  const pctx = personCanvas.getContext('2d');
  if (!pctx) return;
  pctx.clearRect(0, 0, W, H);
  pctx.globalCompositeOperation = 'source-over';
  pctx.drawImage(src, 0, 0);
  const mask = getPersonMask();
  if (mask) {
    pctx.globalCompositeOperation = 'destination-in';
    pctx.save(); pctx.scale(-1, 1); pctx.drawImage(mask, -W, 0, W, H); pctx.restore();
    pctx.globalCompositeOperation = 'source-over';
  }

  // 2) Backdrop: a soft radial red so the crest reads against depth.
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.7);
  g.addColorStop(0, '#e7402f');
  g.addColorStop(0.55, RED);
  g.addColorStop(1, '#8f1810');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 3) The two crests, flanking the person: AGF on the LEFT, Man Utd on the
  //    RIGHT. Centred at the quarter columns so they sit beside the (central)
  //    person rather than behind them.
  const box = Math.min(W, H) * 0.42;
  const cy = H * 0.42;
  // The AGF crest image has ~25% transparent padding (its opaque badge fills only
  // ~0.78 of the canvas height vs ~0.98 for the Man Utd logo), so it is scaled up
  // ~1.3× to make the two VISIBLE crests the same size.
  drawLogo(ctx, agf, W * 0.22, cy, box * 1.3);   // left of the person
  drawLogo(ctx, manUtd, W * 0.78, cy, box);      // right of the person

  // 4) Person back on top → person in front, crest behind.
  ctx.drawImage(personCanvas, 0, 0);
}
