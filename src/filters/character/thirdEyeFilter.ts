import { DrawCtx } from '../DrawCtx';

/**
 * Third eye — instead of drawing a synthetic eye, this copies the person's OWN
 * eye from the live frame and stamps it on the forehead. Because it is sampled
 * every frame, the third eye blinks and moves exactly like the real eyes.
 *
 * Steps: take the bounding box around one real eye, scale it up a little onto an
 * offscreen canvas, feather it to an elliptical alpha matte so the edges melt
 * into the skin, then composite it onto the middle of the forehead.
 */

// Landmarks ringing the person's left eye (used for the source bounding box).
const EYE_IDS = [33, 133, 159, 145, 160, 158, 153, 144, 157, 173, 246, 7];

let oc: HTMLCanvasElement | null = null;
let octx: CanvasRenderingContext2D | null = null;

export function drawThirdEye(d: DrawCtx) {
  const { ctx, s } = d;

  // Forehead centre — midway between the brow point and the hairline.
  const brow = d.pt(9), hair = d.pt(10);
  const cx = (brow.x + hair.x) / 2;
  const cy = (brow.y + hair.y) / 2;

  // Source bounding box around the real eye, with padding.
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const id of EYE_IDS) {
    const p = d.pt(id);
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
  }
  const padX = (maxx - minx) * 0.35;
  const padY = (maxy - miny) * 0.85;
  const sx = Math.max(0, minx - padX);
  const sy = Math.max(0, miny - padY);
  const sw = Math.min(d.W, maxx + padX) - sx;
  const sh = Math.min(d.H, maxy + padY) - sy;
  if (sw <= 2 || sh <= 2) return;

  // Destination size — scale the eye up so it reads as a prominent third eye.
  const scale = (s * 0.72) / sw;
  const dw = sw * scale, dh = sh * scale;
  const W = Math.max(2, Math.ceil(dw)), H = Math.max(2, Math.ceil(dh));

  if (!oc) { oc = document.createElement('canvas'); octx = oc.getContext('2d'); }
  if (!octx) return;
  if (oc.width !== W || oc.height !== H) { oc.width = W; oc.height = H; }

  try {
    octx.clearRect(0, 0, W, H);
    octx.globalCompositeOperation = 'source-over';
    octx.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, W, H);

    // Feather to an elliptical alpha matte so the edges blend into the skin.
    octx.globalCompositeOperation = 'destination-in';
    octx.save();
    octx.translate(W / 2, H / 2);
    octx.scale(1, H / W);
    const r = W * 0.5;
    const g = octx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    octx.fillStyle = g;
    octx.beginPath(); octx.arc(0, 0, r, 0, Math.PI * 2); octx.fill();
    octx.restore();
    octx.globalCompositeOperation = 'source-over';

    // Stamp onto the forehead. No extra rotation — the sampled pixels already
    // carry the head's tilt, so the third eye matches the real eyes.
    ctx.save();
    ctx.drawImage(oc, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
  } catch (_) { /* tainted-canvas guard */ }
}
