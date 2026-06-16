import type { DrawCtx } from '../DrawCtx';
import { paintOnCheeks } from './cheekPaint';

// ════════════════════════════════════════════════════════════════════════
//  Danmark fan — the Danish flag painted realistically on both cheeks via the
//  shared cheek-paint renderer (luminance multiply, feather, skin texture,
//  highlight, subtle cheek deformation, clipped to the cheeks). The flag is
//  mirrored so the two cheeks are symmetric about the nose.
// ════════════════════════════════════════════════════════════════════════

let img: HTMLImageElement | null = null;
let ready = false;

function ensureImage() {
  if (img) return;
  img = new Image();
  img.onload = () => { ready = true; };
  img.src = `${import.meta.env.BASE_URL}images/denmark_fan.png`;
}

export function drawDenmarkFan(d: DrawCtx): void {
  ensureImage();
  if (!ready || !img) return;
  paintOnCheeks(d, img, { flipCheek: 'right', bowDir: -1, tilt: 0.16, inward: 0.15, heightScale: 0.2625, opacity: 0.75 });
}
