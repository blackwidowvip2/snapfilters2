import { DrawCtx } from '../DrawCtx';

// ── Neon face-mesh overlay ─────────────────────────────────────────────────
export function drawNeonOverlay(d: DrawCtx) {
  const { ctx, t } = d;
  const paths = [
    [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146],
    [33,160,158,133,153,144],
    [362,385,387,263,373,380],
    [70,63,105,66,107],
    [336,296,334,293,300],
    [1,2,98,327],
  ];
  const hue=(t*50)%360;
  ctx.save();
  ctx.strokeStyle=`hsl(${hue},100%,62%)`;
  ctx.lineWidth=2;
  ctx.shadowColor=`hsl(${hue},100%,62%)`;
  ctx.shadowBlur=18;
  ctx.globalAlpha=0.88;
  paths.forEach((p,pi) => {
    const start=d.pt(p[0]); ctx.beginPath(); ctx.moveTo(start.x,start.y);
    for (let i=1;i<p.length;i++) { const pp=d.pt(p[i]); ctx.lineTo(pp.x,pp.y); }
    if (pi===0) ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}

// ── Cyberpunk ──────────────────────────────────────────────────────────────
export function drawCyberpunk(d: DrawCtx) {
  const { ctx, s, angle, t } = d;
  const lEye=d.eyeCenter('left'), rEye=d.eyeCenter('right');
  const fh=d.pt(10), chin=d.pt(152);
  const lCheek=d.pt(234), rCheek=d.pt(454);

  [lCheek,rCheek].forEach((ch,ci) => {
    const side=ci===0?-1:1, hue=ci===0?188:302;
    ctx.save(); ctx.translate(ch.x,ch.y); ctx.rotate(angle);
    ctx.strokeStyle=`hsla(${hue},100%,60%,0.75)`; ctx.lineWidth=s*0.013; ctx.lineCap='square';
    ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(side*s*0.14,0); ctx.lineTo(side*s*0.14,-s*0.07); ctx.lineTo(side*s*0.24,-s*0.07); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,s*0.05); ctx.lineTo(side*s*0.2,s*0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(side*s*0.1,s*0.05); ctx.lineTo(side*s*0.1,s*0.1); ctx.stroke();
    ctx.fillStyle=`hsl(${hue},100%,68%)`;
    [[side*s*0.14,-s*0.07],[side*s*0.24,-s*0.07],[side*s*0.1,s*0.1]].forEach(([nx,ny]) => {
      ctx.beginPath(); ctx.arc(nx,ny,s*0.018,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  });

  [lEye,rEye].forEach((eye,ei) => {
    const hue=ei===0?188:302;
    const g=ctx.createRadialGradient(eye.x,eye.y,0,eye.x,eye.y,s*0.14);
    g.addColorStop(0,`hsla(${hue},100%,60%,0.5)`); g.addColorStop(1,'transparent');
    ctx.save(); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(eye.x,eye.y,s*0.14,0,Math.PI*2); ctx.fill();
    ctx.translate(eye.x,eye.y);
    ctx.strokeStyle=`hsla(${hue},100%,62%,0.55)`; ctx.lineWidth=s*0.018;
    ctx.beginPath(); ctx.arc(0,0,s*0.115,0,Math.PI*1.65); ctx.stroke();
    ctx.strokeStyle=`hsla(${hue},100%,62%,0.3)`; ctx.lineWidth=s*0.024;
    ctx.beginPath(); ctx.arc(0,0,s*0.148,-0.5,Math.PI*1.1); ctx.stroke();
    ctx.restore();
  });

  // Scanning line
  const scanY=fh.y+(((t*0.5)%1))*(chin.y-fh.y);
  ctx.save(); ctx.globalAlpha=0.25;
  const sg=ctx.createLinearGradient(0,scanY-s*0.045,0,scanY+s*0.045);
  sg.addColorStop(0,'transparent'); sg.addColorStop(0.5,'rgba(0,255,200,0.55)'); sg.addColorStop(1,'transparent');
  ctx.fillStyle=sg; ctx.fillRect(0,scanY-s*0.045,d.W,s*0.09); ctx.restore();
}

// ── Gold ───────────────────────────────────────────────────────────────────
export function drawGold(d: DrawCtx) {
  const { ctx, s, angle, t } = d;
  const fh=d.pt(10);
  const lEye=d.eyeCenter('left'), rEye=d.eyeCenter('right');
  const lBrow=d.pt(70), rBrow=d.pt(300);

  for (let k=0;k<24;k++) {
    const a=(k/24)*Math.PI*2+t*0.38;
    const r=s*(0.52+d.pseudo(k)*0.36);
    const px=fh.x+Math.cos(a)*r, py=fh.y+Math.sin(a)*r*0.65;
    const gs=s*(0.014+d.pseudo(k*2)*0.018);
    ctx.save(); ctx.translate(px,py); ctx.rotate(t*1.8+k);
    ctx.globalAlpha=0.6+Math.sin(t*2.8+k)*0.32;
    ctx.fillStyle=`hsl(${38+d.pseudo(k)*22},100%,${55+d.pseudo(k*3)*24}%)`;
    ctx.shadowColor='#FFD700'; ctx.shadowBlur=10;
    ctx.fillRect(-gs,-gs,gs*2,gs*2); ctx.restore();
  }

  [lEye,rEye].forEach((eye,ei) => {
    const dir=ei===0?-1:1;
    ctx.save(); ctx.translate(eye.x,eye.y); ctx.rotate(angle);
    ctx.strokeStyle='#C8A800'; ctx.lineWidth=s*0.026; ctx.lineCap='round';
    ctx.shadowColor='#FFD700'; ctx.shadowBlur=9;
    ctx.beginPath(); ctx.arc(0,0,s*0.1,Math.PI+0.18,-0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dir*s*0.1,-s*0.01); ctx.lineTo(dir*s*0.168,-s*0.072); ctx.stroke();
    ctx.restore();
  });

  [lBrow,rBrow].forEach(brow => {
    ctx.save(); ctx.translate(brow.x,brow.y); ctx.rotate(angle);
    const bg=ctx.createLinearGradient(-s*0.24,0,s*0.24,0);
    bg.addColorStop(0,'transparent'); bg.addColorStop(0.5,'rgba(220,180,0,0.55)'); bg.addColorStop(1,'transparent');
    ctx.fillStyle=bg; ctx.globalAlpha=0.72;
    ctx.beginPath(); ctx.ellipse(0,0,s*0.24,s*0.032,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  });

  d.drawLipShape('rgba(210,170,0,0.7)',0.65,true);
}

// ── Cartoon / Comic-book ───────────────────────────────────────────────────
export function drawCartoon(d: DrawCtx) {
  // Bold outlines on key face features using mesh paths
  const { ctx, s } = d;

  // Face outline
  const jawLine=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,0.75)'; ctx.lineWidth=s*0.03; ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.beginPath();
  jawLine.forEach((idx,i) => { const p=d.pt(idx); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); });
  ctx.closePath(); ctx.stroke(); ctx.restore();

  // Eye outlines
  [[33,160,158,133,153,144],[263,387,385,362,380,373]].forEach(pts => {
    ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.8)'; ctx.lineWidth=s*0.026; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); pts.forEach((idx,i)=>{ const p=d.pt(idx); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); }); ctx.closePath(); ctx.stroke(); ctx.restore();
  });

  // Brow outlines
  [[70,63,105,66,107],[336,296,334,293,300]].forEach(pts => {
    d.polyline(pts,'rgba(0,0,0,0.7)',s*0.026);
  });

  // Lip outline
  const lipPts=[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
  ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=s*0.022; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); lipPts.forEach((idx,i)=>{ const p=d.pt(idx); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); }); ctx.closePath(); ctx.stroke(); ctx.restore();

  // Halftone dot blush on cheeks
  [d.pt(234),d.pt(454)].forEach(ch => {
    for (let dx=-2;dx<=2;dx++) for (let dy=-1;dy<=1;dy++) {
      const px=ch.x+dx*s*0.06, py=ch.y+dy*s*0.06;
      d.oval(px,py,s*0.018,s*0.018,'rgba(255,80,100,0.55)',1);
    }
  });
}

// ── Noir ───────────────────────────────────────────────────────────────────
// (pixel filter handles B&W — this overlay adds film grain + vignette)
export function drawNoir(d: DrawCtx) {
  const { ctx } = d;
  const W=d.W, H=d.H;
  ctx.save();
  for (let i=0;i<500;i++) {
    const gx=Math.random()*W, gy=Math.random()*H;
    const gs=1+Math.random()*2.2;
    ctx.globalAlpha=0.04+Math.random()*0.09;
    ctx.fillStyle=Math.random()>0.5?'#fff':'#000';
    ctx.fillRect(gx,gy,gs,gs);
  }
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.75);
  vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.58)');
  ctx.globalAlpha=1; ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  ctx.restore();
}

// ── Akvarel ────────────────────────────────────────────────────────────────
export function drawWatercolor(d: DrawCtx) {
  const { ctx, s, t } = d;
  const pts=[10,234,454,152,33,263,4,61,291,70,300,1];
  const wcColors=['rgba(100,180,240,0.2)','rgba(240,120,160,0.18)','rgba(140,220,150,0.2)','rgba(255,200,80,0.16)','rgba(180,120,220,0.18)'];
  pts.forEach((idx,si) => {
    const p=d.pt(idx);
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(t*0.1+si);
    ctx.globalAlpha=0.6; ctx.fillStyle=wcColors[si%wcColors.length];
    ctx.shadowColor=wcColors[si%wcColors.length]; ctx.shadowBlur=20;
    ctx.beginPath(); ctx.ellipse(0,0,s*(0.24+d.pseudo(si*3.1)*0.18),s*(0.19+d.pseudo(si*7.7)*0.15),si*0.4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ── Olie-maleri ────────────────────────────────────────────────────────────
// (handled by pixel filter — overlay adds brush-stroke marks)
export function drawOilPaint(d: DrawCtx) {
  const { ctx, s } = d;
  // Thick brush strokes along brows and jaw for painterly feel
  [[70,63,105,66,107],[336,296,334,293,300]].forEach(pts => {
    d.polyline(pts,'rgba(0,0,0,0.18)',s*0.055);
    d.polyline(pts,'rgba(255,255,255,0.12)',s*0.025);
  });
  [d.pt(234),d.pt(454)].forEach(ch => {
    ctx.save(); ctx.translate(ch.x,ch.y); ctx.rotate(d.angle);
    ctx.strokeStyle='rgba(255,200,150,0.15)'; ctx.lineWidth=s*0.06; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-s*0.18,0); ctx.lineTo(s*0.18,0); ctx.stroke(); ctx.restore();
  });
}

// ── Nattesyn (Night Vision) ─────────────────────────────────────────────────
// (pixel filter makes it green-tinted — overlay adds scan lines + crosshair)
export function drawNightVision(d: DrawCtx) {
  const { ctx } = d;
  const W=d.W, H=d.H;
  ctx.save();
  // Scanlines
  for (let y=0;y<H;y+=3) {
    ctx.globalAlpha=0.09; ctx.fillStyle='#000';
    ctx.fillRect(0,y,W,1);
  }
  // Vignette
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.7);
  vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,30,0,0.62)');
  ctx.globalAlpha=1; ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  // Crosshair
  const cx=W/2, cy=H/2;
  ctx.strokeStyle='rgba(0,255,50,0.5)'; ctx.lineWidth=1.2; ctx.globalAlpha=0.65;
  ctx.beginPath(); ctx.moveTo(cx-20,cy); ctx.lineTo(cx+20,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy-20); ctx.lineTo(cx,cy+20); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2); ctx.stroke();
  // Corner brackets
  [[cx-W*0.38,cy-H*0.38],[cx+W*0.38,cy-H*0.38],[cx-W*0.38,cy+H*0.38],[cx+W*0.38,cy+H*0.38]].forEach(([bx,by]) => {
    const bs=18, sx=bx<cx?1:-1, sy=by<cy?1:-1;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+sx*bs,by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx,by+sy*bs); ctx.stroke();
  });
  ctx.restore();
}

// ── Hologram ───────────────────────────────────────────────────────────────
export function drawHologram(d: DrawCtx) {
  const { ctx, s, t } = d;
  const fh=d.pt(10);

  // Flickering cyan face outline
  const outline=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
  ctx.save();
  ctx.globalAlpha=0.7+Math.sin(t*8)*0.25;
  ctx.strokeStyle=`hsl(${185+Math.sin(t*3)*15},100%,68%)`;
  ctx.lineWidth=s*0.018; ctx.shadowColor='#00EEFF'; ctx.shadowBlur=22;
  ctx.beginPath();
  outline.forEach((idx,i) => { const p=d.pt(idx); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); });
  ctx.closePath(); ctx.stroke(); ctx.restore();

  // Horizontal scan bands
  const W=d.W;
  for (let k=0;k<5;k++) {
    const by=fh.y-s*0.8 + ((t*0.6+k*0.2)%1)*(s*2.0);
    ctx.save(); ctx.globalAlpha=0.12+d.pseudo(k+t*0.5)*0.08;
    ctx.fillStyle='rgba(0,230,255,0.5)'; ctx.fillRect(0,by,W,s*0.03); ctx.restore();
  }

  // Floating data particles
  for (let k=0;k<10;k++) {
    const a=(k/10)*Math.PI*2+t*0.5;
    const r=s*(0.4+Math.sin(t*1.5+k)*0.12);
    const px=fh.x+Math.cos(a)*r, py=fh.y+Math.sin(a)*r*0.55;
    ctx.save(); ctx.globalAlpha=0.5+Math.sin(t*3+k)*0.35;
    ctx.fillStyle='#00EEFF'; ctx.shadowColor='#00EEFF'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(px,py,s*0.012,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

// ── Infrared ───────────────────────────────────────────────────────────────
// (pixel filter handles colour mapping — overlay adds heat shimmer glow)
export function drawInfrared(d: DrawCtx) {
  const { ctx, s } = d;
  const fh=d.pt(10);
  // Face warm glow
  const g=ctx.createRadialGradient(fh.x,fh.y,0,fh.x,fh.y,s*1.1);
  g.addColorStop(0,'rgba(255,120,0,0.18)'); g.addColorStop(0.5,'rgba(255,60,0,0.08)'); g.addColorStop(1,'transparent');
  ctx.save(); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(fh.x,fh.y,s*1.1,0,Math.PI*2); ctx.fill(); ctx.restore();
}
