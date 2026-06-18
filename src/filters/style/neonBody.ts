import type { DrawCtx } from '../DrawCtx';
import { getPersonMask } from '../../lib/personMask';
import { drawNeonFeatures } from './index';

// ════════════════════════════════════════════════════════════════════════
//  Neon Krop — pure black backdrop with the person's OUTLINE (head, shoulders,
//  arms, …) plus the facial features (eyes, nose, mouth) traced in sharp neon.
//  No face oval, no fills.
//
//  To get lines as crisp as the Neon Mørk face contour, the silhouette is not
//  filled: it is converted into an actual vector PATH via marching squares
//  (sub-pixel interpolated on the soft matte) and STROKED with the same
//  two-pass glow + thin line as the face landmarks.
//
//  The mask is in un-mirrored video space, so it is flipped (scale(-1,1)) to
//  match the mirrored on-screen canvas.
// ════════════════════════════════════════════════════════════════════════

let sil: HTMLCanvasElement | null = null;

function sized(c: HTMLCanvasElement | null, W: number, H: number): HTMLCanvasElement {
  if (!c) c = document.createElement('canvas');
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  return c;
}

export function drawNeonBody(d: DrawCtx): void {
  const { ctx, W, H, s, t } = d;
  const mask = getPersonMask();

  if (mask) {
    // Screen-space silhouette alpha matte (flip the un-mirrored mask).
    sil = sized(sil, W, H);
    const sctx = sil.getContext('2d');
    if (!sctx) return;
    sctx.clearRect(0, 0, W, H);
    sctx.save();
    sctx.scale(-1, 1);
    sctx.drawImage(mask, -W, 0, W, H);
    sctx.restore();
    const px = sctx.getImageData(0, 0, W, H).data;

    const T = 128;                                   // iso level
    const step = Math.max(3, Math.round(Math.min(W, H) / 160));
    const a = (x: number, y: number) =>
      px[((Math.min(H - 1, y) * W) + Math.min(W - 1, x)) * 4 + 3];

    // Marching squares → list of line segments tracing the iso-contour.
    const seg: number[] = [];   // x1,y1,x2,y2, …
    const lerp = (p: number, q: number, va: number, vb: number) =>
      vb === va ? p : p + (q - p) * ((T - va) / (vb - va));

    for (let y = 0; y < H - 1; y += step) {
      for (let x = 0; x < W - 1; x += step) {
        const x1 = Math.min(x + step, W - 1), y1 = Math.min(y + step, H - 1);
        const tl = a(x, y), tr = a(x1, y), br = a(x1, y1), bl = a(x, y1);
        const code = (tl > T ? 1 : 0) | (tr > T ? 2 : 0) | (br > T ? 4 : 0) | (bl > T ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const top:    [number, number] = [lerp(x, x1, tl, tr), y];
        const right:  [number, number] = [x1, lerp(y, y1, tr, br)];
        const bottom: [number, number] = [lerp(x, x1, bl, br), y1];
        const left:   [number, number] = [x, lerp(y, y1, tl, bl)];
        const push = (p: [number, number], q: [number, number]) =>
          seg.push(p[0], p[1], q[0], q[1]);
        switch (code) {
          case 1: case 14: push(left, top); break;
          case 2: case 13: push(top, right); break;
          case 3: case 12: push(left, right); break;
          case 4: case 11: push(right, bottom); break;
          case 6: case 9:  push(top, bottom); break;
          case 7: case 8:  push(left, bottom); break;
          case 5:  push(left, top); push(right, bottom); break;
          case 10: push(top, right); push(left, bottom); break;
        }
      }
    }

    // Stroke the contour with the same crisp two-pass glow as the face.
    const hue = (t * 38) % 360;
    ([
      { blur: 18, lw: s * 0.03,  alpha: 0.45 },
      { blur: 6,  lw: s * 0.012, alpha: 0.92 },
    ] as const).forEach(({ blur, lw, alpha }) => {
      ctx.save();
      ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${hue},100%,65%)`;
      ctx.shadowColor = `hsl(${hue},100%,65%)`; ctx.shadowBlur = blur;
      ctx.beginPath();
      for (let i = 0; i < seg.length; i += 4) {
        ctx.moveTo(seg[i], seg[i + 1]);
        ctx.lineTo(seg[i + 2], seg[i + 3]);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  // Facial features (eyes, nose, mouth) — no face oval.
  drawNeonFeatures(d);
}
