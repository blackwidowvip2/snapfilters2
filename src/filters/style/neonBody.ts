import type { DrawCtx } from '../DrawCtx';
import { getPersonMask } from '../../lib/personMask';
import { drawNeonOutline } from './index';

// ════════════════════════════════════════════════════════════════════════
//  Neon Krop — like "Neon Mørk" (pure black backdrop), but the WHOLE person
//  glows. The pixel pass (pxNeon) has already turned the frame into glowing
//  neon edges; here we:
//    1) crop those neon edges to the live person silhouette,
//    2) lay a pure-black backdrop so the background disappears,
//    3) add a soft, hue-shifting neon glow filling the body silhouette,
//    4) trace a CRISP neon rim along the silhouette edge — the same bright
//       two-pass glow used for the face contour, so the body's edges read as
//       sharply as the head's,
//    5) composite the neon-edge body on top, and
//    6) add a crisp neon contour on the face for detail.
//
//  The segmentation mask is in un-mirrored video space, so it is flipped
//  (scale(-1,1)) to match the mirrored on-screen canvas.
// ════════════════════════════════════════════════════════════════════════

let off: HTMLCanvasElement | null = null;
let glow: HTMLCanvasElement | null = null;
let sil: HTMLCanvasElement | null = null;
let rim: HTMLCanvasElement | null = null;

function sized(c: HTMLCanvasElement | null, W: number, H: number): HTMLCanvasElement {
  if (!c) c = document.createElement('canvas');
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  return c;
}

export function drawNeonBody(d: DrawCtx): void {
  const { ctx, W, H, t } = d;
  const mask = getPersonMask();

  // Match the face contour's hue so head and body share one neon colour.
  const hue = (t * 38) % 360;

  if (mask) {
    // 1) Capture the neon-edge frame and crop it to the person silhouette.
    off = sized(off, W, H);
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.clearRect(0, 0, W, H);
    octx.drawImage(ctx.canvas, 0, 0);
    octx.save();
    octx.globalCompositeOperation = 'destination-in';
    octx.scale(-1, 1);
    octx.drawImage(mask, -W, 0, W, H);
    octx.restore();

    // Screen-space silhouette (flip the un-mirrored mask once, then work in
    // normal coords).
    sil = sized(sil, W, H);
    const sctx = sil.getContext('2d');
    if (!sctx) return;
    sctx.clearRect(0, 0, W, H);
    sctx.save();
    sctx.scale(-1, 1);
    sctx.drawImage(mask, -W, 0, W, H);
    sctx.restore();

    // 3a) Colour-tinted silhouette for the soft body glow.
    glow = sized(glow, W, H);
    const gctx = glow.getContext('2d');
    if (!gctx) return;
    gctx.clearRect(0, 0, W, H);
    gctx.drawImage(sil, 0, 0);
    gctx.globalCompositeOperation = 'source-in';
    gctx.fillStyle = `hsl(${hue},100%,55%)`;
    gctx.fillRect(0, 0, W, H);

    // 4a) Crisp rim band along the silhouette edge: silhouette minus an eroded
    //     (centre-shrunk) copy leaves a thin outer band, which we tint bright.
    const k = Math.max(2, Math.round(Math.min(W, H) * 0.012));
    rim = sized(rim, W, H);
    const rctx = rim.getContext('2d');
    if (!rctx) return;
    rctx.clearRect(0, 0, W, H);
    rctx.globalCompositeOperation = 'source-over';
    rctx.drawImage(sil, 0, 0);
    rctx.globalCompositeOperation = 'destination-out';
    rctx.drawImage(sil, k, k, W - 2 * k, H - 2 * k);   // erode, then subtract → rim
    rctx.globalCompositeOperation = 'source-in';
    rctx.fillStyle = `hsl(${hue},100%,68%)`;
    rctx.fillRect(0, 0, W, H);

    // 2) Pure-black backdrop (matching "Neon Mørk").
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // 3b) Soft, glowing neon fill of the body.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45;
    ctx.shadowColor = `hsl(${hue},100%,60%)`;
    ctx.shadowBlur = 28;
    ctx.drawImage(glow, 0, 0);
    ctx.restore();

    // 4b) Bright two-pass rim — soft outer glow, then sharp inner line — so the
    //     body's edge matches the crispness of the face contour.
    ([
      { blur: 18, alpha: 0.5 },
      { blur: 5,  alpha: 0.95 },
    ] as const).forEach(({ blur, alpha }) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.shadowColor = `hsl(${hue},100%,68%)`;
      ctx.shadowBlur = blur;
      ctx.drawImage(rim, 0, 0);
      ctx.restore();
    });

    // 5) Composite the neon-edge body on top.
    ctx.drawImage(off, 0, 0);
  } else {
    // No segmentation yet — fall back to a black backdrop so the look matches.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }

  // 6) Crisp neon contour on the face for detail.
  drawNeonOutline(d);
}
