import { DrawCtx } from '../DrawCtx';

export function drawFox(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const nose   = d.pt(4);
  const lBrow  = d.pt(70);
  const rBrow  = d.pt(300);
  const lCheek = d.pt(234);
  const rCheek = d.pt(454);

  // ── Pointed ears ──────────────────────────────────────
  [{ brow: lBrow, side: -1 }, { brow: rBrow, side: 1 }].forEach(({ brow, side }) => {
    ctx.save();
    ctx.translate(brow.x + side * s * 0.07, brow.y - s * 0.06);
    ctx.rotate(angle + side * 0.13);
    const eg = ctx.createLinearGradient(0, -s*0.4, 0, s*0.08);
    eg.addColorStop(0, '#E55A00'); eg.addColorStop(1, '#C04000');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.moveTo(0, -s*0.4); ctx.lineTo(-side*s*0.22, s*0.08); ctx.lineTo(side*s*0.22, s*0.08);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#903000'; ctx.lineWidth = s*0.012; ctx.stroke();
    // Inner
    ctx.beginPath();
    ctx.moveTo(0, -s*0.27); ctx.lineTo(-side*s*0.1, s*0.04); ctx.lineTo(side*s*0.1, s*0.04);
    ctx.closePath(); ctx.fillStyle = '#FFD0A0'; ctx.fill();
    ctx.restore();
  });

  // ── White cheek patches ───────────────────────────────
  [lCheek, rCheek].forEach((ch, ci) => {
    const g = ctx.createRadialGradient(ch.x, ch.y, 0, ch.x, ch.y, s*0.24);
    g.addColorStop(0, 'rgba(255,248,240,0.9)');
    g.addColorStop(0.5, 'rgba(255,240,220,0.55)');
    g.addColorStop(1, 'transparent');
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(ch.x, ch.y, s*0.24, s*0.14, angle + (ci===0?0.15:-0.15), 0, Math.PI*2);
    ctx.fill(); ctx.restore();
  });

  // ── Replace nose ──────────────────────────────────────
  ctx.save();
  ctx.translate(nose.x, nose.y); ctx.rotate(angle);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.ellipse(0, 0, s*0.13, s*0.1, 0, 0, Math.PI*2);
  ctx.fillStyle = 'black'; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const ng = ctx.createRadialGradient(-s*0.018, -s*0.018, 0, 0, 0, s*0.08);
  ng.addColorStop(0, '#1a0a00'); ng.addColorStop(1, '#0d0500');
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.ellipse(0, 0, s*0.075, s*0.055, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.beginPath(); ctx.ellipse(-s*0.022, -s*0.016, s*0.02, s*0.013, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // ── Whiskers ──────────────────────────────────────────
  [{ side: -1, ox: -s*0.04 }, { side: 1, ox: s*0.04 }].forEach(({ side, ox }) => {
    for (let j = -1; j <= 1; j++) {
      ctx.save();
      ctx.translate(nose.x+ox, nose.y); ctx.rotate(angle + j*0.2*side);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(side*s*0.56, j*s*0.052);
      ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
  });
}
