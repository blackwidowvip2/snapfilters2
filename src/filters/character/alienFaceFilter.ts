import { DrawCtx } from '../DrawCtx';

/**
 * Alien Face filter — elongated head silhouette, large luminous compound eyes,
 * bioluminescent skin markings and a thin slit mouth.
 */
export function drawAlienFace(d: DrawCtx) {
  const { ctx, s, angle, t } = d;
  const fh   = d.pt(10);
  const chin = d.pt(152);
  const lEye = d.eyeCenter('left');
  const rEye = d.eyeCenter('right');
  const mc   = d.mouthCenter();
  const faceH = Math.hypot(chin.x - fh.x, chin.y - fh.y);

  // ── Skin tint: desaturate + green-tinge the face region
  ctx.save();
  ctx.translate(fh.x, fh.y + faceH * 0.35);
  ctx.rotate(angle);
  const skinG = ctx.createRadialGradient(0, 0, faceH * 0.05, 0, 0, faceH * 0.68);
  skinG.addColorStop(0,   'rgba(140,200,120,0.18)');
  skinG.addColorStop(0.5, 'rgba(100,180,90,0.12)');
  skinG.addColorStop(1,   'rgba(60,130,50,0)');
  ctx.fillStyle = skinG;
  ctx.beginPath();
  ctx.ellipse(0, 0, faceH * 0.52, faceH * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Elongated cranium glow above the forehead
  ctx.save();
  ctx.translate(fh.x, fh.y - faceH * 0.30);
  ctx.rotate(angle);
  const crG = ctx.createRadialGradient(0, 0, 0, 0, 0, faceH * 0.55);
  crG.addColorStop(0,   'rgba(100,220,100,0.22)');
  crG.addColorStop(0.55,'rgba(60,180,80,0.10)');
  crG.addColorStop(1,   'transparent');
  ctx.fillStyle = crG;
  ctx.beginPath();
  ctx.ellipse(0, 0, faceH * 0.40, faceH * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Large almond-shaped compound eyes
  [lEye, rEye].forEach((eye, i) => {
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(angle + (i === 0 ? 0.18 : -0.18));

    // Erase original eye
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.20, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Deep black base
    ctx.fillStyle = '#040c08';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.20, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iridescent iris — animated
    const pulse = 0.75 + Math.sin(t * 2.2) * 0.08;
    const ig = ctx.createRadialGradient(-s * 0.04, -s * 0.02, 0, 0, 0, s * 0.16);
    ig.addColorStop(0,   `rgba(${80 + Math.sin(t) * 20 | 0},255,${120 + Math.cos(t * 1.3) * 40 | 0},${pulse})`);
    ig.addColorStop(0.45,'rgba(20,180,60,0.55)');
    ig.addColorStop(1,   'rgba(0,80,20,0.10)');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.16, s * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vertical slit pupil
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.030, s * 0.095, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular glint
    ctx.fillStyle = 'rgba(200,255,210,0.55)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.05, -s * 0.03, s * 0.028, s * 0.018, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow
    ctx.shadowColor = '#00FF80';
    ctx.shadowBlur  = 20;
    ctx.strokeStyle = 'rgba(0,255,100,0.55)';
    ctx.lineWidth   = s * 0.018;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.20, s * 0.13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  // ── Bioluminescent vein markings on forehead & temples
  const veins = [
    { x: fh.x - s * 0.28, y: fh.y + s * 0.10, a: 0.6 },
    { x: fh.x + s * 0.28, y: fh.y + s * 0.10, a: -0.6 },
    { x: fh.x,             y: fh.y - s * 0.05, a: 0.0 },
  ];
  veins.forEach(v => {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(angle + v.a);
    ctx.globalAlpha = 0.45 + Math.sin(t * 1.8) * 0.15;
    ctx.strokeStyle = '#00FF80';
    ctx.lineWidth   = s * 0.012;
    ctx.lineCap     = 'round';
    ctx.shadowColor = '#00FF80';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.06, -s * 0.10, s * 0.04, -s * 0.22, 0, -s * 0.30);
    ctx.stroke();
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  // ── Thin slit mouth
  ctx.save();
  ctx.translate(mc.x, mc.y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.10, s * 0.035, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'black';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#001a00';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.08, s * 0.014, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,180,60,0.55)';
  ctx.lineWidth   = s * 0.010;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.08, s * 0.014, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
