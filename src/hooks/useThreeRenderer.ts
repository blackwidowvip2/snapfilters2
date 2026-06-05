import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../store/useStore';
// createSunglasses() (procedural) is still available in ../filters/props/sunglasses
// as a fallback if you ever want to render without the .glb asset.
import { createSunglassesFromGLB, updateSunglasses, updateMask } from '../filters/props/sunglasses';

// Three.js props and how each one tracks the face.
// `glasses` → anchored on the nose bridge; `mask` → anchored on the face centre.
const PROP_KIND: Record<string, 'glasses' | 'mask'> = {
  sunglasses:    'glasses',
  party_glasses: 'glasses',
  anon_mask:     'mask',
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
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
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
    };
    const props: Record<string, THREE.Object3D[]> = {};
    for (const id of Object.keys(urls)) {
      props[id] = [];
      for (let i = 0; i < POOL; i++) {
        const inst = createSunglassesFromGLB(urls[id], { fit: 1.0 });
        inst.visible = false;
        scene.add(inst);
        props[id].push(inst);
      }
    }

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

      if (PROP_KIND[f] && props[f]) {
        const pool = props[f];
        const count = Math.min(faces.length, pool.length);
        for (let i = 0; i < count; i++) {
          if (PROP_KIND[f] === 'mask') updateMask(pool[i], faces[i], vW, vH);
          else updateSunglasses(pool[i], faces[i], vW, vH);
          pool[i].visible = true;
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      envTex?.dispose();
      renderer.dispose();
    };
  }, [isLoaded, videoRef, threeCanvasRef]);
}
