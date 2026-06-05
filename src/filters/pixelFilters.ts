function lum(r: number, g: number, b: number) { return 0.299*r+0.587*g+0.114*b; }
function clamp(v: number) { return v<0?0:v>255?255:v; }

export function pxNeon(src: Uint8ClampedArray, W: number, H: number, t: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  const hsl2rgb=(h:number,s:number,l:number)=>{
    const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
    const h2r=(p:number,q:number,t:number)=>{ if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; };
    return [h2r(p,q,h+1/3)*255,h2r(p,q,h)*255,h2r(p,q,h-1/3)*255];
  };
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    const i=(y*W+x)*4;
    const gx=src[(y*W+x+1)*4]-src[(y*W+x-1)*4];
    const gy=src[((y+1)*W+x)*4]-src[((y-1)*W+x)*4];
    const mag=Math.min(Math.sqrt(gx*gx+gy*gy)/50,1);
    if (mag>0.1) {
      const angle=Math.atan2(gy,gx);
      const hue=((angle/Math.PI+1)/2+t*0.1)%1;
      const rgb=hsl2rgb(hue,1,0.55);
      const boost=mag*4;
      out[i]=clamp(src[i]*0.07+rgb[0]*boost); out[i+1]=clamp(src[i+1]*0.07+rgb[1]*boost); out[i+2]=clamp(src[i+2]*0.07+rgb[2]*boost);
    } else { out[i]=src[i]*0.07; out[i+1]=src[i+1]*0.07; out[i+2]=src[i+2]*0.07; }
    out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxGlitch(src: Uint8ClampedArray, W: number, H: number, t: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  const pseudo=(n:number)=>{ const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
  const seed=Math.floor(t*8);
  const slices=Array.from({length:12},(_,s)=>({
    y:(pseudo(seed*17+s*7)*H)|0,
    sh:((pseudo(seed*3+s*13)-0.5)*80)|0,
    h:(pseudo(seed*5+s)*28+3)|0,
  }));
  for (let y=0;y<H;y++) {
    let rs=0;
    for (const sl of slices) if (y>=sl.y&&y<sl.y+sl.h) { rs=sl.sh; break; }
    for (let x=0;x<W;x++) {
      const i=(y*W+x)*4;
      const xR=Math.min(Math.max(x+rs+16,0),W-1);
      const xG=Math.min(Math.max(x+rs,0),W-1);
      const xB=Math.min(Math.max(x+rs-16,0),W-1);
      out[i]=src[(y*W+xR)*4]; out[i+1]=src[(y*W+xG)*4+1]; out[i+2]=src[(y*W+xB)*4+2];
      if (y%3===0) { out[i]*=0.58; out[i+1]*=0.58; out[i+2]*=0.58; }
      if (pseudo(x*1.3+y*0.7+t*99)>0.998) out[i]=out[i+1]=out[i+2]=255;
      out[i+3]=255;
    }
  }
  return new ImageData(out,W,H);
}

export function pxThermal(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const pal=[[0,0,0],[32,0,96],[192,0,0],[255,128,0],[255,255,0],[255,255,255]];
  const stops=[0,0.2,0.45,0.7,0.88,1.0];
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const v=Math.pow(lum(src[i],src[i+1],src[i+2])/255,0.8);
    let c=pal[pal.length-1];
    for (let k=1;k<stops.length;k++) if (v<=stops[k]) {
      const tt=(v-stops[k-1])/(stops[k]-stops[k-1]);
      const a=pal[k-1],b=pal[k];
      c=[a[0]+(b[0]-a[0])*tt,a[1]+(b[1]-a[1])*tt,a[2]+(b[2]-a[2])*tt]; break;
    }
    out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxZombie(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const l=lum(src[i],src[i+1],src[i+2]);
    out[i]=clamp(l*0.45+src[i]*0.12+8); out[i+1]=clamp(l*0.72+src[i+1]*0.35); out[i+2]=clamp(l*0.28+src[i+2]*0.06); out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxVampire(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const l=lum(src[i],src[i+1],src[i+2]);
    out[i]=clamp(l*0.55+src[i]*0.52+18); out[i+1]=clamp(l*0.52+src[i+1]*0.48+12); out[i+2]=clamp(l*0.58+src[i+2]*0.55+28); out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxCyberpunk(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const l=lum(src[i],src[i+1],src[i+2]); const boost=l>128?1:0;
    out[i]=clamp(src[i]*0.68+boost*src[i]*0.35+6); out[i+1]=clamp(src[i+1]*0.72+src[i+1]*0.06+14); out[i+2]=clamp(src[i+2]*0.88+(1-boost)*32+20); out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxNoir(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const v=clamp((lum(src[i],src[i+1],src[i+2])-128)*1.5+128);
    out[i]=out[i+1]=out[i+2]=v; out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxCartoon(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  const Q=48; // colour quantisation
  for (let i=0;i<src.length;i+=4) {
    out[i]=Math.round(src[i]/Q)*Q; out[i+1]=Math.round(src[i+1]/Q)*Q; out[i+2]=Math.round(src[i+2]/Q)*Q; out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxWatercolor(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    out[i]=clamp(src[i]*0.65+(255-src[i])*0.28+12);
    out[i+1]=clamp(src[i+1]*0.65+(255-src[i+1])*0.28+12);
    out[i+2]=clamp(src[i+2]*0.65+(255-src[i+2])*0.28+12);
    out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxOilPaint(src: Uint8ClampedArray, W: number, H: number): ImageData {
  // Simplified oil: heavy colour quantisation + mild saturation boost
  const out=new Uint8ClampedArray(src.length);
  const Q=36;
  for (let i=0;i<src.length;i+=4) {
    const r=Math.round(src[i]/Q)*Q, g2=Math.round(src[i+1]/Q)*Q, b=Math.round(src[i+2]/Q)*Q;
    const l=lum(r,g2,b);
    out[i]=clamp(l+(r-l)*1.35); out[i+1]=clamp(l+(g2-l)*1.35); out[i+2]=clamp(l+(b-l)*1.35); out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxNightVision(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const l=lum(src[i],src[i+1],src[i+2]);
    const bright=clamp(l*1.6);
    out[i]=clamp(bright*0.12); out[i+1]=clamp(bright*1.0); out[i+2]=clamp(bright*0.18); out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxHologram(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const l=lum(src[i],src[i+1],src[i+2]);
    out[i]=clamp(l*0.08); out[i+1]=clamp(l*0.55+30); out[i+2]=clamp(l*0.65+50); out[i+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxInfrared(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const pal=[[0,0,64],[0,0,200],[0,150,255],[0,255,150],[255,255,0],[255,128,0],[255,0,0],[255,200,200]];
  const stops=[0,0.1,0.25,0.45,0.62,0.78,0.9,1.0];
  const out=new Uint8ClampedArray(src.length);
  for (let i=0;i<src.length;i+=4) {
    const v=lum(src[i],src[i+1],src[i+2])/255;
    let c=pal[pal.length-1];
    for (let k=1;k<stops.length;k++) if (v<=stops[k]) {
      const tt=(v-stops[k-1])/(stops[k]-stops[k-1]);
      const a=pal[k-1],b=pal[k];
      c=[a[0]+(b[0]-a[0])*tt,a[1]+(b[1]-a[1])*tt,a[2]+(b[2]-a[2])*tt]; break;
    }
    out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=255;
  }
  return new ImageData(out,W,H);
}
