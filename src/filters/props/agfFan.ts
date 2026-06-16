import type { DrawCtx } from '../DrawCtx';
import { paintOnCheeks } from './cheekPaint';

// ════════════════════════════════════════════════════════════════════════
//  AGF fan — the AGF Aarhus crest painted realistically on both cheeks via the
//  shared cheek-paint renderer (luminance multiply, feather, skin texture,
//  highlight, subtle cheek deformation, clipped to the cheeks). The crest is a
//  logo, so it is NOT mirrored — both cheeks read the right way round.
// ════════════════════════════════════════════════════════════════════════

let img: HTMLImageElement | null = null;
let ready = false;

function ensureImage() {
  if (img) return;
  img = new Image();
  img.onload = () => { ready = true; };
  img.src = `${import.meta.env.BASE_URL}images/agf_fan.png`;
}

export function drawAgfFan(d: DrawCtx): void {
  ensureImage();
  if (!ready || !img) return;
  paintOnCheeks(d, img, { flipCheek: 'none', tilt: 0.16, inward: 0.15, heightScale: 0.525, opacity: 0.75 });
}
