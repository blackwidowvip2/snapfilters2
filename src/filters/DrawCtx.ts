import type { LandmarkList } from '../types';

/**
 * DrawCtx — core drawing context passed to every filter.
 *
 * KEY FIX: The video is drawn mirrored (scaleX -1) so landmarks from MediaPipe
 * (which are in 0-1 normalised space relative to the UN-mirrored frame) must
 * have their X coordinate flipped:  px = (1 - lm.x) * W
 *
 * Every pt() call does this automatically, so all filters are correct by default.
 */
export class DrawCtx {
  ctx: CanvasRenderingContext2D;
  lm: LandmarkList;
  W: number;
  H: number;
  t: number;
  s: number;       // inter-ocular distance in px  (face scale)
  angle: number;   // head roll angle in radians

  constructor(
    ctx: CanvasRenderingContext2D,
    lm: LandmarkList,
    W: number,
    H: number,
    t: number,
  ) {
    this.ctx = ctx;
    this.lm = lm;
    this.W = W;
    this.H = H;
    this.t = t;
    this.s = this.faceScale();
    this.angle = this.faceAngle();
  }

  // ── Landmark → canvas pixel (with mirror correction) ──────────────────
  pt(idx: number) {
    const p = this.lm[idx];
    if (!p) return { x: 0, y: 0, z: 0 };
    return {
      x: (1 - p.x) * this.W,   // ← mirror flip
      y: p.y * this.H,
      z: p.z ?? 0,
    };
  }

  eyeCenter(side: 'left' | 'right') {
    // In MediaPipe, "left" eye is the person's left (right side of mirrored image)
    if (side === 'left') {
      const o = this.pt(33), i = this.pt(133);
      return { x: (o.x + i.x) / 2, y: (o.y + i.y) / 2 };
    }
    const o = this.pt(263), i = this.pt(362);
    return { x: (o.x + i.x) / 2, y: (o.y + i.y) / 2 };
  }

  mouthCenter() {
    const l = this.pt(61), r = this.pt(291);
    return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
  }

  faceCenter() {
    const nose = this.pt(1);
    return { x: nose.x, y: nose.y };
  }

  faceScale() {
    const l = this.pt(33), r = this.pt(263);
    return Math.max(10, Math.hypot(r.x - l.x, r.y - l.y));
  }

  faceAngle() {
    const l = this.pt(33), r = this.pt(263);
    return Math.atan2(r.y - l.y, r.x - l.x);
  }

  // ── Face outline clip path ─────────────────────────────────────────────
  /**
   * Creates a clipping path that matches the face oval.
   * Use this so overlays are masked to the face and don't float off it.
   */
  clipToFace(expand = 1.0) {
    const { ctx } = this;
    // Outer face silhouette landmarks (jawline + forehead)
    const outline = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
    ];
    const fc = this.faceCenter();
    ctx.beginPath();
    outline.forEach((idx, i) => {
      const p = this.pt(idx);
      // Expand slightly from face centre
      const ex = fc.x + (p.x - fc.x) * expand;
      const ey = fc.y + (p.y - fc.y) * expand;
      if (i === 0) ctx.moveTo(ex, ey);
      else ctx.lineTo(ex, ey);
    });
    ctx.closePath();
    ctx.clip();
  }

  /**
   * Erase (cut out) a region of the canvas so the filter can show through
   * underneath — used to remove original ear/nose pixels before drawing new ones.
   */
  eraseRegion(pts: number[]) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    pts.forEach((idx, i) => {
      const p = this.pt(idx);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
  }

  // ── Generic drawing helpers ────────────────────────────────────────────
  oval(
    x: number, y: number,
    rx: number, ry: number,
    color: string,
    alpha = 1,
    rot = 0,
  ) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Filled polygon through landmark indices */
  poly(indices: number[], color: string, alpha = 1) {
    const { ctx } = this;
    if (!indices.length) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const p = this.pt(idx);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Stroked polyline through landmark indices */
  polyline(indices: number[], color: string, width: number, alpha = 1) {
    const { ctx } = this;
    if (!indices.length) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const p = this.pt(idx);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  /** Draw lips using FaceMesh lip landmarks */
  drawLipShape(color: string, alpha = 0.82, gloss = true) {
    const { ctx } = this;
    const outerUpper = [61,185,40,39,37,0,267,269,270,409,291];
    const outerLower = [291,375,321,405,314,17,84,181,91,146,61];

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    const p0 = this.pt(outerUpper[0]);
    ctx.moveTo(p0.x, p0.y);
    outerUpper.slice(1).forEach(i => { const p = this.pt(i); ctx.lineTo(p.x, p.y); });
    outerLower.slice(1).forEach(i => { const p = this.pt(i); ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.fill();

    if (gloss) {
      const mc = this.mouthCenter();
      const s = this.s;
      const gls = ctx.createRadialGradient(mc.x, mc.y - s * 0.06, 0, mc.x, mc.y - s * 0.04, s * 0.1);
      gls.addColorStop(0, 'rgba(255,255,255,0.38)');
      gls.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = gls;
      ctx.beginPath();
      ctx.ellipse(mc.x, mc.y - s * 0.04, s * 0.11, s * 0.03, this.angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Draw eyelashes on upper lid */
  drawLashes(eye: { x: number; y: number }, side: -1 | 1, color = '#000', length = 1) {
    const { ctx } = this;
    const s = this.s;
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.013;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 3;
    for (let k = -5; k <= 5; k++) {
      const bx = k * s * 0.022;
      const by = -s * 0.085;
      const a = (k / 5) * 0.35 * side;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.sin(a) * s * 0.055 * length, by - Math.cos(a) * s * 0.055 * length);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Simple deterministic pseudo-random */
  pseudo(n: number) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
}
