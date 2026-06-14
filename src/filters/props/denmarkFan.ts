import type { DrawCtx } from '../DrawCtx';

// ════════════════════════════════════════════════════════════════════════
//  Danmark fan — the Danish flag + football image painted on both cheeks.
//
//  Works like the AGF fan: the PNG is stamped on each cheek, tracking the
//  face (position from the cheek landmarks, size from the inter-ocular
//  distance, rotation from head roll). It is drawn with a `multiply` blend at
//  partial opacity so the skin shading shows through underneath — it reads as
//  face paint rather than a sticker floating in front of the cheek.
//
//  The image on the LEFT cheek is mirrored horizontally so the two cheeks are
//  symmetric about the nose.
// ════════════════════════════════════════════════════════════════════════

// Cheek "apple" landmarks (MediaPipe FaceMesh): one on each cheekbone, below
// the eye and outside the nose — where supporters paint a flag.
const CHEEK_LEFT = 50;
const CHEEK_RIGHT = 280;

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

  const { ctx } = d;
  const aspect = img.naturalWidth / img.naturalHeight || 1;

  // Image height relative to face scale (inter-ocular distance). Keep it modest
  // so it sits ON the cheek apple.
  const h = d.s * 1.05 * 0.5 * 0.5;
  const w = h * aspect;

  // Nudge each stamp a little toward the face centre so they sit closer to the
  // nose rather than out on the cheekbones.
  const INWARD = 0.15;
  // Outward tilt (~15°) so each flag follows the cheek and looks painted on.
  const TILT = 0.26;
  const fc = d.faceCenter();

  for (const idx of [CHEEK_LEFT, CHEEK_RIGHT]) {
    const p = d.pt(idx);
    const c = {
      x: p.x + (fc.x - p.x) * INWARD,
      y: p.y + (fc.y - p.y) * INWARD,
    };

    ctx.save();
    // Keep the paint on the face — clip to the face oval so it never spills off
    // the jaw or into the background.
    d.clipToFace(1.0);

    // Normal blend at full opacity so the flag's white cross renders as white
    // (a multiply blend would turn white into the skin tone and hide it).
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    ctx.translate(c.x, c.y);
    ctx.rotate(d.angle + Math.PI);    // follow head roll, rotated 180°
    // Tilt each stamp outward so it sits along the cheek and reads as painted on
    // (mirrored direction per side).
    const side = idx === CHEEK_LEFT ? -1 : 1;
    ctx.rotate(side * TILT);
    // Mirror both stamps horizontally.
    ctx.scale(-1, 1);
    // The left stamp is additionally flipped 180°.
    if (idx === CHEEK_LEFT) ctx.rotate(Math.PI);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
