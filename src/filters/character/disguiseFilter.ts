import { DrawCtx } from '../DrawCtx';

// ════════════════════════════════════════════════════════════════════════
//  Disguise — the classic "Groucho" novelty glasses: thick black-rimmed
//  glasses with bushy eyebrows on top, a big skin-coloured nose hanging down
//  and a bushy black moustache underneath. Drawn procedurally on the 2D
//  overlay, anchored on the eye line so it tracks head position, scale and
//  roll. The lenses are left clear so the real eyes show through.
// ════════════════════════════════════════════════════════════════════════
export function drawDisguise(d: DrawCtx) {
  const { ctx } = d;
  const s = d.s * 0.8;                  // inter-ocular distance (face scale), 20% smaller

  const lEye = d.eyeCenter('left');
  const rEye = d.eyeCenter('right');
  const bx = (lEye.x + rEye.x) / 2;    // bridge = midpoint between the eyes
  const by = (lEye.y + rEye.y) / 2;

  const BLACK = '#262626';
  const OUTLINE = '#111111';
  const SKIN = '#d9a979';
  const SKIN_SHADOW = '#b9885c';

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(d.angle + Math.PI);       // flipped 180°
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const EYE_X = 0.55 * s;              // each lens centred over an eye
  const LRX = 0.5 * s;                 // lens radius x
  const LRY = 0.54 * s;                // lens radius y

  // ── Big bushy nose (drawn first so the glasses sit on top of it) ───────
  {
    ctx.save();
    // 50% smaller, scaled about its top so it stays attached at the bridge.
    ctx.translate(0, -0.05 * s);
    ctx.scale(0.5, 0.5);
    ctx.translate(0, 0.05 * s);
    ctx.beginPath();
    ctx.moveTo(-0.14 * s, -0.05 * s);                                   // bridge top-left
    ctx.bezierCurveTo(-0.20 * s, 0.55 * s, -0.42 * s, 0.95 * s, -0.34 * s, 1.25 * s);
    ctx.bezierCurveTo(-0.22 * s, 1.55 * s, 0.22 * s, 1.55 * s, 0.34 * s, 1.25 * s);
    ctx.bezierCurveTo(0.42 * s, 0.95 * s, 0.20 * s, 0.55 * s, 0.14 * s, -0.05 * s); // up the right side
    ctx.closePath();
    ctx.fillStyle = SKIN;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.05 * s;
    ctx.fill();
    ctx.stroke();
    // nostrils / underside shadow
    ctx.beginPath();
    ctx.ellipse(-0.17 * s, 1.18 * s, 0.11 * s, 0.08 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(0.17 * s, 1.18 * s, 0.11 * s, 0.08 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = SKIN_SHADOW;
    ctx.fill();
    // glossy highlight
    ctx.beginPath();
    ctx.ellipse(0.05 * s, 0.85 * s, 0.07 * s, 0.18 * s, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
    ctx.restore();
  }

  // ── Moustache (bushy, jagged bottom) ──────────────────────────────────
  {
    ctx.save();
    // Follow the now-smaller nose up so it still sits just below the nose tip.
    ctx.translate(0, -0.8 * s);
    // 20% smaller, scaled about its top so it stays just under the nose.
    ctx.translate(0, 1.42 * s);
    ctx.scale(0.8, 0.8);
    ctx.translate(0, -1.42 * s);
    ctx.beginPath();
    ctx.moveTo(0, 1.42 * s);
    // left half sweeping out
    ctx.bezierCurveTo(-0.28 * s, 1.30 * s, -0.55 * s, 1.34 * s, -0.62 * s, 1.5 * s);
    // jagged lower edge back toward the centre
    const tips = [-0.5, -0.36, -0.22, -0.08, 0.08, 0.22, 0.36, 0.5];
    ctx.lineTo(-0.58 * s, 1.66 * s);
    tips.forEach((tx, i) => {
      const yy = (i % 2 === 0 ? 1.86 : 1.66) * s;
      ctx.lineTo(tx * s, yy);
    });
    ctx.lineTo(0.58 * s, 1.66 * s);
    // right half back up to the centre
    ctx.bezierCurveTo(0.55 * s, 1.34 * s, 0.28 * s, 1.30 * s, 0, 1.42 * s);
    ctx.closePath();
    ctx.fillStyle = BLACK;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.03 * s;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ── Glasses frames (clear lenses — just the rims + bridge) ─────────────
  for (const sx of [-1, 1]) {
    const cx = sx * EYE_X;
    ctx.beginPath();
    // outer ring (clockwise) then inner ring (counter-clockwise) → even-odd hole
    ctx.ellipse(cx, 0.08 * s, LRX, LRY, 0, 0, Math.PI * 2, false);
    ctx.ellipse(cx, 0.08 * s, LRX - 0.1 * s, LRY - 0.1 * s, 0, 0, Math.PI * 2, true);
    ctx.fillStyle = BLACK;
    ctx.fill('evenodd');
    // thin outline around the rim
    ctx.lineWidth = 0.018 * s;
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.ellipse(cx, 0.08 * s, LRX, LRY, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Bridge between the lenses
  ctx.fillStyle = BLACK;
  ctx.fillRect(-EYE_X + LRX - 0.12 * s, -0.06 * s, (EYE_X - LRX) * 2 + 0.24 * s, 0.12 * s);
  // Temple arms — attached to the OUTER side of each lens ring and running
  // back toward the ears, angled slightly downward like real glasses arms.
  ctx.lineWidth = 0.08 * s;
  ctx.strokeStyle = BLACK;
  ctx.lineCap = 'round';
  {
    const TL = 0.55 * s;                // visible temple-arm length
    for (const sx of [-1, 1]) {
      const startX = sx * (EYE_X + LRX);  // exactly at the outer edge of the ring
      const startY = 0.02 * s;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + sx * TL, startY + 0.12 * s);
      ctx.stroke();
    }
  }

  // ── Bushy eyebrows on top of the frames ───────────────────────────────
  for (const sx of [-1, 1]) {
    const cx = sx * EYE_X;
    const topY = -0.52 * s;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 0.42 * s, topY + 0.18 * s);
    // rough/bushy top edge
    const bumps = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];
    bumps.forEach((bxr, i) => {
      const yy = topY + (i % 2 === 0 ? -0.06 : 0.04) * s;
      ctx.lineTo(cx + bxr * s, yy);
    });
    ctx.lineTo(cx + 0.42 * s, topY + 0.18 * s);
    // flat-ish bottom
    ctx.bezierCurveTo(cx + 0.2 * s, topY + 0.30 * s, cx - 0.2 * s, topY + 0.30 * s, cx - 0.42 * s, topY + 0.18 * s);
    ctx.closePath();
    ctx.fillStyle = BLACK;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.025 * s;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
