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

// Watercolour work buffers, cached across frames and reallocated only when the
// frame size changes — avoids multi-MB allocations on every rendered frame.
// The Kuwahara stage runs at HALF resolution (¼ the pixels) and is upscaled
// back, which is ~4× faster than working at full res.
let _wcW = 0, _wcH = 0, _wcHW = 0, _wcHH = 0;
let _wcDR: Float32Array, _wcDG: Float32Array, _wcDB: Float32Array;     // half-res downsample
let _wcSatR: Float64Array, _wcSatG: Float64Array, _wcSatB: Float64Array;
let _wcSatL: Float64Array, _wcSatL2: Float64Array;
let _wcHOut: Float32Array;                                              // half-res simplified RGB
let _wcTmp: Uint8ClampedArray;                                         // full-res copy for pass 2
let _wcLuma: Float32Array;                                             // full-res luminance for edges
let _wcOut: Uint8ClampedArray;                                        // cached full-res output
let _wcResult: ImageData;                                             // cached ImageData wrapper
let _wcFrame = 0;                                                     // frame counter for temporal reuse

export function pxWatercolor(src: Uint8ClampedArray, W: number, H: number): ImageData {
  // Professional watercolour pipeline:
  //   1. Kuwahara filter — replaces each pixel with the mean colour of the most
  //      homogeneous of four overlapping sub-regions. This flattens the image
  //      into painted washes while keeping edges crisp (the painterly hallmark).
  //   2. Saturation boost + a wash toward paper-white for luminous, airy tones.
  //   3. Edge darkening — pigment pools and dries darker where washes meet.
  //   4. Paper grain — subtle granulation so it reads as pigment on paper.
  //
  // Performance: the simplification runs at half resolution using summed-area
  // tables (region means/variances are O(1) regardless of window radius), then
  // is bilinearly upscaled. On top of that, the whole result is recomputed only
  // every 2nd frame and reused in between — a watercolour wash is abstract
  // enough that this temporal reuse is imperceptible but halves the CPU cost.
  const hw=(W+1)>>1, hh=(H+1)>>1;  // half-res dimensions (ceil)
  const r=2;                       // Kuwahara radius at half res (~4 px at full res)
  const sw=hw+1, ssz=sw*(hh+1);

  const dimsChanged=_wcW!==W||_wcH!==H;
  if (dimsChanged) {
    _wcDR=new Float32Array(hw*hh); _wcDG=new Float32Array(hw*hh); _wcDB=new Float32Array(hw*hh);
    _wcSatR=new Float64Array(ssz); _wcSatG=new Float64Array(ssz); _wcSatB=new Float64Array(ssz);
    _wcSatL=new Float64Array(ssz); _wcSatL2=new Float64Array(ssz);
    _wcHOut=new Float32Array(hw*hh*3);
    _wcTmp=new Uint8ClampedArray(src.length);
    _wcLuma=new Float32Array(W*H);
    _wcOut=new Uint8ClampedArray(src.length);
    _wcResult=new ImageData(_wcOut,W,H);
    _wcW=W; _wcH=H; _wcHW=hw; _wcHH=hh;
    _wcFrame=0;
  }

  // Temporal reuse — recompute every 2nd frame, reuse the cached wash otherwise.
  _wcFrame++;
  if (!dimsChanged && (_wcFrame&1)===0) return _wcResult;

  const out=_wcOut;
  const DR=_wcDR, DG=_wcDG, DB=_wcDB;
  const SR=_wcSatR, SG=_wcSatG, SB=_wcSatB, SL=_wcSatL, SL2=_wcSatL2;
  const HOut=_wcHOut;

  // Stage 1 — box-downsample the source into half-res R,G,B (also anti-aliases).
  for (let hy=0;hy<hh;hy++) {
    const ys0=hy<<1, ys1=ys0+1<H?ys0+1:H-1;
    for (let hx=0;hx<hw;hx++) {
      const xs0=hx<<1, xs1=xs0+1<W?xs0+1:W-1;
      const a=(ys0*W+xs0)*4, b=(ys0*W+xs1)*4, c=(ys1*W+xs0)*4, e=(ys1*W+xs1)*4;
      const di=hy*hw+hx;
      DR[di]=(src[a]  +src[b]  +src[c]  +src[e])  *0.25;
      DG[di]=(src[a+1]+src[b+1]+src[c+1]+src[e+1])*0.25;
      DB[di]=(src[a+2]+src[b+2]+src[c+2]+src[e+2])*0.25;
    }
  }

  // Build summed-area tables for R,G,B (region means) and L,L² (region variance).
  for (let y=0;y<hh;y++) {
    for (let x=0;x<hw;x++) {
      const di=y*hw+x;
      const rr=DR[di], gg=DG[di], bb2=DB[di];
      const lv=0.299*rr+0.587*gg+0.114*bb2;
      const cur=(y+1)*sw+(x+1), up=y*sw+(x+1), lf=(y+1)*sw+x, dg=y*sw+x;
      SR[cur] =rr      +SR[up] +SR[lf] -SR[dg];
      SG[cur] =gg      +SG[up] +SG[lf] -SG[dg];
      SB[cur] =bb2     +SB[up] +SB[lf] -SB[dg];
      SL[cur] =lv      +SL[up] +SL[lf] -SL[dg];
      SL2[cur]=lv*lv   +SL2[up]+SL2[lf]-SL2[dg];
    }
  }

  // Stage 2 — Kuwahara at half res, writing simplified washes into HOut.
  const sat=1.25;
  for (let y=0;y<hh;y++) {
    const y0=y-r<0?0:y-r, y1=y+r>=hh?hh-1:y+r, ym=y;
    for (let x=0;x<hw;x++) {
      const x0=x-r<0?0:x-r, x1=x+r>=hw?hw-1:x+r, xm=x;
      let bestVar=Infinity, br=0, bg=0, bbv=0;
      for (let q=0;q<4;q++) {
        const ax=q&1?xm:x0, bx=q&1?x1:xm;
        const ay=q&2?ym:y0, by=q&2?y1:ym;
        const n=(bx-ax+1)*(by-ay+1);
        const A=ay*sw+ax, B=ay*sw+(bx+1), C=(by+1)*sw+ax, D=(by+1)*sw+(bx+1);
        const sl =SL[D] -SL[B] -SL[C] +SL[A];
        const sl2=SL2[D]-SL2[B]-SL2[C]+SL2[A];
        const mean=sl/n;
        const variance=sl2/n-mean*mean;
        if (variance<bestVar) {
          bestVar=variance;
          br =(SR[D]-SR[B]-SR[C]+SR[A])/n;
          bg =(SG[D]-SG[B]-SG[C]+SG[A])/n;
          bbv=(SB[D]-SB[B]-SB[C]+SB[A])/n;
        }
      }
      // Saturate around the region's own luminance, then wash toward paper.
      const lv=0.299*br+0.587*bg+0.114*bbv;
      const o=(y*hw+x)*3;
      HOut[o]  =(lv+(br -lv)*sat)*0.88+30.6;
      HOut[o+1]=(lv+(bg -lv)*sat)*0.88+30.6;
      HOut[o+2]=(lv+(bbv-lv)*sat)*0.88+30.6;
    }
  }

  // Stage 3 — bilinear upscale HOut back to full res into out.
  for (let y=0;y<H;y++) {
    const fy=(y-0.5)*0.5, gy0=Math.floor(fy);
    const wy=fy-gy0;
    const yA=gy0<0?0:gy0>=hh?hh-1:gy0, yB=gy0+1<0?0:gy0+1>=hh?hh-1:gy0+1;
    for (let x=0;x<W;x++) {
      const fx=(x-0.5)*0.5, gx0=Math.floor(fx);
      const wx=fx-gx0;
      const xA=gx0<0?0:gx0>=hw?hw-1:gx0, xB=gx0+1<0?0:gx0+1>=hw?hw-1:gx0+1;
      const i00=(yA*hw+xA)*3, i10=(yA*hw+xB)*3, i01=(yB*hw+xA)*3, i11=(yB*hw+xB)*3;
      const w00=(1-wx)*(1-wy), w10=wx*(1-wy), w01=(1-wx)*wy, w11=wx*wy;
      const di=(y*W+x)*4;
      out[di]  =clamp(HOut[i00]  *w00+HOut[i10]  *w10+HOut[i01]  *w01+HOut[i11]  *w11);
      out[di+1]=clamp(HOut[i00+1]*w00+HOut[i10+1]*w10+HOut[i01+1]*w01+HOut[i11+1]*w11);
      out[di+2]=clamp(HOut[i00+2]*w00+HOut[i10+2]*w10+HOut[i01+2]*w01+HOut[i11+2]*w11);
      out[di+3]=255;
    }
  }

  // Stage 4 — full-res edge pooling + paper grain, reading from the upscaled wash.
  // Luminance is precomputed once into a flat array so the Sobel kernel reads
  // direct array slots instead of recomputing weighted RGB nine times per pixel.
  const tmp=_wcTmp; tmp.set(out);
  const luma=_wcLuma;
  for (let p=0,q=0;q<luma.length;p+=4,q++) luma[q]=0.299*tmp[p]+0.587*tmp[p+1]+0.114*tmp[p+2];
  const pseudo=(k:number)=>{ const v=Math.sin(k*127.1+311.7)*43758.5453; return v-Math.floor(v); };
  for (let y=1;y<H-1;y++) {
    const rowU=(y-1)*W, rowM=y*W, rowD=(y+1)*W;
    for (let x=1;x<W-1;x++) {
      const gx=luma[rowU+x+1]+2*luma[rowM+x+1]+luma[rowD+x+1]-(luma[rowU+x-1]+2*luma[rowM+x-1]+luma[rowD+x-1]);
      const gy=luma[rowD+x-1]+2*luma[rowD+x]+luma[rowD+x+1]-(luma[rowU+x-1]+2*luma[rowU+x]+luma[rowU+x+1]);
      const mag=Math.sqrt(gx*gx+gy*gy);
      const edge=Math.min(mag/90,1)*0.5;            // 0 flat → 0.5 at strong edges
      const grain=1+(pseudo(x*1.7+y*3.3)-0.5)*0.05; // subtle paper granulation
      const f=(1-edge)*grain;
      const i=(rowM+x)*4;
      out[i]=clamp(tmp[i]*f); out[i+1]=clamp(tmp[i+1]*f); out[i+2]=clamp(tmp[i+2]*f);
    }
  }
  return _wcResult;
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

export function pxMeltFace(src: Uint8ClampedArray, W: number, H: number, t: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  const startY=Math.floor(H*0.22);
  for (let y=0;y<startY;y++) {
    const row=y*W*4;
    out.set(src.subarray(row,row+W*4),row);
  }
  for (let y=startY;y<H;y++) {
    const prog=(y-startY)/(H-startY);
    const dripMax=prog*prog*H*0.38;
    for (let x=0;x<W;x++) {
      const col=(Math.sin(x*0.065+t*0.75)*0.5+0.5);
      const shift=Math.floor(dripMax*(0.35+col*0.65));
      const sy=Math.max(0,y-shift);
      const si=(sy*W+x)*4, di=(y*W+x)*4;
      out[di]=src[si];out[di+1]=src[si+1];out[di+2]=src[si+2];out[di+3]=src[si+3];
    }
  }
  return new ImageData(out,W,H);
}

export function pxPencilSketch(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  const gray=new Float32Array(W*H);
  for (let i=0;i<W*H;i++) gray[i]=lum(src[i*4],src[i*4+1],src[i*4+2]);
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++) {
    const gx=(gray[y*W+x+1]-gray[y*W+x-1])*2+(gray[(y-1)*W+x+1]-gray[(y-1)*W+x-1])+(gray[(y+1)*W+x+1]-gray[(y+1)*W+x-1]);
    const gy=(gray[(y+1)*W+x]-gray[(y-1)*W+x])*2+(gray[(y+1)*W+x+1]-gray[(y-1)*W+x+1])+(gray[(y+1)*W+x-1]-gray[(y-1)*W+x-1]);
    const edge=clamp(Math.sqrt(gx*gx+gy*gy)*1.2);
    // White paper bg with dark pencil lines; slight warm tint
    const v=clamp(255-edge);
    const paper=clamp(gray[y*W+x]*0.12+210);
    const final=Math.min(v,paper);
    const di=(y*W+x)*4;
    out[di]=clamp(final+4);out[di+1]=clamp(final+2);out[di+2]=final;out[di+3]=255;
  }
  return new ImageData(out,W,H);
}

export function pxKaleidoscope(src: Uint8ClampedArray, W: number, H: number): ImageData {
  const out=new Uint8ClampedArray(src.length);
  const cx=W>>1;
  // Mirror only horizontally around the face centre so the person stays visible.
  // Right half becomes a mirror of the left half; top/bottom are unchanged.
  for (let y=0;y<H;y++) {
    for (let x=0;x<W;x++) {
      const sx=x<cx?x:W-1-x;
      const si=(y*W+sx)*4, di=(y*W+x)*4;
      out[di]=src[si];out[di+1]=src[si+1];out[di+2]=src[si+2];out[di+3]=src[si+3];
    }
  }
  return new ImageData(out,W,H);
}
