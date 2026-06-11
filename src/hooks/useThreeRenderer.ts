import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../store/useStore';
// createSunglasses() (procedural) is still available in ../filters/props/sunglasses
// as a fallback if you ever want to render without the .glb asset.
import { createSunglassesFromGLB, updateSunglasses, updateMask, updateBunnyEars, updateHeadOccluder } from '../filters/props/sunglasses';
import { createClownNose, createClownHair, updateClownNose, updateClownHair } from '../filters/props/clown';
import type { LandmarkList } from '../types';

type Updater = (prop: THREE.Object3D, lm: LandmarkList, W: number, H: number) => void;

// Which Three.js prop instance(s) each filter shows. A filter may use several
// (the clown wears both a wig and a nose).
const FILTER_PROPS: Record<string, string[]> = {
  sunglasses:    ['sunglasses'],
  party_glasses: ['party_glasses'],
  anon_mask:     ['anon_mask'],
  anonymous_mask:['anonymous_mask'],
  ironman:       ['ironman'],
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
      batman2:       `${import.meta.env.BASE_URL}models/Batman_Cowl.glb`,
      bunny_ears:    `${import.meta.env.BASE_URL}models/${encodeURIComponent('Bunny ears.glb')}`,
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
      batman2:       () => createSunglassesFromGLB(urls.batman2, { fit: 1.3, offset: { y: 1.8 } }),
      bunny_ears:    () => createSunglassesFromGLB(urls.bunny_ears, { fit: 1.0 }),
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
      batman2:       updateMask,
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
    // Filters whose props wrap around the head and benefit from occlusion.
    const NEEDS_OCCLUDER = new Set(['sunglasses', 'party_glasses']);

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
