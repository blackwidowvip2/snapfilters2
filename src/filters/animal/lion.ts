import { DrawCtx } from '../DrawCtx';

export function drawLion(d: DrawCtx) {
  const { ctx, s, angle, t } = d;
  const fh     = d.pt(10);   // top of forehead
  const nose   = d.pt(4);
  const lCheek = d.pt(234);
  const rCheek = d.pt(454);
  const lEye   = d.eyeCenter('left');
  const rEye   = d.eyeCenter('right');

  const faceX   = (lEye.x + rEye.x) / 2;
  const faceY   = (lEye.y + rEye.y) / 2;
  const eyeSpan = Math.abs(rEye.x - lEye.x);

  // ── MANE — drawn first (behind everything) ────────────
  // Rich layered fur matching the golden lion.jpg reference.
  // Three concentric rings of elongated fur strands, animated.
  const maneColorsOuter = ['#C8801A','#E09820','#A86010','#D48818','#B06818','#F0B030'];
  const maneColorsMid   = ['#D49020','#C07010','#E8A828','#B87820','#CC8818','#A05808'];
  const maneColorsInner = ['#E0A028','#C87818','#D88E20','#B06810','#E8B038','#C08828'];

  ctx.save();
  ctx.translate(faceX, faceY);
  ctx.rotate(angle);

  // Outer ring — 28 long strands
  for (let k = 0; k < 28; k++) {
    const ba = (k / 28) * Math.PI * 2;
    const r  = s * (1.22 + Math.sin(t * 1.1 + k * 0.85) * 0.06);
    ctx.fillStyle  = maneColorsOuter[k % maneColorsOuter.length];
    ctx.globalAlpha = 0.88 + Math.sin(t * 1.9 + k) * 0.07;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(ba) * r, Math.sin(ba) * r,
      s * 0.13, s * 0.38,
      ba + Math.PI / 2, 0, Math.PI * 2
    );
    ctx.fill();
  }

  // Middle ring — 22 medium strands
  for (let k = 0; k < 22; k++) {
    const ba = (k / 22) * Math.PI * 2 + 0.14;
    const r  = s * (0.92 + Math.sin(t * 1.3 + k * 1.1) * 0.05);
    ctx.fillStyle  = maneColorsMid[k % maneColorsMid.length];
    ctx.globalAlpha = 0.82 + Math.sin(t * 2.1 + k * 0.8) * 0.09;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(ba) * r, Math.sin(ba) * r,
      s * 0.11, s * 0.30,
      ba + Math.PI / 2, 0, Math.PI * 2
    );
    ctx.fill();
  }

  // Inner ring — 16 short strands, closes the gaps
  for (let k = 0; k < 16; k++) {
    const ba = (k / 16) * Math.PI * 2 + 0.28;
    const r  = s * (0.68 + Math.sin(t * 1.5 + k * 0.9) * 0.04);
    ctx.fillStyle  = maneColorsInner[k % maneColorsInner.length];
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(ba) * r, Math.sin(ba) * r,
      s * 0.10, s * 0.22,
      ba + Math.PI / 2, 0, Math.PI * 2
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  // ── EARS — small, rounded, peeking above the mane ─────
  // Anchored well above the forehead, symmetrically outside
  // the eye positions.
  [
    { eye: lEye, side: -1 as const },
    { eye: rEye, side:  1 as const },
  ].forEach(({ eye, side }) => {
    const earX = eye.x + side * eyeSpan * 0.26;
    const earY = fh.y  - s * 0.52;   // above forehead top
    ctx.save();
    ctx.translate(earX, earY);
    ctx.rotate(angle + side * 0.10);
    // Outer ear
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#C47800';
    ctx.fill();
    // Inner ear
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.085, 0, Math.PI * 2);
    ctx.fillStyle = '#F0C060';
    ctx.fill();
    ctx.restore();
  });

  // ── WHITE MUZZLE AREA ─────────────────────────────────
  // Large cream/white oval that replaces the lower face skin,
  // characteristic of the Snapchat lion look.
  ctx.save();
  ctx.translate(nose.x, nose.y + s * 0.04);
  ctx.rotate(angle);
  const mg = ctx.createRadialGradient(0, s * 0.06, 0, 0, s * 0.12, s * 0.40);
  mg.addColorStop(0,   'rgba(255,254,248,0.96)');
  mg.addColorStop(0.55,'rgba(245,238,222,0.90)');
  mg.addColorStop(0.82,'rgba(228,220,200,0.65)');
  mg.addColorStop(1,   'rgba(210,200,180,0.00)');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.12, s * 0.28, s * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── LION NOSE ─────────────────────────────────────────
  ctx.save();
  ctx.translate(nose.x, nose.y);
  ctx.rotate(angle);

  // Erase human nose
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.20, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'black';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Nose body — wide, warm orange-brown, typical of big cats
  const ng = ctx.createRadialGradient(-s * 0.02, -s * 0.02, 0, 0, 0, s * 0.16);
  ng.addColorStop(0,   '#D87048');
  ng.addColorStop(0.5, '#C05838');
  ng.addColorStop(1,   '#903020');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.01, s * 0.14, s * 0.090, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = 'rgba(55,10,5,0.72)';
  [-1, 1].forEach(sd => {
    ctx.beginPath();
    ctx.ellipse(sd * s * 0.056, s * 0.024, s * 0.038, s * 0.025, sd * 0.28, 0, Math.PI * 2);
    ctx.fill();
  });

  // Highlight
  ctx.fillStyle = 'rgba(255,200,160,0.32)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.034, -s * 0.020, s * 0.044, s * 0.026, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Philtrum line (nose to upper lip)
  ctx.strokeStyle = 'rgba(80,20,10,0.50)';
  ctx.lineWidth   = s * 0.016;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.075);
  ctx.lineTo(0, s * 0.20);
  ctx.stroke();

  ctx.restore();

  // ── CHEEK STRIPES ─────────────────────────────────────
  [lCheek, rCheek].forEach((ch, ci) => {
    const side = ci === 0 ? -1 : 1;
    ctx.save();
    ctx.translate(ch.x, ch.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.32;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(side * (s * 0.055 + k * s * 0.09), -s * 0.09);
      ctx.lineTo(side * (s * 0.075 + k * s * 0.09),  s * 0.09);
      ctx.strokeStyle = '#2a1a06';
      ctx.lineWidth   = s * 0.044;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
    ctx.restore();
  });

  // ── WHISKERS ──────────────────────────────────────────
  [{ side: -1, ox: -s * 0.04 }, { side: 1, ox: s * 0.04 }].forEach(({ side, ox }) => {
    for (let j = -1; j <= 1; j++) {
      ctx.save();
      ctx.translate(nose.x + ox, nose.y);
      ctx.rotate(angle + j * 0.20 * side);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * s * 0.72, j * s * 0.065);
      ctx.strokeStyle = 'rgba(255,255,240,0.88)';
      ctx.lineWidth   = 1.9;
      ctx.lineCap     = 'round';
      ctx.stroke();
      ctx.restore();
    }
  });
}
