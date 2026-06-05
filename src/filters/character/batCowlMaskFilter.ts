import { DrawCtx } from '../DrawCtx';

/**
 * Bat Cowl Mask — a moulded bat-style half-mask.
 *
 * Shape (matching a classic costume half-mask): covers the forehead, temples,
 * the area around the eyes and the nose, ending just below the nose so the
 * mouth, jaw and chin stay exposed. Two pointed ears rise from the top with a
 * shallow notch between them. The eyes show through angular, slanted holes.
 *
 * Look: matte rubber/leather with sculpted panels, seams, a raised nose ridge,
 * recessed eye sockets, soft top lighting and fine grain.
 *
 * Everything is built in a head-local frame (origin between the eyes, axes
 * along the head's "side" and "down" vectors) so the mask tracks head tilt.
 */
export function drawBatCowl(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const fh   = d.pt(10);
  const chin = d.pt(152);
  const lEye = d.eyeCenter('left');
  const rEye = d.eyeCenter('right');
  const fc   = d.faceCenter();

  const faceH = Math.hypot(chin.x - fh.x, chin.y - fh.y);
  const upX = (fh.x - chin.x) / faceH;
  const upY = (fh.y - chin.y) / faceH;
  const sideX = -upY, sideY = upX;   // image-right
  const dX = -upX, dY = -upY;         // down

  // Local frame: origin between the eyes; units in inter-ocular distance s.
  const ox = (lEye.x + rEye.x) / 2;
  const oy = (lEye.y + rEye.y) / 2;
  const lp = (u: number, v: number) => ({
    x: ox + sideX * (u * s) + dX * (v * s),
    y: oy + sideY * (u * s) + dY * (v * s),
  });

  // ════════════════════════════════════════════════════════════════════
  //  MASK OUTLINE  (ears + dome + temples + cheeks + nose tab)
  // ════════════════════════════════════════════════════════════════════
  // Bottom of the mask is tied to the ACTUAL nose position so it always ends
  // just under the nose, regardless of face proportions. vNose is the nose
  // tip's "down" offset from the eye line, measured in units of s.
  const noseP = d.pt(4);
  const vNose = ((noseP.x - ox) * dX + (noseP.y - oy) * dY) / s;
  const vBot  = vNose + 0.18;   // nose tab ends just below the nose tip

  const CT  = lp( 0.00, -1.20);   // centre-top (notch between ears)
  const REi = lp( 0.40, -1.50), REt = lp( 0.60, -2.35), REo = lp( 0.86, -1.52);
  const RT  = lp( 1.12, -0.45), RS  = lp( 0.92, vNose - 0.55), RBo = lp( 0.58, vNose - 0.05);
  const NB  = lp( 0.00, vBot);    // nose bottom (just under the nose)
  const LBo = lp(-0.58, vNose - 0.05), LS = lp(-0.92, vNose - 0.55), LT = lp(-1.12, -0.45);
  const LEo = lp(-0.86, -1.52), LEt = lp(-0.60, -2.35), LEi = lp(-0.40, -1.50);

  // control points
  const cDomeR = lp( 0.20, -1.58), cDomeL = lp(-0.20, -1.58);
  const cREoRT = lp( 1.04, -1.00), cRTRS = lp( 1.14, vNose - 0.85), cRSRBo = lp( 0.82, vNose - 0.30);
  const cRBoNB = lp( 0.32,  vNose + 0.10), cNBLBo = lp(-0.32, vNose + 0.10);
  const cLBoLS = lp(-0.82, vNose - 0.30), cLSLT = lp(-1.14, vNose - 0.85), cLTLEo = lp(-1.04, -1.00);

  const mask = new Path2D();
  mask.moveTo(CT.x, CT.y);
  mask.quadraticCurveTo(cDomeR.x, cDomeR.y, REi.x, REi.y);  // dome → right ear inner
  mask.lineTo(REt.x, REt.y);                                 // ear up
  mask.lineTo(REo.x, REo.y);                                 // ear down
  mask.quadraticCurveTo(cREoRT.x, cREoRT.y, RT.x, RT.y);     // → temple
  mask.quadraticCurveTo(cRTRS.x, cRTRS.y, RS.x, RS.y);       // → cheek side
  mask.quadraticCurveTo(cRSRBo.x, cRSRBo.y, RBo.x, RBo.y);   // → lower cheek
  mask.quadraticCurveTo(cRBoNB.x, cRBoNB.y, NB.x, NB.y);     // → nose bottom
  mask.quadraticCurveTo(cNBLBo.x, cNBLBo.y, LBo.x, LBo.y);   // → left lower cheek
  mask.quadraticCurveTo(cLBoLS.x, cLBoLS.y, LS.x, LS.y);
  mask.quadraticCurveTo(cLSLT.x, cLSLT.y, LT.x, LT.y);
  mask.quadraticCurveTo(cLTLEo.x, cLTLEo.y, LEo.x, LEo.y);   // → left ear
  mask.lineTo(LEt.x, LEt.y);
  mask.lineTo(LEi.x, LEi.y);
  mask.quadraticCurveTo(cDomeL.x, cDomeL.y, CT.x, CT.y);     // dome back to centre
  mask.closePath();

  // ── Angular, slanted eye holes (added to the same path for even-odd) ──
  const eyeHole = (eye: { x: number; y: number }) => {
    const sgn = Math.sign(((fc.x - eye.x) * sideX + (fc.y - eye.y) * sideY)) || 1;
    // sgn points toward the face centre (the nose side)
    const e = (u: number, v: number) => ({
      x: eye.x + sideX * (u * s) + dX * (v * s),
      y: eye.y + sideY * (u * s) + dY * (v * s),
    });
    const innerC = e(sgn *  0.24,  0.05);  // toward nose, slightly low
    const topC   = e(sgn * -0.02, -0.12);
    const outerC = e(sgn * -0.26, -0.03);  // away, slightly high (angry slant)
    const botC   = e(sgn *  0.02,  0.13);
    const cIT = e(sgn *  0.14, -0.10), cTO = e(sgn * -0.16, -0.12);
    const cOB = e(sgn * -0.16,  0.10), cBI = e(sgn *  0.16,  0.12);
    mask.moveTo(innerC.x, innerC.y);
    mask.quadraticCurveTo(cIT.x, cIT.y, topC.x, topC.y);
    mask.quadraticCurveTo(cTO.x, cTO.y, outerC.x, outerC.y);
    mask.quadraticCurveTo(cOB.x, cOB.y, botC.x, botC.y);
    mask.quadraticCurveTo(cBI.x, cBI.y, innerC.x, innerC.y);
  };
  eyeHole(lEye);
  eyeHole(rEye);

  // ════════════════════════════════════════════════════════════════════
  //  FILL — matte base gradient (holes left open via even-odd)
  // ════════════════════════════════════════════════════════════════════
  ctx.save();
  const top = lp(0, -2.0), bot = lp(0, 1.4);
  const baseG = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
  baseG.addColorStop(0.00, '#26262d');
  baseG.addColorStop(0.40, '#17171d');
  baseG.addColorStop(0.75, '#0e0e13');
  baseG.addColorStop(1.00, '#08080c');
  ctx.fillStyle = baseG;
  ctx.fill(mask, 'evenodd');

  // Clip to the mask (respecting holes) for all shading below
  ctx.clip(mask, 'evenodd');

  // ── Broad top-light sheen over the forehead/crown
  const fhP = lp(0, -1.0);
  const sheen = ctx.createRadialGradient(fhP.x, fhP.y, 0, fhP.x, fhP.y, s * 1.7);
  sheen.addColorStop(0,   'rgba(120,122,145,0.30)');
  sheen.addColorStop(0.5, 'rgba(70,72,90,0.12)');
  sheen.addColorStop(1,   'transparent');
  ctx.fillStyle = sheen;
  ctx.fill(mask);

  // ── Raised nose ridge: a sculpted tapered panel down the centre
  const rTopL = lp(-0.10, 0.10), rTopR = lp(0.10, 0.10);
  const rBot  = lp(0, vBot - 0.06);
  const rcL = lp(-0.16, vNose - 0.3), rcR = lp(0.16, vNose - 0.3);
  const ridgeShape = new Path2D();
  ridgeShape.moveTo(rTopL.x, rTopL.y);
  ridgeShape.quadraticCurveTo(rcL.x, rcL.y, rBot.x, rBot.y);
  ridgeShape.quadraticCurveTo(rcR.x, rcR.y, rTopR.x, rTopR.y);
  ridgeShape.closePath();
  const ridgeG = ctx.createLinearGradient(rTopL.x, rTopL.y, rTopR.x, rTopR.y);
  ridgeG.addColorStop(0.0, 'rgba(10,10,14,0.55)');
  ridgeG.addColorStop(0.5, 'rgba(120,124,150,0.28)');
  ridgeG.addColorStop(1.0, 'rgba(10,10,14,0.55)');
  ctx.fillStyle = ridgeG;
  ctx.fill(ridgeShape);

  // ── Recessed eye sockets: soft dark halo around each eye hole
  [lEye, rEye].forEach(eye => {
    const sock = ctx.createRadialGradient(eye.x, eye.y, s * 0.18, eye.x, eye.y, s * 0.42);
    sock.addColorStop(0,   'rgba(0,0,0,0.55)');
    sock.addColorStop(0.6, 'rgba(0,0,0,0.20)');
    sock.addColorStop(1,   'transparent');
    ctx.fillStyle = sock;
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, s * 0.42, s * 0.34, angle, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── Brow ridge "scowl": dark sweep over the eyes meeting at the nose
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const bMid = lp(0, 0.0);
  [lEye, rEye].forEach(eye => {
    const sgn = Math.sign(((fc.x - eye.x) * sideX + (fc.y - eye.y) * sideY)) || 1;
    const oC = (u: number, v: number) => ({
      x: eye.x + sideX * (u * s) + dX * (v * s),
      y: eye.y + sideY * (u * s) + dY * (v * s),
    });
    const out = oC(sgn * -0.30, -0.18);
    const mid = oC(sgn * 0.0,  -0.22);
    ctx.beginPath();
    ctx.moveTo(out.x, out.y);
    ctx.quadraticCurveTo(mid.x, mid.y, bMid.x, bMid.y);
    ctx.stroke();
  });
  // thin highlight above the brow
  ctx.strokeStyle = 'rgba(110,114,140,0.35)';
  ctx.lineWidth = s * 0.014;
  [lEye, rEye].forEach(eye => {
    const sgn = Math.sign(((fc.x - eye.x) * sideX + (fc.y - eye.y) * sideY)) || 1;
    const oC = (u: number, v: number) => ({
      x: eye.x + sideX * (u * s) + dX * (v * s),
      y: eye.y + sideY * (u * s) + dY * (v * s),
    });
    const out = oC(sgn * -0.30, -0.26);
    const mid = oC(sgn * 0.0,  -0.30);
    ctx.beginPath();
    ctx.moveTo(out.x, out.y);
    ctx.quadraticCurveTo(mid.x, mid.y, lp(0, -0.08).x, lp(0, -0.08).y);
    ctx.stroke();
  });

  // ── Panel seams: temple sweeps + ear-base creases
  const seam = (a: {x:number;y:number}, c: {x:number;y:number}, b: {x:number;y:number}) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.40)';
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,124,150,0.18)';
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 1); ctx.quadraticCurveTo(c.x, c.y - 1, b.x, b.y - 1); ctx.stroke();
  };
  // right temple → cheek panel
  seam(lp(0.78, -0.7), lp(1.0, -0.1), lp(0.86, 0.7));
  seam(lp(-0.78, -0.7), lp(-1.0, -0.1), lp(-0.86, 0.7));
  // ear-base creases
  seam(lp(0.40, -1.45), lp(0.55, -1.2), lp(0.80, -1.30));
  seam(lp(-0.40, -1.45), lp(-0.55, -1.2), lp(-0.80, -1.30));

  // ── Fine matte grain (head-local so it tracks tilt)
  for (let i = 0; i < 700; i++) {
    const u = (d.pseudo(i * 1.7) * 2 - 1) * 1.2;
    const v = (d.pseudo(i * 2.3 + 11) * 2 - 1) * 1.8;
    const p = lp(u, v);
    const light = d.pseudo(i * 0.7 + 5) > 0.5;
    ctx.fillStyle = light ? 'rgba(150,152,170,0.05)' : 'rgba(0,0,0,0.06)';
    const r = 0.5 + d.pseudo(i * 3.1) * (s * 0.01);
    ctx.fillRect(p.x, p.y, r, r);
  }

  ctx.restore(); // end clip

  // ════════════════════════════════════════════════════════════════════
  //  EDGES — crisp dark outline + rim light on the upper edges
  // ════════════════════════════════════════════════════════════════════
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = s * 0.022;
  ctx.stroke(mask);

  // Eye-hole rims (inner shadow + thin top highlight)
  [lEye, rEye].forEach(eye => {
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.26, s * 0.135, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,124,150,0.30)';
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.01, s * 0.25, s * 0.12, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
  });

  // Rim light along the ear tips & dome (upper edge catches light)
  ctx.strokeStyle = 'rgba(140,144,170,0.35)';
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.moveTo(LEi.x, LEi.y); ctx.lineTo(LEt.x, LEt.y);
  ctx.moveTo(REi.x, REi.y); ctx.lineTo(REt.x, REt.y);
  ctx.stroke();
  ctx.restore();
}
