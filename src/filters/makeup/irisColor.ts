import type { DrawCtx } from '../DrawCtx';

// ════════════════════════════════════════════════════════════════════════
//  Iris-farve — colours the person's irises and cycles smoothly through the
//  full hue spectrum over a fixed time frame. The recolour uses the canvas
//  'color' blend mode so the natural shading, highlight and pupil of the eye
//  show through — only the hue is replaced, giving a believable eye-colour
//  change rather than a flat disc.
//
//  Iris landmarks (MediaPipe FaceMesh, refineLandmarks: true):
//    left  eye: centre 468, ring 469–472
//    right eye: centre 473, ring 474–477
//  The eye-opening landmarks clip the colour so it never bleeds onto the lids.
// ════════════════════════════════════════════════════════════════════════

const CYCLE_SECONDS = 8;   // time for one full trip around the colour wheel

const IRIS = [
  { center: 468, ring: [469, 470, 471, 472] },
  { center: 473, ring: [474, 475, 476, 477] },
] as const;

// Eye-opening outlines (upper + lower lids) used to clip the colour to the
// visible part of the eye.
const EYE_OPENINGS: number[][] = [
  [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
  [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249],
];

export function drawIrisColor(d: DrawCtx): void {
  const { ctx, t } = d;

  // Hue marches steadily through the full 360° over CYCLE_SECONDS, each eye
  // slightly offset so they shimmer rather than lock in unison.
  const baseHue = ((t / CYCLE_SECONDS) * 360) % 360;

  IRIS.forEach((iris, ei) => {
    const c = d.pt(iris.center);
    if (!c.x && !c.y) return;   // iris landmark missing this frame

    // Iris radius = mean distance from centre to the four ring points.
    let r = 0;
    iris.ring.forEach(idx => {
      const p = d.pt(idx);
      r += Math.hypot(p.x - c.x, p.y - c.y);
    });
    r = (r / iris.ring.length) * 0.92;   // stay just inside the iris rim
    if (r < 1) return;

    const hue = (baseHue + ei * 25) % 360;

    ctx.save();

    // Clip to the eye opening so the colour stays inside the visible eyeball.
    const opening = EYE_OPENINGS[ei];
    ctx.beginPath();
    opening.forEach((idx, i) => {
      const p = d.pt(idx);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.clip();

    // 'color' blend: keep the eye's luminance (shading, highlight, pupil),
    // replace only its hue/saturation → a natural-looking iris recolour.
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.55;   // subtle tint rather than a solid fill

    // Fade the colour out toward the rim so it blends into the iris edge
    // instead of leaving a hard ring that spills past it.
    const g = ctx.createRadialGradient(c.x, c.y, r * 0.18, c.x, c.y, r);
    g.addColorStop(0, `hsla(${hue},80%,52%,0.9)`);
    g.addColorStop(0.65, `hsla(${hue},85%,48%,0.7)`);
    g.addColorStop(1, `hsla(${(hue + 20) % 360},80%,45%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}
