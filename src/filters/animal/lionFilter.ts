import type { DrawCtx } from '../DrawCtx';

// ════════════════════════════════════════════════════════════════════════
//  Løve — two lion ears and a muzzle/snout stamped onto the face.
//
//  The artwork (Lion_2.png) is a transparent PNG: just the two ears and the
//  muzzle, cut out on transparency, so the person's real face shows through the
//  gaps — like the Wild Man filter.
//
//  Each piece is placed INDEPENDENTLY (its own sprite, its own anchor):
//    • the snout is pinned onto the person's nose;
//    • each ear is pinned to about the MIDDLE of the forehead, off to its side.
//  Everything is scaled by face width and rolled with the head.
// ════════════════════════════════════════════════════════════════════════

// Source rectangles inside Lion_2.png (400×305), measured from the alpha channel.
const LEFT_EAR  = { sx: 63,  sy: 12,  sw: 97,  sh: 91 };
const RIGHT_EAR = { sx: 240, sy: 12,  sw: 97,  sh: 91 };
const SNOUT     = { sx: 60,  sy: 161, sw: 284, sh: 134 };

// Anchor points inside the artwork (px): the lion's nose centre, and each ear's
// centroid — the exact pixel that gets pinned to the face.
const IMG_NOSE = { x: 0.501 * 400, y: 0.740 * 305 };
const EAR_C_L  = { x: 102, y: 52 };
const EAR_C_R  = { x: 297, y: 52 };

// Tuning:
//   LION_REF_W — artwork width (px) mapped onto one face width; bigger → smaller lion.
//   NOSE_LIFT  — lift the snout up the face axis (fraction of face height).
//   FOREHEAD_H — ear height above the eye line (fraction of face height) — up at the hairline.
//   EAR_X      — ear spread out from the face centre (fraction of face width).
//   EAR_BIG    — extra size for the ears only (1.0 = same scale as the snout).
const LION_REF_W = 273;
const NOSE_LIFT  = -0.02;
const FOREHEAD_H = 0.46;
const EAR_X      = 0.33;
const EAR_BIG    = 1.08;

let img: HTMLImageElement | null = null;
let ready = false;

function ensureImage() {
  if (img) return;
  img = new Image();
  img.onload = () => { ready = true; };
  img.src = `${import.meta.env.BASE_URL}images/Lion_2.png`;
}

export function drawLion(d: DrawCtx): void {
  ensureImage();
  if (!ready || !img) return;

  const { ctx } = d;

  // Face frame: eye line (mid + "right" direction), the up-the-face axis
  // (chin→brow), cheek width (scale) and the nose tip (snout pin).
  const lEye = d.eyeCenter('left'), rEye = d.eyeCenter('right');
  const eyeMid = { x: (lEye.x + rEye.x) / 2, y: (lEye.y + rEye.y) / 2 };

  const brow = d.pt(10), chin = d.pt(152);
  const faceHeight = Math.hypot(brow.x - chin.x, brow.y - chin.y) || 1;
  const up = { x: (brow.x - chin.x) / faceHeight, y: (brow.y - chin.y) / faceHeight };
  // Horizontal unit vector that reliably points to SCREEN-RIGHT, derived from the
  // up-axis (perpendicular). Using the eye order instead is ambiguous because the
  // mirrored selfie view flips which eye is which — that's what swapped the ears.
  const rgt = { x: -up.y, y: up.x };

  const cheekL = d.pt(234), cheekR = d.pt(454);
  const faceWidth = Math.hypot(cheekR.x - cheekL.x, cheekR.y - cheekL.y) || 1;
  const noseTip = d.pt(1);

  const scale = faceWidth / LION_REF_W;

  // Draw one source rectangle so its image-anchor (ax,ay) lands on the world point
  // (wx,wy), scaled by `scale` and rolled by the head. +Math.PI matches the Wild
  // Man stamp's convention so the artwork is upright on an upright face.
  const stamp = (r: { sx: number; sy: number; sw: number; sh: number },
                 ax: number, ay: number, wx: number, wy: number, s = scale) => {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(d.angle + Math.PI);
    ctx.scale(s, s);
    ctx.translate(-ax, -ay);
    ctx.drawImage(img!, r.sx, r.sy, r.sw, r.sh, r.sx, r.sy, r.sw, r.sh);
    ctx.restore();
  };

  // Snout on the (slightly lifted) nose.
  stamp(SNOUT, IMG_NOSE.x, IMG_NOSE.y,
        noseTip.x + up.x * NOSE_LIFT * faceHeight,
        noseTip.y + up.y * NOSE_LIFT * faceHeight);

  // Each ear high on the forehead (~hairline), spread out to its own side. The
  // image-LEFT ear goes to SCREEN-LEFT (−rgt) and the image-RIGHT ear to
  // SCREEN-RIGHT (+rgt) so each ear points outward.
  const fmx = eyeMid.x + up.x * FOREHEAD_H * faceHeight;
  const fmy = eyeMid.y + up.y * FOREHEAD_H * faceHeight;
  const ox = EAR_X * faceWidth;
  stamp(LEFT_EAR,  EAR_C_L.x, EAR_C_L.y, fmx - rgt.x * ox, fmy - rgt.y * ox, scale * EAR_BIG);
  stamp(RIGHT_EAR, EAR_C_R.x, EAR_C_R.y, fmx + rgt.x * ox, fmy + rgt.y * ox, scale * EAR_BIG);
}
