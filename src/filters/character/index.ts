import { DrawCtx } from '../DrawCtx';
export { drawAlienFace }    from './alienFaceFilter';
export { drawBatCowl }      from './batCowlMaskFilter';
export { pxBigEyes }        from './bigEyesFilter';
export { pxBigMouth }       from './bigMouthFilter';
export { pxWideLips }       from './lipWarpFilter';
export { pxAlienHead }      from './alienHeadFilter';
export { pxVerticalScale }  from './verticalWarpFilter';
export { pxSlimFace }       from './slimFaceFilter';
export { pxSwirlFace }      from './swirlFaceFilter';
export { drawThirdEye }     from './thirdEyeFilter';

// ── Vampire ────────────────────────────────────────────────────────────────
export function drawVampire(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const upperLip = d.pt(12);
  const mc   = d.mouthCenter();
  const mL   = d.pt(61), mR = d.pt(291);
  const lEye = d.eyeCenter('left'), rEye = d.eyeCenter('right');

  // Dark eye glow
  [lEye,rEye].forEach(eye => {
    const g=ctx.createRadialGradient(eye.x,eye.y,0,eye.x,eye.y,s*0.12);
    g.addColorStop(0,'rgba(180,0,0,0.55)'); g.addColorStop(1,'transparent');
    ctx.save(); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(eye.x,eye.y,s*0.12,0,Math.PI*2); ctx.fill(); ctx.restore();
  });

  // Dark arched brows
  d.polyline([276,283,282,295,285],'#1a0a14',s*0.024);
  d.polyline([46,53,52,65,55],'#1a0a14',s*0.024);

  // Fangs
  ctx.save();
  ctx.translate(mc.x, upperLip.y); ctx.rotate(angle);
  [-1,1].forEach(side => {
    const fg=ctx.createLinearGradient(side*s*0.055,0,side*s*0.025,s*0.13);
    fg.addColorStop(0,'#f8f0e8'); fg.addColorStop(1,'#e0ccb8');
    ctx.fillStyle=fg;
    ctx.beginPath();
    ctx.moveTo(side*s*0.055,0);
    ctx.bezierCurveTo(side*s*0.058,s*0.04,side*s*0.03,s*0.1,side*s*0.02,s*0.13);
    ctx.bezierCurveTo(side*s*0.006,s*0.13,-side*s*0.004,s*0.1,0,s*0.08);
    ctx.bezierCurveTo(-side*s*0.01,s*0.04,side*s*0.042,0,side*s*0.055,0);
    ctx.fill();
    ctx.strokeStyle='#ccbbaa'; ctx.lineWidth=s*0.008; ctx.stroke();
  });
  ctx.restore();

  // Blood drips from mouth corners
  [mL,mR].forEach(corner => {
    ctx.save();
    ctx.strokeStyle='#8B0000'; ctx.lineWidth=s*0.026; ctx.lineCap='round';
    ctx.shadowColor='#8B0000'; ctx.shadowBlur=5; ctx.globalAlpha=0.9;
    ctx.beginPath();
    ctx.moveTo(corner.x,corner.y);
    ctx.bezierCurveTo(corner.x+2,corner.y+s*0.055,corner.x-2,corner.y+s*0.115,corner.x,corner.y+s*0.16);
    ctx.stroke();
    d.oval(corner.x,corner.y+s*0.16,s*0.019,s*0.019,'#8B0000',0.9);
    ctx.restore();
  });
}

// ── Zombie ─────────────────────────────────────────────────────────────────
export function drawZombie(d: DrawCtx) {
  const { ctx, s, t } = d;
  const fh     = d.pt(10);
  const lEye   = d.eyeCenter('left'), rEye=d.eyeCenter('right');
  const lCheek = d.pt(234), rCheek=d.pt(454);

  // Bloodshot eyes — replace the originals
  [lEye,rEye].forEach(eye => {
    ctx.save(); ctx.translate(eye.x,eye.y);
    // Erase original eye
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.085,s*0.075,0,0,Math.PI*2);
    ctx.fillStyle='black'; ctx.fill();
    ctx.globalCompositeOperation='source-over';
    // Yellowed sclera
    ctx.beginPath(); ctx.ellipse(0,0,s*0.085,s*0.075,0,0,Math.PI*2);
    ctx.fillStyle='#d8d0a0'; ctx.fill();
    // Bloodshot veins
    ctx.strokeStyle='rgba(180,0,0,0.65)'; ctx.lineWidth=1.2;
    for (let k=0;k<8;k++) {
      const a=k*0.8+t*0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*s*0.014,Math.sin(a)*s*0.014);
      ctx.lineTo(Math.cos(a)*s*0.072,Math.sin(a)*s*0.072); ctx.stroke();
    }
    // Grey iris
    ctx.fillStyle='#556644';
    ctx.beginPath(); ctx.arc(0,0,s*0.038,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(0,0,s*0.022,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  // Wound / stitches on cheeks
  [lCheek,rCheek].forEach((ch,ci) => {
    const side=ci===0?-1:1;
    ctx.save(); ctx.translate(ch.x+side*s*0.04,ch.y); ctx.rotate(d.angle+side*0.2);
    ctx.fillStyle='rgba(80,0,0,0.75)';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.1,s*0.032,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2a1205'; ctx.lineWidth=s*0.013;
    for (let k=-2;k<=2;k++) {
      ctx.beginPath(); ctx.moveTo(k*s*0.036,-s*0.034); ctx.lineTo(k*s*0.036,s*0.034); ctx.stroke();
      [-s*0.034,s*0.034].forEach(y => {
        ctx.beginPath(); ctx.moveTo(k*s*0.036-s*0.015,y); ctx.lineTo(k*s*0.036+s*0.015,y); ctx.stroke();
      });
    }
    ctx.restore();
  });

  // Blood drips from forehead
  for (let k=0;k<4;k++) {
    const bx=fh.x+(k-1.5)*s*0.2;
    const dh=d.pseudo(k+20)*s*0.34+s*0.1;
    ctx.save(); ctx.globalAlpha=0.8;
    ctx.fillStyle='#8B0000';
    ctx.beginPath(); ctx.ellipse(bx,fh.y+dh*0.5,s*0.018,dh*0.54,0,0,Math.PI*2); ctx.fill();
    d.oval(bx,fh.y+dh,s*0.02,s*0.02,'#8B0000',0.75);
    ctx.restore();
  }
}

// ── Devil ──────────────────────────────────────────────────────────────────
export function drawDevil(d: DrawCtx) {
  const { ctx, s, angle } = d;
  const lBrow = d.pt(70), rBrow=d.pt(300);
  const lEye  = d.eyeCenter('left'), rEye=d.eyeCenter('right');

  // Horns
  [{ brow:lBrow,side:-1 },{ brow:rBrow,side:1 }].forEach(({ brow,side }) => {
    ctx.save();
    ctx.translate(brow.x-side*s*0.12, brow.y-s*0.04); ctx.rotate(angle+side*0.08);
    const g=ctx.createLinearGradient(-s*0.06,0,s*0.06,-s*0.58);
    g.addColorStop(0,'#8B0000'); g.addColorStop(0.5,'#CC2200'); g.addColorStop(1,'#FF4400');
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(-s*0.066,0); ctx.lineTo(s*0.066,0);
    ctx.bezierCurveTo(s*0.046,-s*0.22,side*s*0.072,-s*0.4,0,-s*0.58);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(80,0,0,0.5)'; ctx.lineWidth=s*0.012; ctx.stroke();
    ctx.restore();
  });

  // Glowing red eyes
  [lEye,rEye].forEach(eye => {
    // Replace eye
    ctx.save(); ctx.translate(eye.x,eye.y); ctx.rotate(angle);
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.09,s*0.08,0,0,Math.PI*2);
    ctx.fillStyle='black'; ctx.fill();
    ctx.globalCompositeOperation='source-over';
    // Red iris
    ctx.beginPath(); ctx.ellipse(0,0,s*0.09,s*0.08,0,0,Math.PI*2);
    ctx.fillStyle='#1a0000'; ctx.fill();
    const ig=ctx.createRadialGradient(0,0,0,0,0,s*0.085);
    ig.addColorStop(0,'rgba(255,40,0,0.75)'); ig.addColorStop(1,'rgba(180,0,0,0.2)');
    ctx.fillStyle=ig; ctx.fill();
    ctx.shadowColor='#FF0000'; ctx.shadowBlur=18;
    ctx.fillStyle='rgba(255,20,0,0.45)'; ctx.fill();
    ctx.restore();
  });
}

// ── Angel ──────────────────────────────────────────────────────────────────
export function drawAngel(d: DrawCtx) {
  const { ctx, s, angle, t } = d;
  const fh   = d.pt(10);
  const lEye = d.eyeCenter('left'), rEye=d.eyeCenter('right');

  // Wings (behind)
  [-1,1].forEach(side => {
    ctx.save();
    ctx.translate(fh.x+side*s*0.05,fh.y+s*0.22); ctx.rotate(angle+side*0.15);
    ctx.globalAlpha=0.45+Math.sin(t*1.5)*0.06;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(side*s*0.9,-s*0.33,side*s*1.22,s*0.5,side*s*0.45,s*0.78);
    ctx.bezierCurveTo(side*s*0.25,s*0.54,0,s*0.3,0,0);
    const wg=ctx.createRadialGradient(side*s*0.4,s*0.2,0,side*s*0.4,s*0.2,s*0.72);
    wg.addColorStop(0,'rgba(255,255,255,0.92)'); wg.addColorStop(0.6,'rgba(255,240,200,0.55)'); wg.addColorStop(1,'transparent');
    ctx.fillStyle=wg; ctx.fill();
    ctx.strokeStyle='rgba(255,240,180,0.42)'; ctx.lineWidth=s*0.014; ctx.stroke();
    ctx.restore();
  });

  // Halo
  ctx.save();
  ctx.translate(fh.x, fh.y-s*0.52); ctx.rotate(angle);
  const hg=ctx.createRadialGradient(0,0,s*0.28,0,0,s*0.52);
  hg.addColorStop(0,'rgba(255,215,0,0)'); hg.addColorStop(0.5,'rgba(255,215,0,0.22)'); hg.addColorStop(1,'transparent');
  ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(0,0,s*0.52,s*0.15,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,215,0,0.94)'; ctx.lineWidth=s*0.056;
  ctx.shadowColor='#FFD700'; ctx.shadowBlur=22;
  ctx.beginPath(); ctx.ellipse(0,0,s*0.4,s*0.11,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();

  // Gold eye shimmer
  [lEye,rEye].forEach(eye => {
    const g=ctx.createRadialGradient(eye.x,eye.y,0,eye.x,eye.y,s*0.11);
    g.addColorStop(0,'rgba(255,215,0,0.42)'); g.addColorStop(1,'transparent');
    ctx.save(); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(eye.x,eye.y,s*0.11,0,Math.PI*2); ctx.fill(); ctx.restore();
  });
}

// ── Alien ──────────────────────────────────────────────────────────────────
export function drawAlien(d: DrawCtx) {
  const { ctx, s, angle, t } = d;
  const fh   = d.pt(10);
  const lEye = d.eyeCenter('left'), rEye=d.eyeCenter('right');
  const mc   = d.mouthCenter();

  // Head glow
  ctx.save(); ctx.translate(fh.x,fh.y-s*0.38); ctx.rotate(angle);
  const dg=ctx.createRadialGradient(0,-s*0.1,0,0,-s*0.08,s*0.65);
  dg.addColorStop(0,'rgba(120,255,120,0.07)'); dg.addColorStop(0.6,'rgba(80,255,80,0.13)'); dg.addColorStop(1,'transparent');
  ctx.fillStyle=dg; ctx.beginPath(); ctx.ellipse(0,-s*0.08,s*0.56,s*0.66,0,0,Math.PI*2); ctx.fill(); ctx.restore();

  // Large black eyes — replace originals
  [lEye,rEye].forEach(eye => {
    ctx.save(); ctx.translate(eye.x,eye.y); ctx.rotate(angle);
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.16,s*0.11,0,0,Math.PI*2);
    ctx.fillStyle='black'; ctx.fill();
    ctx.globalCompositeOperation='source-over';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.16,s*0.11,0,0,Math.PI*2);
    ctx.fillStyle='#030810'; ctx.fill();
    const g=ctx.createRadialGradient(-s*0.04,-s*0.03,0,0,0,s*0.14);
    g.addColorStop(0,'rgba(80,255,100,0.35)'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fill();
    ctx.fillStyle='rgba(180,255,180,0.48)';
    ctx.beginPath(); ctx.ellipse(-s*0.04,-s*0.03,s*0.032,s*0.022,-0.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  // Bioluminescent dots
  for (let k=0;k<8;k++) {
    const a=(k/8)*Math.PI*2+t*0.45;
    const px=fh.x+Math.cos(a)*s*0.32, py=fh.y-s*0.1+Math.sin(a)*s*0.15;
    ctx.save(); ctx.globalAlpha=0.45+Math.sin(t*2.5+k)*0.3;
    ctx.fillStyle='#00FF80'; ctx.shadowColor='#00FF80'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(px,py,s*0.015,0,Math.PI*2); ctx.fill(); ctx.restore();
  }

  // Thin slit mouth
  ctx.save(); ctx.translate(mc.x,mc.y); ctx.rotate(angle);
  // Erase original mouth area
  ctx.globalCompositeOperation='destination-out';
  ctx.beginPath(); ctx.ellipse(0,0,s*0.1,s*0.04,0,0,Math.PI*2);
  ctx.fillStyle='black'; ctx.fill();
  ctx.globalCompositeOperation='source-over';
  ctx.beginPath(); ctx.ellipse(0,0,s*0.075,s*0.016,0,0,Math.PI*2);
  ctx.fillStyle='#003300'; ctx.fill();
  ctx.restore();
}
