import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../store/useStore';
// createSunglasses() (procedural) is still available in ../filters/props/sunglasses
// as a fallback if you ever want to render without the .glb asset.
import { createSunglassesFromGLB, updateSunglasses, updateMask, updateBunnyEars, updateHeadOccluder, updateEyeMask, updateHeadTop, updatePerspectiveMask } from '../filters/props/sunglasses';
import { createClownNose, createClownHair, updateClownNose, updateClownHair } from '../filters/props/clown';
import type { LandmarkList } from '../types';

type Updater = (prop: THREE.Object3D, lm: LandmarkList, W: number, H: number) => void;

// Region paint for the single-mesh horse head. Inputs are NORMALISED 0–1 per
// axis (z = depth, the muzzle runs toward z→1). Dark chestnut-brown base, a white
// muzzle over the front of the snout, a black nose/mouth at the tip, and two dark
// glossy eyes on the upper sides.
function horseColor(x: number, y: number, z: number): [number, number, number] {
  // Two dark eyes on the upper sides, set back from the muzzle.
  for (const ex of [0.13, 0.87]) {
    const dx = x - ex, dy = y - 0.66, dz = z - 0.46;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.085) {
      return [0.04, 0.03, 0.02];                  // dark glossy eye
    }
  }
  let r = 0.26, g = 0.12, b = 0.05;               // dark chestnut-brown base
  if (z > 0.62) {                                 // front of the snout → white muzzle
    const w = Math.min(1, (z - 0.62) / 0.28);
    r = r * (1 - w) + 0.90 * w; g = g * (1 - w) + 0.87 * w; b = b * (1 - w) + 0.82 * w;
  }
  if (z > 0.86 && y < 0.45) {                     // tip + lower → black nose/mouth
    const k = Math.min(1, (z - 0.86) / 0.14) * Math.min(1, (0.45 - y) / 0.45);
    r = r * (1 - k) + 0.06 * k; g = g * (1 - k) + 0.06 * k; b = b * (1 - k) + 0.06 * k;
  }
  return [r, g, b];
}

// Which Three.js prop instance(s) each filter shows. A filter may use several
// (the clown wears both a wig and a nose).
const FILTER_PROPS: Record<string, string[]> = {
  sunglasses:    ['sunglasses'],
  party_glasses: ['party_glasses'],
  anon_mask:     ['anon_mask'],
  anonymous_mask:['anonymous_mask'],
  ironman:       ['ironman'],
  horse:         ['horse'],
  agf_cap:       ['agf_cap'],
  agf_cap_logo:  ['agf_cap_logo'],
  batman2:       ['batman2'],
  clown:         ['clown_hair', 'clown_nose'],
  bunny:         ['bunny_ears'],
};

export function useThreeRenderer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  threeCanvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const { isLoaded } = useStore();
  const filterRef = useRef(useStore.getState().activeFilter);
  const facesRef  = useRef(useStore.getState().faces);

  // Subscribe without triggering re-render
  useEffect(() => useStore.subscribe(s => {
    filterRef.current = s.activeFilter;
    facesRef.current  = s.faces;
  }), []);

  useEffect(() => {
    if (!isLoaded) return;
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    // ── Renderer ────────────────────────────────────────────────────────
    // preserveDrawingBuffer keeps the rendered frame readable so the props can
    // be composited into a captured photo (otherwise the buffer is cleared and
    // drawImage(threeCanvas) yields nothing).
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    // Physically-correct lighting (default in three ≥ r155; set explicitly,
    // guarded so it never throws on versions where the prop was removed).
    if ('physicallyCorrectLights' in renderer) {
      (renderer as unknown as { physicallyCorrectLights: boolean }).physicallyCorrectLights = true;
    }
    if ('useLegacyLights' in renderer) {
      (renderer as unknown as { useLegacyLights: boolean }).useLegacyLights = false;
    }

    // ── Scene & lights ──────────────────────────────────────────────────
    // The environment map provides most illumination; lights add highlights.
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 2.2);
    keyLight.position.set(1.5, 2, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcfe0ff, 0.7);
    fillLight.position.set(-2, 0.5, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(0, 1, -2);
    scene.add(rimLight);

    // Real environment map → realistic reflections on the mirrored lenses
    let envTex: THREE.Texture | null = null;
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();
    } catch (_) { /* environment map is optional — skip if it fails */ }

    // ── Props ───────────────────────────────────────────────────────────
    // One instance per face (up to maxNumFaces) so the prop can be worn by
    // several people at once. Each prop type keeps its own pool.
    const POOL = 4;
    const urls: Record<string, string> = {
      sunglasses:    `${import.meta.env.BASE_URL}models/sunglasses.glb`,
      party_glasses: `${import.meta.env.BASE_URL}models/${encodeURIComponent('Party Glasses.glb')}`,
      anon_mask:     `${import.meta.env.BASE_URL}models/Anon_Mask.glb`,
      anonymous_mask:`${import.meta.env.BASE_URL}models/Anonymous_mask.glb`,
      ironman:       `${import.meta.env.BASE_URL}models/Ironman_Helmet.glb`,
      agf_cap:       `${import.meta.env.BASE_URL}models/AGF_cap.glb`,
      agf_cap_logo:  `${import.meta.env.BASE_URL}models/AGF_cap_logo.glb`,
      batman2:       `${import.meta.env.BASE_URL}models/Batman_mask.glb`,
      bunny_ears:    `${import.meta.env.BASE_URL}models/${encodeURIComponent('Bunny ears.glb')}`,
      horse:         `${import.meta.env.BASE_URL}models/Horse.glb`,
    };
    // Factory + face-tracking updater for every prop instance type.
    const makeProp: Record<string, () => THREE.Object3D> = {
      sunglasses:    () => createSunglassesFromGLB(urls.sunglasses, { fit: 1.0, pivotZFront: true }),
      party_glasses: () => createSunglassesFromGLB(urls.party_glasses, { fit: 1.0, pivotZFront: true }),
      anon_mask:     () => createSunglassesFromGLB(urls.anon_mask, { fit: 1.0 }),
      // Nudged down so the mask's eye holes land on the person's eyes.
      anonymous_mask:() => createSunglassesFromGLB(urls.anonymous_mask, { fit: 1.0, hideNodes: ['Sphere'], offset: { y: -0.2 } }),
      // Nudged down so the helmet's eye openings line up with the real eyes.
      ironman:       () => createSunglassesFromGLB(urls.ironman, { fit: 1.2, offset: { y: 1.5 } }),
      agf_cap:       () => createSunglassesFromGLB(urls.agf_cap, { fit: 1.4, forceColor: 0x111f4d, keepColorNodes: ['AGF_text'], rotation: { x: -0.13 }, offset: { y: 1, z: -4 } }),
      // White cap with the full AGF crest as a textured decal (baked into the
      // GLB), so no forceColor — keep the cap's own white + the crest texture.
      agf_cap_logo:  () => createSunglassesFromGLB(urls.agf_cap_logo, { fit: 1.4, rotation: { x: -0.13 }, offset: { y: 1, z: -4 } }),
      // The model already faces the camera in its native orientation, so no
      // rotation. Coloured black; anchored on the eye line (see updateProp).
      batman2:       () => createSunglassesFromGLB(urls.batman2, { fit: 1.3, forceColor: 0x0a0a0a }),
      bunny_ears:    () => createSunglassesFromGLB(urls.bunny_ears, { fit: 1.0 }),
      // Single-mesh horse head, painted by region: brown base, white muzzle,
      // black nose/mouth — matching the reference horse mask.
      // Full-head horse mask, raised to cover the crown. Depth handled by the
      // perspective updater (the cap-style z offset is orthographic-invisible).
      horse:         () => createSunglassesFromGLB(urls.horse, { fit: 1.6, vertexColorFn: horseColor, offset: { y: 2.5 } }),
      clown_nose:    createClownNose,
      clown_hair:    createClownHair,
    };
    const updateProp: Record<string, Updater> = {
      sunglasses:    updateSunglasses,
      party_glasses: updateSunglasses,
      anon_mask:     updateMask,
      // This model turns opposite to the head with the standard yaw — invert it.
      anonymous_mask:(p, lm, W, H) => { updateMask(p, lm, W, H); p.rotation.y = -p.rotation.y; },
      ironman:       updateMask,
      horse:         updatePerspectiveMask(-100),   // negative = enlarge + raise (cover crown); positive = recede/shrink
      agf_cap:       updateHeadTop(-0.20, 0.85, 1.0),   // lowered onto the head, 15% smaller
      agf_cap_logo:  updateHeadTop(-0.20, 0.85, 1.0),
      batman2:       updateEyeMask(0.37, 0.87),   // lifted to the eyes; 87% size so it fits the head

      bunny_ears:    updateBunnyEars,
      clown_nose:    updateClownNose,
      clown_hair:    updateClownHair,
    };

    const props: Record<string, THREE.Object3D[]> = {};
    for (const id of Object.keys(makeProp)) {
      props[id] = [];
      for (let i = 0; i < POOL; i++) {
        const inst = makeProp[id]();
        inst.visible = false;
        scene.add(inst);
        props[id].push(inst);
      }
    }

    // ── Head occluders ──────────────────────────────────────────────────
    // Invisible depth-only ellipsoids. Drawn first (renderOrder -1), they fill
    // the depth buffer with the head's shape so prop parts behind the head are
    // culled — this is what makes glasses sit ON the face instead of floating.
    const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const occGeo = new THREE.SphereGeometry(1, 24, 24);
    const occluders: THREE.Mesh[] = [];
    for (let i = 0; i < POOL; i++) {
      const occ = new THREE.Mesh(occGeo, occMat);
      occ.renderOrder = -1;
      occ.visible = false;
      scene.add(occ);
      occluders.push(occ);
    }
    // Filters whose props wrap around the head and benefit from occlusion, so the
    // parts behind the head are hidden (depth blends instead of floating on top).
    const NEEDS_OCCLUDER = new Set(['sunglasses', 'party_glasses', 'agf_cap', 'agf_cap_logo']);

    // ── Camera (orthographic — sized to video) ──────────────────────────
    const initW = 640, initH = 480;
    const camera = new THREE.OrthographicCamera(
      -initW / 2, initW / 2,
       initH / 2, -initH / 2,
      -2000, 2000,
    );
    camera.position.z = 500;

    // ── Frame loop ──────────────────────────────────────────────────────
    let rafId: number;
    let lastW = 0, lastH = 0;
    const partyColor = new THREE.Color();   // reused for the party-glasses hue cycle

    const frame = () => {
      rafId = requestAnimationFrame(frame);

      const video = videoRef.current;
      if (!video) return;
      const vW = video.videoWidth  || window.innerWidth;
      const vH = video.videoHeight || window.innerHeight;
      if (!vW || !vH) return;

      // Sync canvas + camera to video resolution (use separate tracker to avoid
      // canvas.width being modified by renderer.setSize itself on each check)
      if (vW !== lastW || vH !== lastH) {
        lastW = vW; lastH = vH;
        renderer.setSize(vW, vH, false);
        camera.left   = -vW / 2;
        camera.right  =  vW / 2;
        camera.top    =  vH / 2;
        camera.bottom = -vH / 2;
        camera.updateProjectionMatrix();
      }

      const f     = filterRef.current;
      const faces = facesRef.current;

      // Hide every prop instance, then place one on each detected face.
      for (const id of Object.keys(props)) {
        for (const inst of props[id]) inst.visible = false;
      }
      for (const occ of occluders) occ.visible = false;

      const propIds = FILTER_PROPS[f];
      if (propIds) {
        for (const id of propIds) {
          const pool = props[id];
          if (!pool) continue;
          const update = updateProp[id];
          const count = Math.min(faces.length, pool.length);
          for (let i = 0; i < count; i++) {
            update(pool[i], faces[i], vW, vH);
            pool[i].visible = true;
          }
        }
      }

      // Party glasses: cycle the whole model through the colour wheel over time,
      // the same way the neon filter does (hue = (t·50°) mod 360).
      if (f === 'party_glasses') {
        const hue = ((performance.now() / 1000) * 70 / 360) % 1;
        partyColor.setHSL(hue, 1, 0.55);
        for (const inst of props.party_glasses) {
          if (!inst.visible) continue;
          inst.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat && mat.emissive) {
              // Drive the colour ENTIRELY from emissive, which ignores scene
              // lights, reflections, normals and position — so the hue looks
              // identical on every face wherever it is in the frame. The lit base
              // colour is killed (set black) and reflections removed so lighting
              // can no longer make one person dimmer than another.
              mat.color.setRGB(0, 0, 0);
              mat.emissive.copy(partyColor);
              mat.emissiveIntensity = 1.4;
              if ('envMapIntensity' in mat) mat.envMapIntensity = 0;
              if ('metalness' in mat) mat.metalness = 0;
              if ('roughness' in mat) mat.roughness = 1;
            } else if (mat && mat.color) {
              mat.color.copy(partyColor);
            }
          });
        }
      }

      // Place a head occluder on each face for filters that need it (glasses).
      if (NEEDS_OCCLUDER.has(f)) {
        const count = Math.min(faces.length, occluders.length);
        for (let i = 0; i < count; i++) {
          updateHeadOccluder(occluders[i], faces[i], vW, vH);
          occluders[i].visible = true;
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      envTex?.dispose();
      occGeo.dispose();
      occMat.dispose();
      renderer.dispose();
    };
  }, [isLoaded, videoRef, threeCanvasRef]);
}
