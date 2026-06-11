import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MODEL_REF_WIDTH } from './sunglasses';
import type { LandmarkList } from '../../types';

// ════════════════════════════════════════════════════════════════════════
//  Procedural 3D clown props — a glossy red nose and a curly rainbow wig.
//  Both obey the same model-space convention as the sunglasses (centred on
//  origin, +Z front, Y up, ~MODEL_REF_WIDTH units wide) so they scale onto
//  the measured face the same way.
// ════════════════════════════════════════════════════════════════════════

// ── Shared landmark → world-space helper (matches updateSunglasses) ──────────
function project(lm: LandmarkList, W: number, H: number) {
  return (idx: number) => ({
    x:  (1 - lm[idx].x) * W - W / 2,
    y: -(lm[idx].y * H - H / 2),
    z: -(lm[idx].z ?? 0) * W,
  });
}

/** Head pose (roll/yaw/pitch) + face metrics, shared by both clown props. */
function headPose(lm: LandmarkList, W: number, H: number) {
  const pt = project(lm, W, H);
  const lOuter = pt(33), lInner = pt(133);
  const rOuter = pt(263), rInner = pt(362);
  const lEye = { x: (lOuter.x + lInner.x) / 2, y: (lOuter.y + lInner.y) / 2 };
  const rEye = { x: (rOuter.x + rInner.x) / 2, y: (rOuter.y + rInner.y) / 2 };
  const eyeDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
  const eyeCx = (lEye.x + rEye.x) / 2, eyeCy = (lEye.y + rEye.y) / 2;

  const cheekL = pt(234), cheekR = pt(454);
  const faceWidth = Math.hypot(cheekR.x - cheekL.x, cheekR.y - cheekL.y);

  let ex = lEye.x - rEye.x, ey = lEye.y - rEye.y;
  if (ex < 0) { ex = -ex; ey = -ey; }
  const roll = Math.atan2(ey, ex);

  const noseTip = pt(1);
  const yaw = (noseTip.x - eyeCx) / (eyeDist * 0.9);
  const pitch = -(noseTip.y - eyeCy) / (eyeDist * 1.3);

  return { pt, eyeDist, faceWidth, roll, yaw, pitch };
}

// ── Red nose ─────────────────────────────────────────────────────────────────
export function createClownNose(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xc20d18,            // deeper red, like a real foam clown nose
    roughness: 0.34,            // matte foam look rather than wet plastic
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xe06060),
    envMapIntensity: 1.1,
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 40), mat);
  g.add(nose);
  return g;
}

export function updateClownNose(prop: THREE.Object3D, lm: LandmarkList, W: number, H: number) {
  const { pt, eyeDist, faceWidth, roll, yaw, pitch } = headPose(lm, W, H);
  const nt = pt(1); // nose tip
  prop.position.set(nt.x, nt.y, nt.z + eyeDist * 0.55); // pop forward off the face
  prop.rotation.set(pitch * 0.5, yaw * 0.55, roll);
  prop.scale.setScalar(faceWidth / MODEL_REF_WIDTH);
}

// ── Curly rainbow wig ────────────────────────────────────────────────────────
const HAIR_PALETTE = [0xff2b2b, 0xff8c1a, 0xffe01a, 0x35d44a, 0x2b8cff, 0x9b30ff, 0xff45c0];

// Deterministic pseudo-random so the wig is stable between rebuilds.
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

export function createClownHair(): THREE.Group {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const R = MODEL_REF_WIDTH * 0.52;   // wig dome radius (~half face width once scaled)
  const rand = rng(98765);

  let made = 0;
  for (let i = 0; i < 600 && made < 240; i++) {
    // Distribute curls over a dome reaching well DOWN the sides and back of the
    // head (phi beyond 90°), like a real afro wig that frames the whole face.
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(1 - rand() * 1.5);      // crown → below ear level
    // Slightly ellipsoidal: wider than tall, so the silhouette bulges sideways.
    const x = R * 1.18 * Math.sin(phi) * Math.cos(theta);
    const y = R * Math.cos(phi);                  // up
    const z = R * 1.08 * Math.sin(phi) * Math.sin(theta);
    // Keep only the face opening clear (front AND below the hairline); the wig
    // still wraps around the temples and under the ears at the sides.
    if (z > R * 0.30 && y < R * 0.40) continue;
    if (z > R * 0.05 && y < -R * 0.05) continue;

    // Smaller, denser curls — tight afro texture instead of big loose loops.
    const curlR = R * (0.06 + rand() * 0.08);
    const tube  = curlR * (0.45 + rand() * 0.3);
    const g = new THREE.TorusGeometry(curlR, tube, 8, 14);
    g.rotateX(rand() * Math.PI); g.rotateY(rand() * Math.PI); g.rotateZ(rand() * Math.PI);
    g.translate(x, y + R * 0.10, z);

    // Colour in rainbow SECTORS around the head (like the reference wig) rather
    // than fully random: hue follows the angle around the head, with height and
    // a little noise breaking up the band edges.
    const sector = ((theta / (Math.PI * 2)) * HAIR_PALETTE.length
                    + (1 - Math.cos(phi)) * 1.2          // drift bands downward
                    + (rand() - 0.5) * 0.9) | 0;
    const col = new THREE.Color(HAIR_PALETTE[((sector % HAIR_PALETTE.length) + HAIR_PALETTE.length) % HAIR_PALETTE.length]);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let k = 0; k < count; k++) { colors[k * 3] = col.r; colors[k * 3 + 1] = col.g; colors[k * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geos.push(g);
    made++;
  }

  const merged = mergeGeometries(geos, false);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.0 });
  group.add(new THREE.Mesh(merged, mat));
  return group;
}

export function updateClownHair(prop: THREE.Object3D, lm: LandmarkList, W: number, H: number) {
  const { pt, faceWidth, roll, yaw, pitch } = headPose(lm, W, H);
  const brow = pt(10); // top of forehead / hairline
  // Anchor the dome at the hairline (no upward nudge) so the wig sits low on the
  // head and its widened sides wrap down past the temples and ears.
  prop.position.set(brow.x, brow.y - faceWidth * 0.10, brow.z - faceWidth * 0.10);
  prop.rotation.set(pitch * 0.5, yaw * 0.55, roll);
  prop.scale.setScalar(faceWidth / MODEL_REF_WIDTH);
}
