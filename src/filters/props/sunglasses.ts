import * as THREE from 'three';
import type { LandmarkList } from '../../types';

// ════════════════════════════════════════════════════════════════════════
//  Procedural 3D sunglasses — real geometry with depth:
//   • Lens outline → rounded-rect Shape, curved (bowed) glass
//   • Frame rim    → TubeGeometry following the lens contour (true thickness)
//   • Temples      → curved tubes that sweep back toward the ears
//   • Mirrored lenses via MeshPhysicalMaterial (metalness + clearcoat +
//     iridescence) lit by an environment map → looks like real shades
// ════════════════════════════════════════════════════════════════════════

const HW = 1.05;   // lens half-width
const HH = 0.72;   // lens half-height
const CORNER = 0.34;
const CURVE = 0.32;       // how much the glass bows toward the viewer
const FRAME_R = 0.085;    // frame tube radius
const LENS_X = 1.35;      // lens centre offset from bridge
const WRAP = 0.16;        // wrap-around angle per lens (radians)

// Model-space width that a loaded GLB is normalised to (its full bounding-box
// width). updateSunglasses() maps this onto the measured face width so the
// temples reach the ears.
export const MODEL_REF_WIDTH = 2 * LENS_X * 2.0;

/** Rounded-rectangle outline points, centred on origin, in the XY plane. */
function lensOutline(steps = 24): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  // corner arc centres
  const cx = HW - CORNER, cy = HH - CORNER;
  const corners = [
    { ox:  cx, oy:  cy, a0: 0,            a1: Math.PI / 2 },     // top-right
    { ox: -cx, oy:  cy, a0: Math.PI / 2,  a1: Math.PI },        // top-left
    { ox: -cx, oy: -cy, a0: Math.PI,      a1: Math.PI * 1.5 },  // bottom-left
    { ox:  cx, oy: -cy, a0: Math.PI * 1.5,a1: Math.PI * 2 },    // bottom-right
  ];
  for (const c of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = c.a0 + (c.a1 - c.a0) * (i / steps);
      pts.push(new THREE.Vector2(c.ox + Math.cos(a) * CORNER, c.oy + Math.sin(a) * CORNER));
    }
  }
  return pts;
}

/** Bow a flat geometry forward along +Z based on local X (cylindrical curve). */
function bowGeometry(geo: THREE.BufferGeometry): void {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = CURVE * (1 - (x / HW) * (x / HW));
    pos.setZ(i, pos.getZ(i) + Math.max(0, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function makeLens(frameMat: THREE.Material, glassMat: THREE.Material): THREE.Group {
  const lens = new THREE.Group();
  const outline = lensOutline();

  // ── Glass (curved) ──────────────────────────────────────────────
  const shape = new THREE.Shape(outline);
  const glassGeo = new THREE.ShapeGeometry(shape, 12);
  bowGeometry(glassGeo);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.renderOrder = 1;
  lens.add(glass);

  // ── Frame rim — tube following the (bowed) contour ──────────────
  const curvePts = outline.map(p => {
    const z = Math.max(0, CURVE * (1 - (p.x / HW) * (p.x / HW)));
    return new THREE.Vector3(p.x, p.y, z);
  });
  const rimCurve = new THREE.CatmullRomCurve3(curvePts, true, 'catmullrom', 0.5);
  const rimGeo = new THREE.TubeGeometry(rimCurve, 180, FRAME_R, 14, true);
  lens.add(new THREE.Mesh(rimGeo, frameMat));

  return lens;
}

export function createSunglasses(): THREE.Group {
  const group = new THREE.Group();

  // Glossy black plastic frame
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c,
    roughness: 0.32,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.4,
  });

  // Mirrored / reflective lens
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a2740,
    metalness: 1.0,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    iridescence: 0.45,
    iridescenceIOR: 1.6,
    envMapIntensity: 2.4,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  });

  // ── Two lenses, wrapped slightly for a 3D face-hugging look ──────
  const left = makeLens(frameMat, glassMat);
  left.position.x = -LENS_X;
  left.rotation.y = WRAP;        // wrap around the face
  group.add(left);

  const right = makeLens(frameMat, glassMat);
  right.position.x = LENS_X;
  right.rotation.y = -WRAP;
  group.add(right);

  // ── Bridge — curved tube connecting the inner top of the lenses ──
  const bridgePts = [
    new THREE.Vector3(-(LENS_X - HW + 0.08), HH * 0.45, CURVE * 0.7),
    new THREE.Vector3(0,                      HH * 0.62, CURVE + 0.06),
    new THREE.Vector3( (LENS_X - HW + 0.08), HH * 0.45, CURVE * 0.7),
  ];
  const bridgeCurve = new THREE.CatmullRomCurve3(bridgePts);
  const bridgeGeo = new THREE.TubeGeometry(bridgeCurve, 40, FRAME_R * 0.92, 12, false);
  group.add(new THREE.Mesh(bridgeGeo, frameMat));

  // ── Hinges + temples (arms) ─────────────────────────────────────
  for (const sx of [-1, 1]) {
    const hingeX = sx * (LENS_X + HW - 0.12);

    // Hinge block
    const hinge = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.22, 0.16),
      frameMat,
    );
    hinge.position.set(hingeX, HH * 0.42, CURVE * 0.3);
    group.add(hinge);

    // Temple — sweeps outward then back toward the ear, dropping slightly
    const templePts = [
      new THREE.Vector3(hingeX,              HH * 0.42, CURVE * 0.3),
      new THREE.Vector3(hingeX + sx * 0.12,  HH * 0.40, -0.5),
      new THREE.Vector3(hingeX + sx * 0.10,  HH * 0.30, -1.7),
      new THREE.Vector3(hingeX - sx * 0.02,  HH * 0.05, -2.7),
      new THREE.Vector3(hingeX - sx * 0.05, -HH * 0.30, -3.1),
    ];
    const templeCurve = new THREE.CatmullRomCurve3(templePts);
    const templeGeo = new THREE.TubeGeometry(templeCurve, 60, FRAME_R * 0.78, 10, false);
    group.add(new THREE.Mesh(templeGeo, frameMat));
  }

  // ── Nose pads ───────────────────────────────────────────────────
  const padMat = new THREE.MeshPhysicalMaterial({
    color: 0x222226, roughness: 0.5, clearcoat: 0.6,
  });
  for (const sx of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), padMat);
    pad.scale.set(0.7, 1.2, 0.6);
    pad.position.set(sx * 0.28, -0.18, CURVE + 0.12);
    group.add(pad);
  }

  return group;
}

// ════════════════════════════════════════════════════════════════════════
//  GLTF / GLB loader — use a real Blender model instead of the procedural one
// ════════════════════════════════════════════════════════════════════════
//
//  The model is normalised so it obeys the SAME convention as
//  createSunglasses(), which means updateSunglasses() works unchanged:
//    • centred on origin (bridge at 0,0)
//    • lenses spread along the X axis
//    • front of the glasses facing +Z, Y pointing up
//    • total front width ≈ 2 × LENS_X model units
//
//  Tune these per model (every Blender export has its own scale/orientation):

export interface GlbOptions {
  /** Extra rotation (radians) to align the model to +Z front / Y up. */
  rotation?: { x?: number; y?: number; z?: number };
  /** Fine scale multiplier after auto-fit (1 = exact fit to eye distance). */
  fit?: number;
  /** Manual offset in model units (e.g. nudge down onto the nose). */
  offset?: { x?: number; y?: number; z?: number };
}

/**
 * Returns a Group immediately; the GLB streams in and is normalised into it.
 * Pass the returned group straight to updateSunglasses() — it tracks the face
 * even before the model has finished loading.
 */
export function createSunglassesFromGLB(url: string, opts: GlbOptions = {}): THREE.Group {
  const root = new THREE.Group();

  // Dynamic import keeps GLTFLoader out of the main bundle until needed.
  import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // 1) Apply any orientation fix from Blender's axes → our convention.
        model.rotation.set(
          opts.rotation?.x ?? 0,
          opts.rotation?.y ?? 0,
          opts.rotation?.z ?? 0,
        );
        model.updateMatrixWorld(true);

        // 2) Auto-centre + auto-scale using the bounding box (unscaled).
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const centre = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(centre);

        // Scale so the model's width matches our reference width.
        const s = (opts.fit ?? 1) * (MODEL_REF_WIDTH / (size.x || 1));
        model.scale.setScalar(s);

        // Re-centre AFTER scaling: world centre = position + s·centre, so to
        // land the centre at the desired offset we set position = offset − s·centre.
        model.position.set(
          (opts.offset?.x ?? 0) - centre.x * s,
          (opts.offset?.y ?? 0) - centre.y * s,
          (opts.offset?.z ?? 0) - centre.z * s,
        );

        // 3) Make sure every material reacts to the environment map so the
        //    lenses/metal reflect like the procedural version.
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.4;
          }
        });

        root.add(model);
      },
      undefined,
      (err) => console.error('Failed to load sunglasses GLB:', err),
    );
  });

  return root;
}

// ════════════════════════════════════════════════════════════════════════
//  Map MediaPipe landmarks → Three.js transform
// ════════════════════════════════════════════════════════════════════════
export function updateSunglasses(
  prop: THREE.Object3D,
  lm: LandmarkList,
  W: number, H: number,
): void {
  const pt = (idx: number) => ({
    x:  (1 - lm[idx].x) * W - W / 2,
    y: -(lm[idx].y * H - H / 2),
    z: -(lm[idx].z ?? 0) * W,
  });

  const lOuter = pt(33), lInner = pt(133);
  const rOuter = pt(263), rInner = pt(362);

  const lEye = { x: (lOuter.x + lInner.x) / 2, y: (lOuter.y + lInner.y) / 2 };
  const rEye = { x: (rOuter.x + rInner.x) / 2, y: (rOuter.y + rInner.y) / 2 };

  const eyeDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
  const eyeCx   = (lEye.x + rEye.x) / 2;
  const eyeCy   = (lEye.y + rEye.y) / 2;

  // Face width measured at the cheeks/ears (silhouette landmarks). The glasses
  // are scaled to this so the temple arms reach the ears like real glasses.
  const cheekL = pt(234), cheekR = pt(454);
  const faceWidth = Math.hypot(cheekR.x - cheekL.x, cheekR.y - cheekL.y);

  // Anchor on the nose bridge so the glasses rest on the nose.
  const bridge = pt(168);

  // Head roll (z-axis). The eye-line vector is forced to point toward screen-right
  // so roll always stays within (−90°, +90°). Without this, the mirrored video can
  // make the vector point left → roll ≈ ±180° → the glasses render upside-down.
  let ex = lEye.x - rEye.x;
  let ey = lEye.y - rEye.y;
  if (ex < 0) { ex = -ex; ey = -ey; }
  const roll = Math.atan2(ey, ex);

  // Yaw (turn left/right) from nose tip horizontal offset
  const noseTip = pt(1);
  const yaw = (noseTip.x - eyeCx) / (eyeDist * 0.9);

  // Pitch (nod) from nose tip vertical offset
  const pitch = -(noseTip.y - eyeCy) / (eyeDist * 1.3);

  // Sit on the nose bridge, pushed slightly toward the camera so the lenses
  // float just in front of the eyes.
  prop.position.set(bridge.x, bridge.y, bridge.z + eyeDist * 0.25);
  prop.rotation.set(pitch * 0.5, -yaw * 0.55, roll);

  // Map the model's reference width onto the measured face width.
  prop.scale.setScalar(faceWidth / MODEL_REF_WIDTH);
}

// ════════════════════════════════════════════════════════════════════════
//  Map MediaPipe landmarks → transform for a full-face MASK
//  Unlike glasses, a mask covers the whole face, so it is anchored on the
//  face centre and sits flush against the face (very little forward offset).
// ════════════════════════════════════════════════════════════════════════
export function updateMask(
  prop: THREE.Object3D,
  lm: LandmarkList,
  W: number, H: number,
): void {
  const pt = (idx: number) => ({
    x:  (1 - lm[idx].x) * W - W / 2,
    y: -(lm[idx].y * H - H / 2),
    z: -(lm[idx].z ?? 0) * W,
  });

  const lOuter = pt(33), lInner = pt(133);
  const rOuter = pt(263), rInner = pt(362);
  const lEye = { x: (lOuter.x + lInner.x) / 2, y: (lOuter.y + lInner.y) / 2 };
  const rEye = { x: (rOuter.x + rInner.x) / 2, y: (rOuter.y + rInner.y) / 2 };
  const eyeDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
  const eyeCx = (lEye.x + rEye.x) / 2;
  const eyeCy = (lEye.y + rEye.y) / 2;

  // Full face width (cheek to cheek) — the mask is scaled to span this.
  const cheekL = pt(234), cheekR = pt(454);
  const faceWidth = Math.hypot(cheekR.x - cheekL.x, cheekR.y - cheekL.y);

  // Anchor at the geometric centre of the face (between brow and chin).
  const brow = pt(10), chin = pt(152);
  const centre = {
    x: (brow.x + chin.x) / 2,
    y: (brow.y + chin.y) / 2,
    z: (brow.z + chin.z) / 2,
  };

  // Roll (forced toward screen-right so it can never flip upside-down).
  let ex = lEye.x - rEye.x;
  let ey = lEye.y - rEye.y;
  if (ex < 0) { ex = -ex; ey = -ey; }
  const roll = Math.atan2(ey, ex);

  const noseTip = pt(1);
  const yaw = (noseTip.x - eyeCx) / (eyeDist * 0.9);
  const pitch = -(noseTip.y - eyeCy) / (eyeDist * 1.3);

  // Sit flush on the face (small forward offset so it clears the skin).
  prop.position.set(centre.x, centre.y, centre.z + eyeDist * 0.1);
  prop.rotation.set(pitch * 0.5, -yaw * 0.55, roll);
  prop.scale.setScalar(faceWidth / MODEL_REF_WIDTH);
}
