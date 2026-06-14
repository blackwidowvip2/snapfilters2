import { DrawCtx } from './DrawCtx';
import {
  pxNeon, pxGlitch, pxThermal, pxZombie, pxVampire, pxCyberpunk,
  pxNoir, pxCartoon, pxWatercolor, pxOilPaint, pxNightVision, pxHologram, pxInfrared,
  pxMeltFace, pxPencilSketch, pxKaleidoscope, pxBlack,
} from './pixelFilters';
import { drawDog }   from './animal/dog';
import { drawCat }   from './animal/cat';
import { drawBunny } from './animal/bunny';
import { drawFox }   from './animal/fox';
import { drawLion }  from './animal/lion';
import { drawLipRed, drawLipPink, drawEyeshadowSmoky, drawEyeshadowGlam, drawFullGlam } from './makeup/index';
import { drawClown } from './makeup/clownFilter';
import { drawAgfFan } from './props/agfFan';
import { drawVampire, drawZombie, drawDevil, drawAngel, drawAlien, drawAlienFace, pxBigEyes, pxBigMouth, pxWideLips, pxAlienHead, pxVerticalScale, pxSlimFace, pxSwirlFace, drawThirdEye } from './character/index';
import { drawNeonOverlay, drawCyberpunk, drawGold, drawCartoon, drawNoir, drawWatercolor, drawOilPaint, drawNightVision, drawHologram, drawInfrared, drawNeonOutline } from './style/index';
import type { LandmarkList } from '../types';

// Filters that skip pixel processing (canvas overlay only)
const NO_PIXEL = new Set([
  'none','dog','cat','bunny','fox','lion',
  'lip_red','lip_pink','eyeshadow_smoky','eyeshadow_glam','full_glam',
  'vampire','devil','angel','alien','alien_face',
  'third_eye','clown',
  'agf_fan',
  'neon_outline',
  'gold',
  // Three.js props — handled separately
  'sunglasses','party_glasses','anon_mask',
]);

export function applyPixelFilter(
  ctx: CanvasRenderingContext2D,
  filterId: string,
  W: number, H: number, t: number,
) {
  if (NO_PIXEL.has(filterId)) return;
  try {
    const id = ctx.getImageData(0, 0, W, H);
    let out: ImageData | null = null;
    switch (filterId) {
      case 'neon':         out = pxNeon(id.data, W, H, t);        break;
      case 'neon_dark':    out = pxBlack(W, H);                   break;
      case 'glitch':       out = pxGlitch(id.data, W, H, t);      break;
      case 'thermal':      out = pxThermal(id.data, W, H);        break;
      case 'zombie':       out = pxZombie(id.data, W, H);         break;
      case 'vampire':      out = pxVampire(id.data, W, H);        break;
      case 'cyberpunk':    out = pxCyberpunk(id.data, W, H);      break;
      case 'noir':         out = pxNoir(id.data, W, H);           break;
      case 'cartoon':      out = pxCartoon(id.data, W, H);        break;
      case 'watercolor':   out = pxWatercolor(id.data, W, H);     break;
      case 'oil_paint':    out = pxOilPaint(id.data, W, H);       break;
      case 'night_vision': out = pxNightVision(id.data, W, H);    break;
      case 'hologram':        out = pxHologram(id.data, W, H);          break;
      case 'infrared':        out = pxInfrared(id.data, W, H);          break;
      case 'melt_face':       out = pxMeltFace(id.data, W, H, t);       break;
      case 'pencil_sketch':   out = pxPencilSketch(id.data, W, H);      break;
      case 'kaleidoscope':    out = pxKaleidoscope(id.data, W, H);      break;
    }
    if (out) ctx.putImageData(out, 0, 0);
  } catch (_) { /* taint errors ignored */ }
}

export function applyOverlayFilter(
  ctx: CanvasRenderingContext2D,
  filterId: string,
  landmarks: LandmarkList | null,
  W: number, H: number, t: number,
) {
  if (filterId === 'none') return;

  // Pixel-only filters with no overlay
  const PIXEL_ONLY = new Set(['glitch','thermal','watercolor','oil_paint','infrared','melt_face','pencil_sketch','kaleidoscope']);
  if (PIXEL_ONLY.has(filterId) && !landmarks) return;

  const needsLandmarks = !new Set(['glitch','thermal','melt_face','pencil_sketch','kaleidoscope']).has(filterId);
  if (needsLandmarks && !landmarks) return;

  const d = landmarks ? new DrawCtx(ctx, landmarks, W, H, t) : null;

  switch (filterId) {
    // Animal
    case 'dog':    d && drawDog(d);    break;
    case 'cat':    d && drawCat(d);    break;
    case 'bunny':  d && drawBunny(d);  break;
    case 'fox':    d && drawFox(d);    break;
    case 'lion':   d && drawLion(d);   break;
    // Makeup
    case 'lip_red':         d && drawLipRed(d);         break;
    case 'lip_pink':        d && drawLipPink(d);        break;
    case 'eyeshadow_smoky': d && drawEyeshadowSmoky(d); break;
    case 'eyeshadow_glam':  d && drawEyeshadowGlam(d);  break;
    case 'full_glam':       d && drawFullGlam(d);       break;
    // Character
    case 'vampire': d && drawVampire(d); break;
    case 'zombie':  d && drawZombie(d);  break;
    case 'devil':   d && drawDevil(d);   break;
    case 'angel':   d && drawAngel(d);   break;
    case 'alien':         d && drawAlien(d);         break;
    case 'alien_face':    d && drawAlienFace(d);     break;
    case 'third_eye':     d && drawThirdEye(d);      break;
    case 'clown':         d && drawClown(d);         break;
    case 'agf_fan':       d && drawAgfFan(d);        break;
    case 'big_eyes': {
      // Landmark-accurate big-eyes warp: re-apply with correct eye positions
      if (d) {
        const lEye = d.eyeCenter('left');
        const rEye = d.eyeCenter('right');
        // Radius just large enough to cover one eye + lids; ~0.6× the
        // inter-ocular distance keeps the two warps from overlapping.
        const radius = d.s * 0.6;
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxBigEyes(id2.data, W, H,
            [{ x: lEye.x, y: lEye.y }, { x: rEye.x, y: rEye.y }],
            radius, 1.6,
          );
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'big_mouth': {
      // Magnify the mouth so it is much larger than the rest of the head.
      if (d) {
        const mc = d.mouthCenter();
        const mL = d.pt(61), mR = d.pt(291);
        const mouthW = Math.hypot(mR.x - mL.x, mR.y - mL.y);
        // Radius covers the whole mouth plus the surrounding lips/chin area.
        const radius = Math.max(d.s * 0.7, mouthW * 1.25);
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxBigMouth(id2.data, W, H, mc.x, mc.y, radius, 2.4);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'huge_mouth': {
      // Like Big Mouth but 75% stronger (scale 2.4 → 4.2); a slightly larger
      // radius keeps the bigger warp blending smoothly.
      if (d) {
        const mc = d.mouthCenter();
        const mL = d.pt(61), mR = d.pt(291);
        const mouthW = Math.hypot(mR.x - mL.x, mR.y - mL.y);
        const radius = Math.max(d.s * 0.9, mouthW * 1.5);
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxBigMouth(id2.data, W, H, mc.x, mc.y, radius, 4.2);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'big_lips': {
      // Wider lips, focused on the lip band. Anisotropic ellipse: rx wide so the
      // lips grow outward sideways, ry short so the chin/nose are left alone.
      if (d) {
        const mc = d.mouthCenter();
        const mL = d.pt(61), mR = d.pt(291);   // mouth corners
        const up = d.pt(0),  lo = d.pt(17);    // upper-lip top, lower-lip bottom
        const mouthW = Math.hypot(mR.x - mL.x, mR.y - mL.y);
        const lipH   = Math.hypot(lo.x - up.x, lo.y - up.y);
        const rx = mouthW * 1.45;              // lip corners sit inside the plateau
        const ry = Math.max(lipH * 0.7, d.s * 0.075);
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxWideLips(id2.data, W, H, mc.x, mc.y, rx, ry, 7.0, 1.7);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'big_eyes_mouth': {
      // Combine the big-eyes and big-mouth warps in a single pass.
      if (d) {
        try {
          // 1) Eyes
          const lEye = d.eyeCenter('left');
          const rEye = d.eyeCenter('right');
          let id2 = ctx.getImageData(0, 0, W, H);
          let warped = pxBigEyes(id2.data, W, H,
            [{ x: lEye.x, y: lEye.y }, { x: rEye.x, y: rEye.y }],
            d.s * 0.6, 1.6,
          );
          ctx.putImageData(warped, 0, 0);
          // 2) Mouth — re-read the already-warped frame so both stack.
          const mc = d.mouthCenter();
          const mL = d.pt(61), mR = d.pt(291);
          const mouthW = Math.hypot(mR.x - mL.x, mR.y - mL.y);
          const radius = Math.max(d.s * 0.7, mouthW * 1.25);
          id2 = ctx.getImageData(0, 0, W, H);
          warped = pxBigMouth(id2.data, W, H, mc.x, mc.y, radius, 2.4);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'big_nose': {
      // Magnify the nose region.
      if (d) {
        const nose = d.pt(1); // nose tip
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxBigEyes(id2.data, W, H,
            [{ x: nose.x, y: nose.y }], d.s * 0.7, 3.3,
          );
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'big_ears': {
      // Magnify both ear regions. The silhouette points 234/454 sit by the ears;
      // push the warp centre slightly outward from the face centre to land on them.
      if (d) {
        const fc = d.faceCenter();
        const earR = d.pt(234), earL = d.pt(454);
        const out = (p: { x: number; y: number }) => ({
          x: fc.x + (p.x - fc.x) * 1.18,
          y: fc.y + (p.y - fc.y) * 1.05,
        });
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxBigEyes(id2.data, W, H,
            [out(earR), out(earL)], d.s * 0.58, 3.0,
          );
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'compress_lower': {
      // Squeeze the lower face (below the eyes) vertically toward the eye line.
      if (d) {
        const lEye = d.eyeCenter('left'), rEye = d.eyeCenter('right');
        const eyeY = (lEye.y + rEye.y) / 2;
        const chin = d.pt(152);
        const L = Math.max(1, Math.abs(chin.y - eyeY));
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxVerticalScale(id2.data, W, H, d.faceCenter().x, d.s * 2.1, eyeY, 1, L, 0.45);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'compress_upper': {
      // Squeeze the upper face (above the eyes) vertically toward the eye line.
      if (d) {
        const lEye = d.eyeCenter('left'), rEye = d.eyeCenter('right');
        const eyeY = (lEye.y + rEye.y) / 2;
        const top  = d.pt(10);
        const L = Math.max(1, Math.abs(eyeY - top.y));
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxVerticalScale(id2.data, W, H, d.faceCenter().x, d.s * 2.1, eyeY, -1, L, 0.45);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'long_forehead': {
      // Make the forehead (brow → hairline) twice as long, pushing the top up.
      if (d) {
        const brow = d.pt(9);   // between the eyebrows (bottom of the forehead)
        const hair = d.pt(10);  // top of the forehead / hairline
        const L = Math.max(1, Math.abs(brow.y - hair.y));
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxVerticalScale(id2.data, W, H, d.faceCenter().x, d.s * 1.9, brow.y, -1, L, 2.0, L * 1.5);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'alien_head': {
      // Taper the lower face toward a small chin (grey-alien silhouette).
      if (d) {
        const fc   = d.faceCenter();
        const fh   = d.pt(10);
        const chin = d.pt(152);
        const cy   = (fh.y + chin.y) / 2;
        const faceH = Math.abs(chin.y - fh.y);
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxAlienHead(id2.data, W, H, fc.x, cy, d.s * 1.7, faceH * 0.6, 0.66);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'slim_face': {
      if (d) {
        const mc   = d.mouthCenter();
        const fh   = d.pt(10);
        const chin = d.pt(152);
        const cy   = (fh.y + chin.y) / 2;
        const faceH = Math.abs(chin.y - fh.y);
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxSlimFace(id2.data, W, H, mc.x, cy, d.s * 1.8, faceH * 0.52, 0.22);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    case 'swirl_face': {
      if (d) {
        const mc   = d.mouthCenter();
        const fh   = d.pt(10);
        const chin = d.pt(152);
        const cy   = (fh.y + chin.y) / 2;
        const faceH = Math.abs(chin.y - fh.y);
        try {
          const id2 = ctx.getImageData(0, 0, W, H);
          const warped = pxSwirlFace(id2.data, W, H, mc.x, cy, faceH * 0.55, 1.6);
          ctx.putImageData(warped, 0, 0);
        } catch (_) { /* taint guard */ }
      }
      break;
    }
    // Style overlays
    case 'neon':         d && drawNeonOverlay(d);  break;
    case 'neon_outline': d && drawNeonOutline(d);  break;
    case 'neon_dark':    d && drawNeonOutline(d);  break;
    case 'cyberpunk':    d && drawCyberpunk(d);   break;
    case 'gold':         d && drawGold(d);        break;
    case 'cartoon':      d && drawCartoon(d);     break;
    case 'noir':         d && drawNoir(d);        break;
    case 'watercolor':   d && drawWatercolor(d);  break;
    case 'oil_paint':    d && drawOilPaint(d);    break;
    case 'night_vision': d && drawNightVision(d); break;
    case 'hologram':     d && drawHologram(d);    break;
    case 'infrared':     d && drawInfrared(d);    break;
  }
}
