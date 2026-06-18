import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../store/useStore';
// createSunglasses() (procedural) is still available in ../filters/props/sunglasses
// as a fallback if you ever want to render without the .glb asset.
import { createSunglassesFromGLB, updateSunglasses, updateMask, updateBunnyEars, updateHeadOccluder, updateEyeMask, updateHeadTop, updateEnclosingMask, updateHorse3 } from '../filters/props/sunglasses';
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

// ── Hund 2 tongue animation ───────────────────────────────────────────────
// The painted dog GLB is split into "Ears"/"Body"/"Tongue" nodes (see
// tools/build_dog2.mjs). Like the 2D "Hund" filter, the tongue grows/shrinks
// with how wide the person opens their mouth. We scale the Tongue node and pivot
// the scale at the tongue's TOP (its mouth attachment) by compensating position,
// so it extends downward out of the mouth instead of scaling about the origin.
type TongueData = {
  obj: THREE.Object3D;
  P: THREE.Vector3;            // pivot (tongue top) in the node's local space
  scale0: THREE.Vector3;       // node scale as loaded (incl. quantisation scale)
  cur: number;                 // smoothed scale factor
  open: boolean;               // hysteresis latch: true between the open and close thresholds
};
const tongueCache = new WeakMap<THREE.Object3D, TongueData>();
const tmpMouth = new THREE.Vector3();

function applyDogTongue(prop: THREE.Object3D, lm: LandmarkList, W: number, H: number) {
  let data = tongueCache.get(prop);
  if (!data) {
    const obj = prop.getObjectByName('Tongue');
    if (!obj) return;   // GLB still streaming in
    const mesh = obj as THREE.Mesh;
    const P = new THREE.Vector3();
    if (mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      P.set((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2);
    }
    data = { obj, P, scale0: obj.scale.clone(), cur: 0, open: false };
    tongueCache.set(prop, data);
  }

  // Mouth openness: inner-lip gap normalised by face height (scale-independent).
  const gap = Math.abs(lm[13].y - lm[14].y);
  const faceH = Math.abs(lm[10].y - lm[152].y) || 1;
  const ratio = gap / faceH;

  // Hysteresis: the mouth counts as "open" once it passes OPEN_T, and stays open
  // until it closes well below that (CLOSE_T). This stops threshold jitter from
  // momentarily resetting the tongue (which previously let it shrink/flicker).
  const OPEN_T = 0.06, CLOSE_T = 0.025;
  if (!data.open && ratio > OPEN_T) data.open = true;
  else if (data.open && ratio < CLOSE_T) data.open = false;

  // While open, the tongue tracks the mouth opening BOTH ways: it grows as the mouth
  // opens wider (up to 1.8× the start size) and shrinks back as the mouth narrows —
  // but never below the start size. It only drops to 0 (→ hidden) once the mouth
  // truly closes (hysteresis below CLOSE_T).
  const START = 0.72;   // tongue start size
  if (data.open) {
    const ext = Math.max(0, Math.min(1, (ratio - CLOSE_T) / 0.30));
    const target = START * (1 + 0.8 * ext);
    data.cur += (target - data.cur) * 0.4;   // smooth grow/shrink, never below START
  } else {
    // Mouth closed: the tongue disappears immediately at its start size instead of
    // smoothly shrinking down through a tiny tongue and fading out.
    data.cur = 0;
  }

  const { obj, P, scale0, cur } = data;
  obj.visible = cur > 0.05;                    // fully hide the tongue with a closed mouth
  obj.scale.set(scale0.x * cur, scale0.y * cur, scale0.z * cur);

  // Anchor the tongue's TOP just under the UPPER lip: a point biased toward the
  // upper inner lip (13), only slightly toward the lower inner lip (14), so the
  // tongue starts close beneath the upper lip regardless of how the rigid dog mask
  // is aligned. Landmark→world uses the same mapping as updateMask. A small forward
  // (+Z, toward camera) nudge keeps it off the chin.
  const LIP = 0.15;   // 0 = on the upper lip, 1 = on the lower lip
  const ux = (1 - lm[13].x) * W - W / 2, uy = -(lm[13].y * H - H / 2), uz = -(lm[13].z ?? 0) * W;
  const dx = (1 - lm[14].x) * W - W / 2, dy = -(lm[14].y * H - H / 2), dz = -(lm[14].z ?? 0) * W;
  const clx = (1 - lm[234].x) * W - W / 2, cly = -(lm[234].y * H - H / 2);
  const crx = (1 - lm[454].x) * W - W / 2, cry = -(lm[454].y * H - H / 2);
  const faceWidth = Math.hypot(crx - clx, cry - cly);
  tmpMouth.set(
    ux + (dx - ux) * LIP,
    uy + (dy - uy) * LIP,
    uz + (dz - uz) * LIP + faceWidth * 0.18,
  );

  const parent = obj.parent;
  if (parent) {
    parent.updateWorldMatrix(true, false);
    parent.worldToLocal(tmpMouth);            // mouth centre → tongue's local space
    // Place the node so its pivot (tongue top P) lands exactly on the mouth centre.
    obj.position.set(
      tmpMouth.x - obj.scale.x * P.x,
      tmpMouth.y - obj.scale.y * P.y,
      tmpMouth.z - obj.scale.z * P.z,
    );
  }
}

// Which Three.js prop instance(s) each filter shows. A filter may use several
// (the clown wears both a wig and a nose).
const FILTER_PROPS: Record<string, string[]> = {
  sunglasses:    ['sunglasses'],
  party_glasses: ['party_glasses'],
  ski_goggles:   ['ski_goggles'],
  anon_mask:     ['anon_mask'],
  anonymous_mask:['anonymous_mask'],
  ironman:       ['ironman'],
  horse2:        ['horse2'],
  horse3:        ['horse3'],
  agf_cap:       ['agf_cap'],
  agf_cap_logo:  ['agf_cap_logo'],
  batman2:       ['batman2'],
  disguise:      ['disguise'],
  clown:         ['clown_hair', 'clown_nose'],
  bunny:         ['bunny_ears'],
  dog2:          ['dog2'],
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
    // Cap the WebGL drawing buffer's longest side. The camera/coordinate system is
    // in video pixels (see the resize block) and the canvas is stretched to fill via
    // CSS, so this only changes render resolution — NOT prop positioning. Without it,
    // a high-res front camera (e.g. iPad's 12 MP Center-Stage cam) × devicePixelRatio
    // produces a buffer large enough that iOS Safari silently fails the GL context,
    // which made every 3D prop invisible on iPad 11 while 2D filters still worked.
    const MAX_BUFFER_SIDE = 1536;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Surface (and allow recovery from) a lost GL context instead of failing silently.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();   // preventDefault lets the browser attempt a restore
      console.warn('[three] WebGL context lost — 3D props will be hidden until restored');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      console.warn('[three] WebGL context restored');
    });
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
      ski_goggles:   `${import.meta.env.BASE_URL}models/Pink_Neon_Ski_Goggles.glb`,
      anon_mask:     `${import.meta.env.BASE_URL}models/Anon_Mask.glb`,
      anonymous_mask:`${import.meta.env.BASE_URL}models/Anonymous_mask.glb`,
      ironman:       `${import.meta.env.BASE_URL}models/Ironman_Helmet.glb`,
      agf_cap:       `${import.meta.env.BASE_URL}models/AGF_cap.glb`,
      agf_cap_logo:  `${import.meta.env.BASE_URL}models/AGF_cap_logo.glb`,
      batman2:       `${import.meta.env.BASE_URL}models/Batman_mask.glb`,
      bunny_ears:    `${import.meta.env.BASE_URL}models/Bunny_ears_nose.glb`,
      horse:         `${import.meta.env.BASE_URL}models/Horse.glb`,
      dog2:          `${import.meta.env.BASE_URL}models/Dog_Face_painted.glb`,
      disguise:      `${import.meta.env.BASE_URL}models/Groucho_disguise.glb`,
    };
    // Factory + face-tracking updater for every prop instance type.
    const makeProp: Record<string, () => THREE.Object3D> = {
      sunglasses:    () => createSunglassesFromGLB(urls.sunglasses, { fit: 1.0, pivotZFront: true }),
      party_glasses: () => createSunglassesFromGLB(urls.party_glasses, { fit: 1.0, pivotZFront: true }),
      // Ski goggles — Pink Neon model; scaled down considerably to sit on the face.
      ski_goggles:   () => createSunglassesFromGLB(urls.ski_goggles, { fit: 1.13, pivotZFront: true, offset: { y: 0.17 } }),
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
      // Tint the 4 whiskers (2 per side) black. They are the outer strands of the
      // nose blob (the geometry stops at ny≈0.23, so the height band is 0.03–0.24).
      // The inner X threshold is pulled further toward the centre in the UPPER part
      // of the band (ny>0.16), where the top whiskers' inner ends curve in toward
      // the still-narrow snout — without catching the wider lower muzzle. The rest
      // of the model keeps its texture.
      bunny_ears:    () => createSunglassesFromGLB(urls.bunny_ears, {
        fit: 1.0,
        tintColorFn: (nx, ny) => {
          // Lower the two LEFT whiskers (nx<0.5) by 0.01 in height vs the right.
          const y = nx < 0.5 ? ny + 0.01 : ny;
          if (y <= 0.03 || y >= 0.24) return [1, 1, 1];
          const inner = y > 0.16 ? 0.349 : 0.33;   // widen inward for the top whiskers
          if (nx < 0.5) return nx < inner ? [0, 0, 0] : [1, 1, 1];
          // Right whiskers: colour a touch more (a little further in toward the snout).
          return nx > 1 - (inner + 0.005) ? [0, 0, 0] : [1, 1, 1];
        },
      }),
      // Hund 2 — painted 3D dog face worn as a mask over the user's face.
      dog2:          () => createSunglassesFromGLB(urls.dog2, { fit: 1.2 }),
      // Hest — closed 360° head that ENCLOSES the whole head: the horse head is
      // built clearly larger than the real head and pushed back (see
      // updateEnclosingMask) so the person's head sits INSIDE it like a helmet.
      horse2:        () => createSunglassesFromGLB(urls.horse, { fit: 1.8, vertexColorFn: horseColor, offset: { y: 1.25 } }),
      // Hest 3D (experiment) — separate instance so it can be tuned without
      // touching the working Hest (horse2). The model sits inside its tracked
      // root with a small offset; updateHorse3 fastens the root to the head
      // pose and auto-scales by head width + height. Tune fit/offset freely.
      horse3:        () => createSunglassesFromGLB(urls.horse, { fit: 2.0, vertexColorFn: horseColor, offset: { y: 1.7 } }),
      // Groucho disguise — real 3D model (glasses + brows + nose + moustache),
      // worn on the eye line like the other glasses props. offset.y lowers the
      // model so its LENS CENTRES (which sit ~0.123 model-units above the bbox
      // centre, because of the eyebrows up top) land on the anchor — i.e. on the
      // eyes — like the normal glasses. 0.123 × creation scale (0.94·5.4/2 =
      // 2.538) ≈ 0.31.
      disguise:      () => createSunglassesFromGLB(urls.disguise, { fit: 0.94, pivotZFront: true, offset: { x: -0.2, y: -0.31 } }),
      clown_nose:    createClownNose,
      clown_hair:    createClownHair,
    };
    const updateProp: Record<string, Updater> = {
      sunglasses:    updateSunglasses,
      party_glasses: updateSunglasses,
      ski_goggles:   updateSunglasses,
      anon_mask:     updateMask,
      // This model turns opposite to the head with the standard yaw — invert it.
      anonymous_mask:(p, lm, W, H) => { updateMask(p, lm, W, H); p.rotation.y = -p.rotation.y; },
      ironman:       updateMask,
      horse2:        updateEnclosingMask(0.6),   // pushed deep into the skull so the head sits INSIDE the horse head
      horse3:        updateHorse3(0.5, 0.88),     // experiment: real 3D head-pose basis (rotation + translation in world space)
      agf_cap:       updateHeadTop(-0.20, 0.85, 1.0),   // lowered onto the head, 15% smaller
      agf_cap_logo:  updateHeadTop(-0.20, 0.85, 1.0),
      batman2:       updateEyeMask(0.37, 0.87),   // lifted to the eyes; 87% size so it fits the head

      bunny_ears:    updateBunnyEars,
      dog2:          updateMask,
      // Same handling as the party glasses: lenses anchored on the eyes/nose
      // bridge (so the two lens holes centre on the eyes) and the temple arms
      // stretched backward toward the ears.
      disguise:      (p, lm, W, H) => updateSunglasses(p, lm, W, H, { zStretch: 3 }),
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
    const NEEDS_OCCLUDER = new Set(['sunglasses', 'party_glasses', 'ski_goggles', 'agf_cap', 'agf_cap_logo']);

    // ── Camera (orthographic — sized to video) ──────────────────────────
    const initW = 640, initH = 480;
    const camera = new THREE.OrthographicCamera(
      -initW / 2, initW / 2,
       initH / 2, -initH / 2,
      -2000, 2000,
    );
    camera.position.z = 500;

    // Perspective camera used ONLY for the enclosing horse (Hest 2), so that
    // model has true 3D volume that wraps around the head — and turning the head
    // shows the side/back correctly. Calibrated so that at z=0 it matches the
    // orthographic mapping (object world-pixels = screen pixels); the closer the
    // distance PERSP_D, the stronger the perspective wrap.
    const PERSP_D = 900;
    const perspCam = new THREE.PerspectiveCamera(40, initW / initH, 1, 5000);
    perspCam.position.set(0, 0, PERSP_D);
    perspCam.lookAt(0, 0, 0);
    const PERSP_FILTERS = new Set(['horse2', 'horse3']);

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
        // Cap the drawing buffer: pixelRatio so the longest side ≤ MAX_BUFFER_SIDE,
        // never above 2 or the device ratio. setSize stays in video pixels (logical),
        // only the backing-store resolution shrinks — CSS scales it back up.
        const pr = Math.min(window.devicePixelRatio || 1, 2, MAX_BUFFER_SIDE / Math.max(vW, vH));
        renderer.setPixelRatio(pr);
        renderer.setSize(vW, vH, false);
        camera.left   = -vW / 2;
        camera.right  =  vW / 2;
        camera.top    =  vH / 2;
        camera.bottom = -vH / 2;
        camera.updateProjectionMatrix();
        // Vertical FOV so the frustum height at z=0 equals the video height
        // (matches the orthographic 1:1 world-pixel mapping at the head plane).
        perspCam.aspect = vW / vH;
        perspCam.fov = 2 * Math.atan((vH / 2) / PERSP_D) * 180 / Math.PI;
        perspCam.updateProjectionMatrix();
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

      // Hund 2: animate each visible dog tongue to the wearer's mouth openness.
      if (f === 'dog2') {
        const pool = props.dog2;
        const count = Math.min(faces.length, pool.length);
        for (let i = 0; i < count; i++) applyDogTongue(pool[i], faces[i], vW, vH);
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

      // The enclosing horse renders through the perspective camera for true 3D
      // wrap; every other filter uses the orthographic camera.
      renderer.render(scene, PERSP_FILTERS.has(f) ? perspCam : camera);
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
