import { DrawCtx } from '../DrawCtx';

/**
 * Dog — floppy ears, muzzle, nose, whiskers and a tongue whose shape is narrow
 * at the top (where it leaves the mouth) and broadest at the bottom, ending in a
 * wide rounded tip, with a full-length centre groove and fine vertical fibres.
 */
export function drawDog(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const nose = d.pt(4);

  const rnd = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const foreheadTop = d.pt(10);
  const chin        = d.pt(152);
  const faceHeight  = Math.hypot(chin.x - foreheadTop.x, chin.y - foreheadTop.y);
  const upX = (foreheadTop.x - chin.x) / faceHeight;
  const upY = (foreheadTop.y - chin.y) / faceHeight;
  const sideX = -upY;
  const sideY =  upX;

  const lEyeP = d.eyeCenter('left');
  const rEyeP = d.eyeCenter('right');
  const eyeHalfSpan = Math.hypot(rEyeP.x - lEyeP.x, rEyeP.y - lEyeP.y) / 2;

  // ════════════════════════════════════════════════════════════════════
  //  EARS — floppy dog ears, brown fur, visible pink inner ear
  // ════════════════════════════════════════════════════════════════════
  [
    { side: -1 as const, seed: 11 },
    { side:  1 as const, seed: 47 },
  ].forEach(({ side, seed }) => {
    const sideOffset = eyeHalfSpan * 1.40 * side;
    const upOffset   = faceHeight * 0.04;
    const baseX = foreheadTop.x + upX * upOffset + sideX * sideOffset;
    const baseY = foreheadTop.y + upY * upOffset + sideY * sideOffset;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(angle + side * 0.28);

    const earW = faceHeight * 0.22;
    const earH = faceHeight * 0.52;

    // Ear silhouette — matches reference: wide floppy droop, rounded bottom
    const earPath = new Path2D();
    earPath.moveTo(-earW * 0.38, 0);
    earPath.bezierCurveTo(
      -earW * 1.08, earH * 0.18,
      -earW * 1.10, earH * 0.60,
      -earW * 0.32, earH * 0.97,
    );
    earPath.bezierCurveTo(
      -earW * 0.08, earH * 1.08,
       earW * 0.18, earH * 1.07,
       earW * 0.46, earH * 0.90,
    );
    earPath.bezierCurveTo(
       earW * 1.00, earH * 0.62,
       earW * 0.96, earH * 0.16,
       earW * 0.38, 0,
    );
    earPath.closePath();

    // ── Base brown fill
    ctx.save();
    const baseG = ctx.createLinearGradient(0, 0, 0, earH);
    baseG.addColorStop(0,   '#7A4E22');
    baseG.addColorStop(0.5, '#8C5C28');
    baseG.addColorStop(1,   '#4E2E0E');
    ctx.fillStyle = baseG;
    ctx.fill(earPath);
    ctx.restore();

    // ── Inner ear (pink funnel shape)
    ctx.save();
    ctx.clip(earPath);

    const icx = side * earW * 0.06;
    const innerPath = new Path2D();
    innerPath.moveTo(icx - earW * 0.26, earH * 0.07);
    innerPath.bezierCurveTo(
      icx - earW * 0.42, earH * 0.30,
      icx - earW * 0.36, earH * 0.64,
      icx - earW * 0.10, earH * 0.84,
    );
    innerPath.bezierCurveTo(
      icx + earW * 0.06, earH * 0.94,
      icx + earW * 0.24, earH * 0.90,
      icx + earW * 0.34, earH * 0.74,
    );
    innerPath.bezierCurveTo(
      icx + earW * 0.52, earH * 0.48,
      icx + earW * 0.40, earH * 0.16,
      icx + earW * 0.22, earH * 0.05,
    );
    innerPath.closePath();

    // Pink gradient — lighter toward the bottom opening
    const ig = ctx.createLinearGradient(icx, earH * 0.05, icx, earH * 0.92);
    ig.addColorStop(0,    '#A85840');
    ig.addColorStop(0.30, '#D4886E');
    ig.addColorStop(0.65, '#EDB49A');
    ig.addColorStop(1,    '#F0C0A8');
    ctx.fillStyle = ig;
    ctx.fill(innerPath);

    // Depth shadow inside the funnel
    ctx.save();
    ctx.clip(innerPath);
    const depthG = ctx.createRadialGradient(icx, earH * 0.22, 0, icx, earH * 0.28, earW * 0.55);
    depthG.addColorStop(0,   'rgba(50,18,8,0.55)');
    depthG.addColorStop(0.5, 'rgba(50,18,8,0.18)');
    depthG.addColorStop(1,   'rgba(50,18,8,0)');
    ctx.fillStyle = depthG;
    ctx.fillRect(icx - earW, 0, earW * 2, earH);
    ctx.restore();

    ctx.restore(); // end clip

    // ── Fur strands over the entire ear surface
    ctx.save();
    ctx.clip(earPath);
    const strandCount = 220;
    for (let i = 0; i < strandCount; i++) {
      const r1 = rnd(seed + i * 1.31);
      const r2 = rnd(seed + i * 2.73 + 5);
      const r3 = rnd(seed + i * 0.67 + 9);
      const px = (r1 * 2 - 1) * earW * 1.05;
      const py = r2 * earH * 1.06;
      const edge = Math.min(1, Math.abs(px) / (earW * 0.95));
      const dirX = (px >= 0 ? 1 : -1);
      const len  = s * 0.095 * (0.45 + r3) * (0.65 + edge * 0.90);
      const ax   = dirX * len * (0.20 + edge * 0.55);
      const ay   = len * (0.88 + r1 * 0.25);
      // Darker strands near edges, warmer brown in body
      const shade = edge > 0.78
        ? `rgb(${28 + Math.floor(r3 * 12)},${10 + Math.floor(r1 * 8)},${3})`
        : (r3 > 0.58
          ? `rgb(${140 + Math.floor(r1 * 20)},${88 + Math.floor(r2 * 18)},${36 + Math.floor(r3 * 14)})`
          : `rgb(${100 + Math.floor(r1 * 22)},${62 + Math.floor(r2 * 16)},${22 + Math.floor(r3 * 12)})`);
      ctx.strokeStyle = shade;
      ctx.globalAlpha = 0.48 + r2 * 0.46;
      ctx.lineWidth   = Math.max(0.5, s * 0.011 * (0.45 + r1 * 0.9));
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + ax * 0.45, py + ay * 0.38, px + ax, py + ay);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Dark rim vignette
    const rimG = ctx.createRadialGradient(
      side * earW * 0.05, earH * 0.48, earH * 0.15,
      side * earW * 0.05, earH * 0.48, earH * 0.90,
    );
    rimG.addColorStop(0,    'rgba(0,0,0,0)');
    rimG.addColorStop(0.60, 'rgba(0,0,0,0)');
    rimG.addColorStop(1,    'rgba(20,8,2,0.65)');
    ctx.fillStyle = rimG;
    ctx.fill(earPath);

    ctx.restore(); // end clip + fur
    ctx.restore(); // end translate/rotate
  });

  // ════════════════════════════════════════════════════════════════════
  //  MUZZLE + NOSE
  // ════════════════════════════════════════════════════════════════════
  ctx.save();
  ctx.translate(nose.x, nose.y);
  ctx.rotate(angle);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.02, s * 0.34, s * 0.26, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'black';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  const muzW = s * 0.34;
  const muzH = s * 0.20;
  const muzPath = new Path2D();
  muzPath.moveTo(-muzW, -muzH * 0.1);
  muzPath.bezierCurveTo(-muzW, muzH * 0.9, -muzW * 0.30, muzH * 1.25, 0, muzH * 0.95);
  muzPath.bezierCurveTo( muzW * 0.30, muzH * 1.25, muzW, muzH * 0.9, muzW, -muzH * 0.1);
  muzPath.bezierCurveTo( muzW * 0.7, -muzH * 0.7, muzW * 0.25, -muzH * 0.6, 0, -muzH * 0.35);
  muzPath.bezierCurveTo(-muzW * 0.25, -muzH * 0.6, -muzW * 0.7, -muzH * 0.7, -muzW, -muzH * 0.1);
  muzPath.closePath();

  ctx.save();
  ctx.clip(muzPath);
  const mg = ctx.createRadialGradient(0, -muzH * 0.1, 0, 0, muzH * 0.3, muzW * 1.1);
  mg.addColorStop(0,   '#D9B488');
  mg.addColorStop(0.55,'#C49A66');
  mg.addColorStop(1,   '#9C7244');
  ctx.fillStyle = mg;
  ctx.fill(muzPath);

  const dots = 90;
  for (let i = 0; i < dots; i++) {
    const r1 = rnd(100 + i * 1.7);
    const r2 = rnd(200 + i * 2.3);
    const dx = (r1 * 2 - 1) * muzW * 0.95;
    const dy = (r2 * 1.1 - 0.1) * muzH * 1.0;
    const dotR = Math.max(0.5, s * 0.007 * (0.6 + rnd(300 + i)));
    ctx.fillStyle = 'rgba(70,42,18,0.55)';
    ctx.beginPath();
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
    ctx.fill();
    if (rnd(400 + i) > 0.7) {
      ctx.strokeStyle = 'rgba(120,80,40,0.5)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + (dx >= 0 ? 1 : -1) * s * 0.02, dy + s * 0.015);
      ctx.stroke();
    }
  }
  const sh = ctx.createRadialGradient(0, -muzH * 0.2, 0, 0, -muzH * 0.2, muzW * 0.6);
  sh.addColorStop(0, 'rgba(60,38,16,0.30)');
  sh.addColorStop(1, 'rgba(60,38,16,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-muzW, -muzH, muzW * 2, muzH);
  ctx.restore();

  const nW = s * 0.185;
  const nH = s * 0.140;
  const noseCY = -muzH * 0.12;
  const nosePath = new Path2D();
  nosePath.moveTo(0, noseCY + nH * 0.95);
  nosePath.bezierCurveTo(-nW * 1.05, noseCY + nH * 0.7, -nW * 1.0, noseCY - nH * 0.55, -nW * 0.45, noseCY - nH * 0.8);
  nosePath.bezierCurveTo(-nW * 0.18, noseCY - nH * 0.95, nW * 0.18, noseCY - nH * 0.95, nW * 0.45, noseCY - nH * 0.8);
  nosePath.bezierCurveTo( nW * 1.0, noseCY - nH * 0.55, nW * 1.05, noseCY + nH * 0.7, 0, noseCY + nH * 0.95);
  nosePath.closePath();

  const ng = ctx.createRadialGradient(
    -nW * 0.3, noseCY - nH * 0.4, 0,
    0, noseCY, nW * 1.2,
  );
  ng.addColorStop(0,   '#6E4A33');
  ng.addColorStop(0.35,'#3A2114');
  ng.addColorStop(1,   '#150A05');
  ctx.fillStyle = ng;
  ctx.fill(nosePath);

  ctx.save();
  ctx.clip(nosePath);
  const gloss = ctx.createRadialGradient(
    -nW * 0.25, noseCY - nH * 0.45, 0,
    -nW * 0.25, noseCY - nH * 0.35, nW * 0.7,
  );
  gloss.addColorStop(0, 'rgba(255,250,245,0.75)');
  gloss.addColorStop(0.4, 'rgba(220,200,190,0.25)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(-nW * 0.22, noseCY - nH * 0.35, nW * 0.55, nH * 0.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(8,3,2,0.92)';
  [-1, 1].forEach(sd => {
    ctx.beginPath();
    ctx.ellipse(sd * nW * 0.46, noseCY + nH * 0.25, nW * 0.22, nH * 0.34, sd * 0.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = 'rgba(60,34,16,0.7)';
  ctx.lineWidth = s * 0.014;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, noseCY + nH * 0.9);
  ctx.lineTo(0, muzH * 1.05);
  ctx.stroke();

  ctx.restore();

  // ════════════════════════════════════════════════════════════════════
  //  TONGUE — anchored between mouth corners and chin so it NEVER
  //  appears near the nose. Shape: wide at lip, rounded broad tip.
  // ════════════════════════════════════════════════════════════════════
  {
    // Anchor: interpolate 38% of the way from mouth-center to chin.
    // This places the root of the tongue solidly below the lip region
    // regardless of face scale, and well below the nose.
    // Mouth openness.
    const upperInner = d.pt(13);
    const lowerInner = d.pt(14);
    const openPx  = Math.hypot(lowerInner.x - upperInner.x, lowerInner.y - upperInner.y);
    const openNorm = openPx / s;
    const ext      = Math.max(0, Math.min(1, (openNorm - 0.05) / 0.32));

    // Start at the centre of the opening (inner-lip midpoint). The WIDER the mouth,
    // the more we lift the start toward the upper lip, so it doesn't sink too low
    // when the jaw drops far — a gradual upward shift with openness.
    const midX = (upperInner.x + lowerInner.x) / 2;
    const midY = (upperInner.y + lowerInner.y) / 2;
    const lift = ext * 0.55;   // 0 when barely open → toward the upper lip when wide
    const anchorX = midX + (upperInner.x - midX) * lift;
    const anchorY = midY + (upperInner.y - midY) * lift;

    if (ext > 0.03) {
      // INVERTED tongue dimensions — narrow neck at the top, broad bottom.
      const botW = s * (0.23 + 0.17 * ext);   // half-width at the WIDE bottom
      const topW = botW * 0.52;               // half-width at the narrow top
      const tLen = s * (0.30 + 0.50 * ext);   // length — downward (positive y)

      ctx.save();
      ctx.translate(anchorX, anchorY);
      // The mirrored video makes `angle` ≈ π for an upright head, so this is what
      // orients the tongue to hang straight DOWN out of the mouth.
      ctx.rotate(angle + Math.PI);
      // Nudge the whole tongue slightly UP (local −y) so its top sits higher in
      // the mouth opening.
      ctx.translate(0, -s * 0.05);

      // ── Tongue shape (like the reference photo):
      //    - Narrow rounded top (the neck leaving the mouth)
      //    - Sides flare smoothly outward, widest near the bottom
      //    - Broad, gently flattened rounded bottom tip
      const tonguePath = new Path2D();
      tonguePath.moveTo(-topW, topW * 0.5);
      // narrow rounded top cap
      tonguePath.quadraticCurveTo(0, -topW * 0.45, topW, topW * 0.5);
      // right side flares out, reaching max width ~78% down
      tonguePath.bezierCurveTo(
        topW * 1.25, tLen * 0.30,
        botW * 1.02, tLen * 0.52,
        botW,        tLen * 0.78,
      );
      // broad rounded bottom (right → centre → left)
      tonguePath.bezierCurveTo(
        botW * 0.98, tLen * 0.94,
        botW * 0.50, tLen * 1.02,
        0,           tLen * 1.02,
      );
      tonguePath.bezierCurveTo(
        -botW * 0.50, tLen * 1.02,
        -botW * 0.98, tLen * 0.94,
        -botW,        tLen * 0.78,
      );
      // left side back up to the narrow neck
      tonguePath.bezierCurveTo(
        -botW * 1.02, tLen * 0.52,
        -topW * 1.25, tLen * 0.30,
        -topW,        topW * 0.5,
      );
      tonguePath.closePath();

      // ── Clip and fill
      ctx.save();
      ctx.clip(tonguePath);

      // Muted rosy red like the photo — darker at the narrow top knob,
      // lighter dusty rose toward the broad bottom.
      const lg = ctx.createLinearGradient(0, -topW * 0.5, 0, tLen * 1.02);
      lg.addColorStop(0,    '#9E3A3C');
      lg.addColorStop(0.18, '#B25052');
      lg.addColorStop(0.55, '#C46A66');
      lg.addColorStop(1,    '#B85C58');
      ctx.fillStyle = lg;
      ctx.fillRect(-botW * 1.15, -topW, botW * 2.3, tLen * 1.1 + topW);

      // Soft centre sheen
      const sheen = ctx.createRadialGradient(
        0, tLen * 0.55, 0,
        0, tLen * 0.55, botW * 1.1,
      );
      sheen.addColorStop(0, 'rgba(240,170,160,0.30)');
      sheen.addColorStop(1, 'rgba(240,170,160,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(-botW * 1.15, 0, botW * 2.3, tLen * 1.1);

      // Edge shading so the sides roll away (darker rims like the photo)
      const edgeL = ctx.createLinearGradient(-botW, 0, -botW * 0.45, 0);
      edgeL.addColorStop(0, 'rgba(110,25,28,0.5)');
      edgeL.addColorStop(1, 'rgba(110,25,28,0)');
      ctx.fillStyle = edgeL;
      ctx.fillRect(-botW * 1.1, 0, botW * 0.7, tLen * 1.1);
      const edgeR = ctx.createLinearGradient(botW, 0, botW * 0.45, 0);
      edgeR.addColorStop(0, 'rgba(110,25,28,0.5)');
      edgeR.addColorStop(1, 'rgba(110,25,28,0)');
      ctx.fillStyle = edgeR;
      ctx.fillRect(botW * 0.4, 0, botW * 0.7, tLen * 1.1);

      // Fine VERTICAL muscle fibres (the photo's hair-like texture) — short
      // downward strokes that follow the flare of the sides.
      for (let i = 0; i < 240; i++) {
        const r1 = rnd(500 + i * 1.87);
        const r2 = rnd(600 + i * 2.31);
        const r3 = rnd(700 + i * 0.93);
        const py = r2 * tLen * 0.96;
        // local half-width: interpolate neck→bottom flare
        const f  = Math.min(1, py / (tLen * 0.78));
        const wHere = topW + (botW - topW) * (f * f * (3 - 2 * f)); // smoothstep
        const px = (r1 * 2 - 1) * wHere * 0.92;
        const len = s * (0.030 + r3 * 0.045);
        // fibres lean outward slightly with the flare
        const lean = (px / wHere) * len * 0.25;
        const dark = r3 > 0.5;
        ctx.strokeStyle = dark
          ? `rgba(130,35,38,${0.10 + r3 * 0.16})`
          : `rgba(235,160,150,${0.08 + r1 * 0.12})`;
        ctx.lineWidth = Math.max(0.4, s * 0.006 * (0.5 + r2 * 0.7));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + lean * 0.5, py + len * 0.5, px + lean, py + len);
        ctx.stroke();
      }

      // Shadow at the mouth attachment (top)
      const attachG = ctx.createLinearGradient(0, -topW * 0.5, 0, tLen * 0.22);
      attachG.addColorStop(0, 'rgba(60,10,14,0.6)');
      attachG.addColorStop(1, 'rgba(60,10,14,0)');
      ctx.fillStyle = attachG;
      ctx.fillRect(-botW, -topW, botW * 2, tLen * 0.3 + topW);

      ctx.restore(); // end clip

      // ── Centre groove — full length, top to the bottom tip, like the photo
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(110,22,30,0.30)';
      ctx.lineWidth   = s * 0.060;
      ctx.beginPath();
      ctx.moveTo(0, topW * 0.2);
      ctx.lineTo(0, tLen * 0.99);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(90,16,22,0.85)';
      ctx.lineWidth   = s * 0.020;
      ctx.beginPath();
      ctx.moveTo(0, topW * 0.2);
      ctx.lineTo(0, tLen * 1.0);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ── Whiskers ──────────────────────────────────────────────────────────
  [{ side: -1, ox: -s * 0.04 }, { side: 1, ox: s * 0.04 }].forEach(({ side, ox }) => {
    for (let j = -1; j <= 1; j++) {
      ctx.save();
      ctx.translate(nose.x + ox, nose.y);
      ctx.rotate(angle + j * 0.22 * side);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * s * 0.58, j * s * 0.06);
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth   = 1.8;
      ctx.lineCap     = 'round';
      ctx.stroke();
      ctx.restore();
    }
  });

}
