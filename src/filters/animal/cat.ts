import { DrawCtx } from '../DrawCtx';

export function drawCat(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const nose   = d.pt(4);
  const lBrow  = d.pt(70);
  const rBrow  = d.pt(300);
  const lCheek = d.pt(234);
  const rCheek = d.pt(454);

  // ── Ears ──────────────────────────────────────────────
  [{ brow: lBrow, side: -1 }, { brow: rBrow, side: 1 }].forEach(({ brow, side }) => {
    ctx.save();
    ctx.translate(brow.x + side * s * 0.05, brow.y - s * 0.08);
    ctx.rotate(angle + side * 0.1);
    // Outer
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.36); ctx.lineTo(-side * s * 0.2, s * 0.07); ctx.lineTo(side * s * 0.2, s * 0.07);
    ctx.closePath(); ctx.fillStyle = '#C0A0C0'; ctx.fill();
    ctx.strokeStyle = '#907090'; ctx.lineWidth = s * 0.014; ctx.stroke();
    // Inner
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.24); ctx.lineTo(-side * s * 0.1, s * 0.03); ctx.lineTo(side * s * 0.1, s * 0.03);
    ctx.closePath();
    const ig = ctx.createLinearGradient(0, -s * 0.24, 0, s * 0.03);
    ig.addColorStop(0, '#FF90C0'); ig.addColorStop(1, '#FFB6D9');
    ctx.fillStyle = ig; ctx.fill();
    ctx.restore();
  });

  // ── Replace nose ──────────────────────────────────────
  ctx.save();
  ctx.translate(nose.x, nose.y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.14, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'black'; ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Triangle cat nose
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.042); ctx.lineTo(-s * 0.058, s * 0.032); ctx.lineTo(s * 0.058, s * 0.032);
  ctx.closePath();
  const ng = ctx.createLinearGradient(0, -s * 0.042, 0, s * 0.032);
  ng.addColorStop(0, '#FF8EC0'); ng.addColorStop(1, '#FF5599');
  ctx.fillStyle = ng; ctx.fill();
  ctx.restore();

  // ── Slit pupils ───────────────────────────────────────
  (['left', 'right'] as const).forEach(side => {
    const eye = d.eyeCenter(side);
    ctx.save();
    ctx.translate(eye.x, eye.y); ctx.rotate(angle);
    // Erase original eye area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.08, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'black'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // White sclera
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.08, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e8e0d0'; ctx.fill();
    // Iris
    const ig = ctx.createRadialGradient(-s*0.01,-s*0.01,0,0,0,s*0.072);
    ig.addColorStop(0, '#7AE87A'); ig.addColorStop(1, '#2A7A2A');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.072, s * 0.072, 0, 0, Math.PI * 2); ctx.fill();
    // Vertical slit pupil
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.022, s * 0.092, 0, 0, Math.PI * 2); ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.beginPath(); ctx.ellipse(-s*0.022, -s*0.026, s*0.014, s*0.01, -0.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });

  // ── Whiskers ──────────────────────────────────────────
  [{ side: -1, ox: -s * 0.04 }, { side: 1, ox: s * 0.04 }].forEach(({ side, ox }) => {
    for (let j = -1; j <= 1; j++) {
      ctx.save();
      ctx.translate(nose.x + ox, nose.y);
      ctx.rotate(angle + j * 0.2 * side);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * s * 0.56, j * s * 0.055);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
  });

  // ── Blush ─────────────────────────────────────────────
  [lCheek, rCheek].forEach(ch => {
    const g = ctx.createRadialGradient(ch.x, ch.y, 0, ch.x, ch.y, s * 0.15);
    g.addColorStop(0, 'rgba(255,140,160,0.4)'); g.addColorStop(1, 'transparent');
    ctx.save(); ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(ch.x, ch.y, s * 0.15, s * 0.08, angle, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();
  });
}
