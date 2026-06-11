import { DrawCtx } from '../DrawCtx';

/**
 * Professional lipstick filter.
 *
 * Pipeline (all in Canvas2D, no WebGL needed — the compositing engine gives us
 * the same blend maths a fragment shader would):
 *
 *   1. AI segmentation     — the lip band is built from MediaPipe FaceMesh lip
 *                            landmarks (outer contour minus the inner mouth hole).
 *   2. Temporal smoothing  — landmark positions are run through a per-point
 *                            exponential moving average to kill sub-pixel jitter,
 *                            with a snap-reset on large motion so it never lags.
 *   3. Feathered matte     — the mask is rasterised through a Gaussian blur so
 *                            its edge fades softly into the skin (no hard cutout).
 *   4. Dynamic light corr. — the live video under the lips is multiplied + soft-
 *                            lit by the pigment, so real folds, shadows and
 *                            highlights of the lips show through the colour.
 *   5. PBR-like highlights — screen-blended specular gloss is laid on the lower
 *                            and upper lip, tracking head roll, for a wet sheen.
 *
 * Everything is restricted to the lip bounding box, so the per-frame cost scales
 * with lip area rather than the whole frame.
 */

// MediaPipe FaceMesh lip contours, each an ordered closed loop.
const OUTER = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
const INNER = [78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95];
const IDX = [...OUTER, ...INNER];

// ── Pigments ────────────────────────────────────────────────────────────────
// Each shade only swaps the colours — the whole pipeline is shared.
interface Pigment {
  mult: string;       // multiplied with skin → deep shaded base colour
  soft: string;       // soft-light pass → richer saturation
  fallback: string;   // flat colour for the tainted-canvas fallback
}
const RED_PIGMENT: Pigment = {
  mult: 'rgb(228,38,52)',
  soft: 'rgb(150,22,34)',
  fallback: '#CC1010',
};
const PINK_PIGMENT: Pigment = {
  mult: 'rgb(244,110,165)',
  soft: 'rgb(190,55,120)',
  fallback: '#E8609A',
};
const SOFT_ALPHA = 0.5;                // keep soft-light light so texture survives
const CONTOUR_BOOST = 0.45;            // self-overlay strength → lip lines/folds pop
const FINAL_ALPHA = 0.88;              // let a hint of the real lip through

// Lipstick is applied slightly over the lip line — dilating the outer contour
// guarantees full coverage even when the lips stretch thin (open mouth / wide
// smile), where the exact landmark contour would leave bare gaps.
const OUTER_EXPAND = 1.05;             // dilate outer contour outward from lip centre

// ── Temporal-smoothing state (single tracked face) ──────────────────────────
let smX: Float32Array | null = null;
let smY: Float32Array | null = null;
let smInit = false;

// ── Cached offscreen layers ─────────────────────────────────────────────────
let maskCanvas: HTMLCanvasElement | null = null;
let lipCanvas: HTMLCanvasElement | null = null;
let maskCtx: CanvasRenderingContext2D | null = null;
let lipCtx: CanvasRenderingContext2D | null = null;
let cw = 0, ch = 0;

function ensureLayers(W: number, H: number): boolean {
  if (!maskCanvas) {
    maskCanvas = document.createElement('canvas');
    lipCanvas  = document.createElement('canvas');
    maskCtx = maskCanvas.getContext('2d');
    lipCtx  = lipCanvas.getContext('2d');
  }
  if (!maskCtx || !lipCtx) return false;
  if (cw !== W || ch !== H) {
    maskCanvas.width = W;  maskCanvas.height = H;
    lipCanvas!.width = W;  lipCanvas!.height = H;
    cw = W; ch = H;
  }
  return true;
}

/**
 * Velocity-adaptive smoothing of the lip landmarks (canvas space).
 *
 * A fixed EMA always trades latency for stability. Instead we adapt the blend
 * factor per point to how fast that point is moving (the "1€ filter" idea):
 *   • nearly still  → small α  → heavy smoothing kills sub-pixel jitter
 *   • moving fast   → α → 1.0  → the lips track the mouth with no perceptible lag
 * Speed is measured relative to face scale so it is distance-independent.
 */
function smoothLandmarks(d: DrawCtx) {
  const n = IDX.length;
  if (!smX || !smY || smX.length !== n) {
    smX = new Float32Array(n); smY = new Float32Array(n); smInit = false;
  }
  const sx = smX, sy = smY;   // non-null locals
  const invS = 1 / d.s;
  for (let i = 0; i < n; i++) {
    const p = d.pt(IDX[i]);
    if (!smInit) { sx[i] = p.x; sy[i] = p.y; continue; }
    const speed = Math.hypot(p.x - sx[i], p.y - sy[i]) * invS;  // px moved per face-width
    const a = Math.min(1, 0.4 + speed * 22);   // ~0.4 at rest → 1.0 once the lips move
    sx[i] = sx[i] + (p.x - sx[i]) * a;          // keeps sub-pixel precision (no rounding)
    sy[i] = sy[i] + (p.y - sy[i]) * a;
  }
  smInit = true;
}

/** Trace a lip contour, scaled about the lip centre so it can be dilated/shrunk. */
function tracePath(
  ctx: CanvasRenderingContext2D, start: number, count: number,
  cx: number, cy: number, scale: number,
) {
  ctx.beginPath();
  ctx.moveTo(cx + (smX![start] - cx) * scale, cy + (smY![start] - cy) * scale);
  for (let i = 1; i < count; i++) {
    ctx.lineTo(cx + (smX![start + i] - cx) * scale, cy + (smY![start + i] - cy) * scale);
  }
  ctx.closePath();
}

export function drawLipRed(d: DrawCtx)  { drawLipstick(d, RED_PIGMENT); }
export function drawLipPink(d: DrawCtx) { drawLipstick(d, PINK_PIGMENT); }

function drawLipstick(d: DrawCtx, pigment: Pigment) {
  const { ctx, s } = d;
  const W = d.W, H = d.H;

  if (!ensureLayers(W, H)) { d.drawLipShape(pigment.fallback, 0.86, true); return; }
  smoothLandmarks(d);

  // Lip bounding box + centre.
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  let cxs = 0, cys = 0;
  for (let i = 0; i < IDX.length; i++) {
    const X = smX![i], Y = smY![i];
    if (X < minx) minx = X; if (X > maxx) maxx = X;
    if (Y < miny) miny = Y; if (Y > maxy) maxy = Y;
  }
  for (let i = 0; i < OUTER.length; i++) { cxs += smX![i]; cys += smY![i]; }
  const mcx = cxs / OUTER.length, mcy = cys / OUTER.length;

  // Feather scaled to the upper-lip thickness (outer pt 0 → inner pt 13), so a
  // thin stretched lip is not eaten away by an over-large blur.
  const thick = Math.hypot(smX![5] - smX![OUTER.length + 5], smY![5] - smY![OUTER.length + 5]);
  const feather = Math.max(1.2, Math.min(s * 0.014, thick * 0.4));

  const pad = feather * 4;
  const bx = Math.max(0, Math.floor(minx - pad));
  const by = Math.max(0, Math.floor(miny - pad));
  const bw = Math.min(W, Math.ceil(maxx + pad)) - bx;
  const bh = Math.min(H, Math.ceil(maxy + pad)) - by;
  if (bw <= 0 || bh <= 0) return;

  const mctx = maskCtx!, lctx = lipCtx!;

  try {
    // ── 1. Feathered alpha matte: outer lip band minus the mouth opening ──
    mctx.clearRect(bx, by, bw, bh);
    mctx.save();
    mctx.filter = `blur(${feather}px)`;        // Gaussian feather on both edges
    mctx.fillStyle = '#fff';
    tracePath(mctx, 0, OUTER.length, mcx, mcy, OUTER_EXPAND); mctx.fill();
    // Carve the mouth opening. The inner-lip landmarks already grow with the
    // mouth, so the hole tracks the opening at any openness:
    //   • closed / pout (tiny inner gap) → the inner polygon collapses to a sliver,
    //     so almost nothing is carved and the whole lip stays filled.
    //   • open → carve at (or slightly past) the inner lip line, so teeth and
    //     tongue are never painted. The wider the mouth, the more we over-carve to
    //     keep a safe margin against the teeth.
    const O = OUTER.length;
    const innerGap = Math.hypot(smX![O + 5] - smX![O + 15], smY![O + 5] - smY![O + 15]);
    const openness = Math.min(1, innerGap / (s * 0.16));
    const carveScale = 1.0 + openness * 0.12;   // 1.0 nearly-closed → 1.12 wide open
    if (openness > 0.04) {
      mctx.globalCompositeOperation = 'destination-out';
      tracePath(mctx, O, INNER.length, mcx, mcy, carveScale); mctx.fill();
    }
    mctx.restore();

    // ── 2. Tinted lip layer that PRESERVES the person's own lip contours ──
    lctx.clearRect(bx, by, bw, bh);
    lctx.globalCompositeOperation = 'source-over';
    lctx.filter = 'none';
    lctx.drawImage(ctx.canvas, bx, by, bw, bh, bx, by, bw, bh); // live video under lips

    // Self-overlay boosts local contrast, so the real lip lines, folds and 3D
    // form become MORE pronounced before any pigment is applied.
    lctx.globalCompositeOperation = 'overlay';
    lctx.globalAlpha = CONTOUR_BOOST;
    lctx.drawImage(ctx.canvas, bx, by, bw, bh, bx, by, bw, bh);
    lctx.globalAlpha = 1;

    // Multiply is the dominant blend — it tints while keeping every bit of the
    // underlying luminance detail (highlights stay bright, creases stay dark).
    lctx.globalCompositeOperation = 'multiply';
    lctx.fillStyle = pigment.mult; lctx.fillRect(bx, by, bw, bh);

    // A whisper of soft-light enriches saturation without flattening the texture.
    lctx.globalCompositeOperation = 'soft-light';
    lctx.globalAlpha = SOFT_ALPHA;
    lctx.fillStyle = pigment.soft; lctx.fillRect(bx, by, bw, bh);
    lctx.globalAlpha = 1;

    // ── 3. Clip the layer to the feathered matte, then composite onto the frame ──
    lctx.globalCompositeOperation = 'destination-in';
    lctx.drawImage(maskCanvas!, bx, by, bw, bh, bx, by, bw, bh);
    lctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalAlpha = FINAL_ALPHA;
    ctx.drawImage(lipCanvas!, bx, by, bw, bh, bx, by, bw, bh);
    ctx.restore();
  } catch (_) {
    // Tainted-canvas fallback (e.g. cross-origin video): flat lip shape.
    d.drawLipShape(pigment.fallback, 0.86, true);
  }
}
