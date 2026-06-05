import { DrawCtx } from '../DrawCtx';

export function drawBunny(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const nose   = d.pt(4);
  const lCheek = d.pt(234);
  const rCheek = d.pt(454);

  // ── Reference landmarks for vertical placement ────────
  // pt(10)  = top-centre of the forehead (highest face-mesh point)
  // pt(152) = bottom of the chin
  // The distance between them is the full face height; we use it (not `s`,
  // which is only the small inter-ocular distance) to push the ears UP to
  // the very top of the head.
  const foreheadTop = d.pt(10);
  const chin        = d.pt(152);
  const faceHeight  = Math.hypot(chin.x - foreheadTop.x, chin.y - foreheadTop.y);

  // Unit vector pointing "up" along the head (from chin toward forehead),
  // so the ears track head tilt correctly.
  const upX = (foreheadTop.x - chin.x) / faceHeight;
  const upY = (foreheadTop.y - chin.y) / faceHeight;
  // Perpendicular (points to the person's right in image space) for sideways spread.
  const sideX = -upY;
  const sideY =  upX;

  // ── Tall upright ears, planted ON TOP of the head ─────
  // Base of each ear = forehead-top, pushed further up by 0.30 of face height,
  // and spread sideways by ±0.22 of face height.
  [
    { side: -1 as const },
    { side:  1 as const },
  ].forEach(({ side }) => {
    const upOffset   = faceHeight * 0.30;   // above the forehead
    const sideOffset = faceHeight * 0.22 * side;

    const baseX = foreheadTop.x + upX * upOffset + sideX * sideOffset;
    const baseY = foreheadTop.y + upY * upOffset + sideY * sideOffset;

    ctx.save();
    ctx.translate(baseX, baseY);
    // Orient ear along head-up direction, plus a small outward lean.
    ctx.rotate(angle + side * 0.20);

    const earH = faceHeight * 0.62;   // tall ears
    const earW = faceHeight * 0.11;   // half-width

    // Outer ear (white fur)
    const eg = ctx.createLinearGradient(-earW, 0, earW, 0);
    eg.addColorStop(0,   '#EFE2EC');
    eg.addColorStop(0.5, '#FFFFFF');
    eg.addColorStop(1,   '#E2CFDD');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-earW, -earH * 0.18, -earW, -earH * 0.78, 0, -earH);
    ctx.bezierCurveTo( earW, -earH * 0.78,  earW, -earH * 0.18, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#D8BFD3';
    ctx.lineWidth   = Math.max(1, faceHeight * 0.006);
    ctx.stroke();

    // Inner ear (pink)
    const innerH = earH * 0.80;
    const innerW = earW * 0.55;
    const ig = ctx.createLinearGradient(0, -innerH, 0, -earH * 0.08);
    ig.addColorStop(0, '#FFB6D4');
    ig.addColorStop(1, '#FF7AAE');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.moveTo(0, -earH * 0.10);
    ctx.bezierCurveTo(-innerW, -earH * 0.22, -innerW, -innerH * 0.92, 0, -innerH);
    ctx.bezierCurveTo( innerW, -innerH * 0.92,  innerW, -earH * 0.22, 0, -earH * 0.10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  // ── Replace nose (pink bunny nose) ────────────────────
  ctx.save();
  ctx.translate(nose.x, nose.y); ctx.rotate(angle);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.ellipse(0, 0, s*0.12, s*0.1, 0, 0, Math.PI*2);
  ctx.fillStyle = 'black'; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  const ng = ctx.createRadialGradient(-s*0.012, -s*0.018, 0, 0, 0, s*0.085);
  ng.addColorStop(0, '#FF9ECB'); ng.addColorStop(1, '#F25C9A');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(-s*0.075, -s*0.03);
  ctx.bezierCurveTo(-s*0.075, s*0.03, -s*0.03, s*0.055, 0, s*0.075);
  ctx.bezierCurveTo(s*0.03, s*0.055, s*0.075, s*0.03, s*0.075, -s*0.03);
  ctx.bezierCurveTo(s*0.045, -s*0.06, -s*0.045, -s*0.06, -s*0.075, -s*0.03);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(-s*0.022, -s*0.022, s*0.022, s*0.014, -0.4, 0, Math.PI*2); ctx.fill();

  ctx.strokeStyle = 'rgba(220,90,140,0.55)';
  ctx.lineWidth = s*0.014; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, s*0.075); ctx.lineTo(0, s*0.16); ctx.stroke();
  ctx.restore();

  // ── Whiskers ──────────────────────────────────────────
  [{ side: -1, ox: -s*0.04 }, { side: 1, ox: s*0.04 }].forEach(({ side, ox }) => {
    for (let j = -1; j <= 1; j++) {
      ctx.save();
      ctx.translate(nose.x+ox, nose.y); ctx.rotate(angle + j*0.18*side);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(side*s*0.52, j*s*0.046);
      ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
  });

  // ── Rosy cheeks ───────────────────────────────────────
  [lCheek, rCheek].forEach(ch => {
    const g = ctx.createRadialGradient(ch.x, ch.y, 0, ch.x, ch.y, s*0.17);
    g.addColorStop(0, 'rgba(255,120,160,0.44)'); g.addColorStop(1, 'transparent');
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(ch.x, ch.y, s*0.17, s*0.09, angle, 0, Math.PI*2);
    ctx.fill(); ctx.restore();
  });
}
