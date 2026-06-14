import * as THREE from 'three';
import { MODEL_REF_WIDTH } from './sunglasses';

// ════════════════════════════════════════════════════════════════════════
//  Disguise (3D) — the classic "Groucho" novelty glasses as real 3D geometry:
//   • round black-rimmed lenses (clear, so the eyes show through)
//   • a bridge + temple arms that sweep BACK in −Z toward the ears
//   • arched bushy eyebrows (extruded, bevelled)
//   • a big lathe-turned nose hanging down in front, with nostrils
//   • a proper handlebar moustache (extruded from a silhouette)
//
//  Built in the same model-space convention as createSunglasses() (centred on
//  the bridge, lenses along X, front facing +Z, Y up) so it can be placed with
//  the shared eye-line updater. Worn via updateEyeMask().
// ════════════════════════════════════════════════════════════════════════

const LENS_X = 1.35;            // lens centre offset from the bridge
const LENS_R = 0.98 * 1.1;      // lens (rim) radius — 10% bigger glasses
const RIM_TUBE = 0.14 * 1.1;    // rim thickness (matched 10%)

/** Extrude a 2D shape into a bevelled solid and centre it on Z. */
function extrudeCentred(shape: THREE.Shape, depth: number, mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.4,
    bevelSize: 0.06,
    bevelSegments: 4,
    curveSegments: 24,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/** A single arched, tapered eyebrow silhouette centred on the origin. */
function browShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.78, 0.02);
  s.bezierCurveTo(-0.40, 0.30, 0.30, 0.34, 0.80, 0.10);   // bushy arched top
  s.bezierCurveTo(0.86, 0.05, 0.84, -0.04, 0.74, -0.08);  // taper at the outer tip
  s.bezierCurveTo(0.30, 0.04, -0.20, 0.02, -0.62, -0.10); // underside
  s.bezierCurveTo(-0.74, -0.12, -0.82, -0.06, -0.78, 0.02);
  return s;
}

/**
 * A natural full moustache silhouette centred on the origin: a small philtrum
 * notch at the top centre, full body spreading to the sides and tapering to
 * gently drooping ends that follow the upper lip.
 */
function moustacheShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -0.02);                                          // top centre, under the nose
  s.bezierCurveTo(0.10, 0.12, 0.22, 0.18, 0.48, 0.22);        // rise out of the centre
  s.bezierCurveTo(0.82, 0.27, 1.12, 0.20, 1.32, 0.02);        // full body to the right
  s.bezierCurveTo(1.42, -0.10, 1.36, -0.26, 1.16, -0.36);     // end drooping down
  s.bezierCurveTo(0.94, -0.30, 0.70, -0.26, 0.46, -0.20);     // underside back in
  s.bezierCurveTo(0.30, -0.16, 0.15, -0.12, 0, -0.16);        // bottom centre dip
  s.bezierCurveTo(-0.15, -0.12, -0.30, -0.16, -0.46, -0.20);  // mirror to the left
  s.bezierCurveTo(-0.70, -0.26, -0.94, -0.30, -1.16, -0.36);
  s.bezierCurveTo(-1.36, -0.26, -1.42, -0.10, -1.32, 0.02);
  s.bezierCurveTo(-1.12, 0.20, -0.82, 0.27, -0.48, 0.22);
  s.bezierCurveTo(-0.22, 0.18, -0.10, 0.12, 0, -0.02);
  return s;
}

export function createDisguise(): THREE.Group {
  const g = new THREE.Group();

  const plastic = new THREE.MeshStandardMaterial({
    color: 0x202024, roughness: 0.35, metalness: 0.2, envMapIntensity: 1.2,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: 0xe0b487, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.6,
  });
  const skinShadow = new THREE.MeshStandardMaterial({
    color: 0x4a2f22, roughness: 0.8, metalness: 0.0,
  });
  // Matte dark hair for the brows + moustache (slightly warm black-brown).
  const hair = new THREE.MeshStandardMaterial({
    color: 0x241a16, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.4,
  });

  // ── Lens rims (clear lenses → just the black rings) ───────────────────
  for (const sx of [-1, 1]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(LENS_R, RIM_TUBE, 18, 48),
      plastic,
    );
    rim.position.set(sx * LENS_X, 0, 0);
    rim.scale.set(1, 1.08, 1);          // slightly taller than wide
    g.add(rim);
  }

  // ── Bridge across the top of the nose ─────────────────────────────────
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(RIM_TUBE * 0.85, RIM_TUBE * 0.85, (LENS_X - LENS_R) * 2 + 0.6, 14),
    plastic,
  );
  bridge.rotation.z = Math.PI / 2;       // lie horizontally
  bridge.position.set(0, LENS_R * 0.45, 0.02);
  g.add(bridge);

  // ── Temple arms — sweep BACK in −Z, splayed 10° AWAY from the head ─────
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(RIM_TUBE * 1.5, RIM_TUBE * 1.9, 3.3),
      plastic,
    );
    arm.position.set(sx * (LENS_X + LENS_R - 0.05), 0.05, -1.55);
    arm.rotation.x = 0.12;                          // dip toward the ear
    arm.rotation.y = -sx * (10 * Math.PI / 180);    // splay 10° outward (away)
    g.add(arm);
  }

  // ── Arched bushy eyebrows above the rims ──────────────────────────────
  for (const sx of [-1, 1]) {
    const brow = extrudeCentred(browShape(), 0.32, hair);
    brow.scale.set(sx, 1, 1);                       // mirror for the left side
    brow.position.set(sx * LENS_X, LENS_R + 0.5, 0.18);
    brow.rotation.z = sx * -0.1;                    // slight raise at the inner end
    g.add(brow);
  }

  // ── Realistic nose, composed from anatomical lobes ────────────────────
  //  A real nose isn't rotationally symmetric, so it is built from a sloping
  //  bridge (dorsum), a rounded tip, two nostril wings (alae) and the nostril
  //  cavities — overlapping smooth lobes that read as one organic form.
  {
    const nose = new THREE.Group();
    const sph = (r: number) => new THREE.SphereGeometry(r, 28, 24);
    const lobe = (
      geo: THREE.BufferGeometry,
      x: number, y: number, z: number,
      sx: number, sy: number, sz: number,
      mat: THREE.Material = skin,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      nose.add(m);
    };

    // Bridge / dorsum — a narrow ridge sloping from the brow out to the tip.
    lobe(sph(0.3), 0, -0.45, 0.45, 0.78, 1.8, 1.05);
    // Ball of the tip — the forward-most, lowest rounded part.
    lobe(sph(0.42), 0, -1.42, 0.95, 1.05, 0.92, 1.12);
    // Nostril wings (alae) flanking the tip.
    lobe(sph(0.30), -0.40, -1.46, 0.74, 1.0, 0.92, 0.95);
    lobe(sph(0.30),  0.40, -1.46, 0.74, 1.0, 0.92, 0.95);
    // Nostril cavities underneath.
    lobe(sph(0.13), -0.26, -1.72, 0.92, 1.1, 0.7, 0.95, skinShadow);
    lobe(sph(0.13),  0.26, -1.72, 0.92, 1.1, 0.7, 0.95, skinShadow);

    nose.rotation.x = -0.14;            // lean the whole nose slightly forward
    nose.position.set(0, -0.35, 0.3);
    g.add(nose);
  }

  // ── Handlebar moustache under the nose ────────────────────────────────
  {
    const m = extrudeCentred(moustacheShape(), 0.4, hair);
    m.scale.set(1.05, 1.0, 1.0);
    m.position.set(0, -2.62, 0.95);
    m.rotation.x = 0.12;               // curl the tips toward the camera
    g.add(m);
  }

  return g;
}

// Re-exported so the renderer hook can size the model to the face.
export { MODEL_REF_WIDTH };
