import type { DrawCtx } from '../DrawCtx';

// ════════════════════════════════════════════════════════════════════════
//  AGF fan — the AGF Aarhus crest painted on both cheeks.
//
//  The crest PNG is stamped on each cheek, tracking the face (position from the
//  cheek landmarks, size from the inter-ocular distance, rotation from head
//  roll). It is drawn with a `multiply` blend at partial opacity so the skin
//  shading shows through underneath — it reads as face paint rather than a
//  sticker floating in front of the cheek.
// ════════════════════════════════════════════════════════════════════════

// Cheek "apple" landmarks (MediaPipe FaceMesh): one on each cheekbone, below
// the eye and outside the nose — where supporters paint a club crest.
const CHEEK_LEFT = 50;
const CHEEK_RIGHT = 280;

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

  const { ctx } = d;
  const aspect = img.naturalWidth / img.naturalHeight || 1;

  // Crest height relative to face scale (inter-ocular distance). Cheeks are
  // smaller than the forehead, so keep it modest so it sits ON the cheek.
  // 50% of the previous size so it sits as a small crest on the cheek apple.
  const h = d.s * 1.05 * 0.5;
  const w = h * aspect;

  // Nudge each crest a little toward the face centre so they sit closer to the
  // nose rather than out on the cheekbones.
  const INWARD = 0.15;
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

    // Painted-on look: multiply lets the skin's shading/tone show through the
    // crest, and partial alpha keeps the cheek visible behind it.
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.78;

    ctx.translate(c.x, c.y);
    ctx.rotate(d.angle + Math.PI);    // follow head roll, rotated 180°
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
