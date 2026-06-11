import { DrawCtx } from '../DrawCtx';

export function drawBunny(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const nose   = d.pt(4);
  const lCheek = d.pt(234);
  const rCheek = d.pt(454);

  // NOTE: the ears are no longer drawn here — they are rendered as a real 3D
  // model ("Bunny ears.glb") on the Three.js layer (see filters/props/bunnyEars
  // and useThreeRenderer). This function only paints the nose, whiskers and cheeks.

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
