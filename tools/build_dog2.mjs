// Full rebuild of Hund 2 from the pristine fused source (Downloads original).
// The mesh is a triangle-soup (no shared vertices), so parts are separated by
// triangle-centroid POSITION, not connectivity:
//   • Ears   = centroid Y > EAR_Y   — baked higher by EARS_LIFT.
//   • Tongue = centroid Y < TONGUE_Y — re-centred so its node origin is the tongue
//              TOP (mouth attachment); the renderer scales it with mouth-openness.
//   • Body   = the muzzle/nose — baked higher by BODY_LIFT. A detached "excess"
//              sliver under one ear (centroid X > SLIVER_X in the muzzle band) is
//              dropped.
// Textures are downsized to 1024 and geometry meshopt-compressed (the app's loader
// has the Meshopt decoder wired up).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt, textureCompress, weld, dedup, prune, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const IN  = process.argv[2] || 'C:/Users/Black/Downloads/Dog_Face_painted.glb';
const OUT = process.argv[3] || 'public/models/Dog_Face_painted.glb';

const EAR_Y = 0.40, TONGUE_Y = -0.23;   // region cuts (model units, height ±1)
const SLIVER_X = 0.35;                   // drop muzzle triangles right of this (the excess)
const EARS_LIFT = 0.65;                  // ears up
const BODY_LIFT = 0.50;                  // muzzle/nose up
const TONGUE_DROP = -0.30;               // tongue start well ABOVE its attach (above the mouth middle)
const SIMPLIFY_RATIO = 0.5;              // keep ~50% of triangles (smaller file, faster load)

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(IN);
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 85 }));

const root = doc.getRoot();
const buffer = root.listBuffers()[0];
const srcMesh = root.listMeshes()[0];
const prim = srcMesh.listPrimitives()[0];
const material = prim.getMaterial();
const POS = prim.getAttribute('POSITION'), NOR = prim.getAttribute('NORMAL'), UV = prim.getAttribute('TEXCOORD_0');
const idx = prim.getIndices();
const triCount = idx.getCount() / 3;

const pa = [0, 0, 0], pb = [0, 0, 0], pc = [0, 0, 0];
const regions = { Ears: [], Body: [], Tongue: [] };
let dropped = 0;
for (let t = 0; t < triCount; t++) {
  const a = idx.getScalar(t * 3), b = idx.getScalar(t * 3 + 1), c = idx.getScalar(t * 3 + 2);
  POS.getElement(a, pa); POS.getElement(b, pb); POS.getElement(c, pc);
  const cy = (pa[1] + pb[1] + pc[1]) / 3;
  if (cy > EAR_Y) { regions.Ears.push(a, b, c); }
  else if (cy < TONGUE_Y) { regions.Tongue.push(a, b, c); }
  else {
    const cx = (pa[0] + pb[0] + pc[0]) / 3;
    if (cx > SLIVER_X) { dropped++; continue; }   // detached excess under one ear
    regions.Body.push(a, b, c);
  }
}

const tmp = [0, 0, 0], tmpN = [0, 0, 0], tmpUV = [0, 0];
function buildNode(name, verts, offset) {
  const remap = new Map(); const pos = [], nor = [], uv = [], indices = [];
  for (const vi of verts) {
    let ni = remap.get(vi);
    if (ni === undefined) {
      ni = remap.size; remap.set(vi, ni);
      POS.getElement(vi, tmp); pos.push(tmp[0] - offset[0], tmp[1] - offset[1], tmp[2] - offset[2]);
      NOR.getElement(vi, tmpN); nor.push(tmpN[0], tmpN[1], tmpN[2]);
      UV.getElement(vi, tmpUV); uv.push(tmpUV[0], tmpUV[1]);
    }
    indices.push(ni);
  }
  const p = doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices)).setBuffer(buffer));
  return doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p));
}

// Tongue pivot: top-centre of the tongue (X≈0, max Y, mean Z).
let tMaxY = -Infinity, tzSum = 0, tCount = 0; const seen = new Set();
for (const vi of regions.Tongue) {
  if (seen.has(vi)) continue; seen.add(vi);
  POS.getElement(vi, tmp); if (tmp[1] > tMaxY) tMaxY = tmp[1]; tzSum += tmp[2]; tCount++;
}
const pivot = [0, tMaxY, tzSum / tCount];

const scene = root.listScenes()[0];
const earsNode = buildNode('Ears', regions.Ears, [0, -EARS_LIFT, 0]);
const bodyNode = buildNode('Body', regions.Body, [0, -BODY_LIFT, 0]);
const tongueNode = buildNode('Tongue', regions.Tongue, pivot)
  .setTranslation([pivot[0], pivot[1] - TONGUE_DROP, pivot[2]]);
scene.addChild(earsNode).addChild(bodyNode).addChild(tongueNode);
srcMesh.dispose();
for (const n of root.listNodes()) if (!n.getMesh()) n.dispose();

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: SIMPLIFY_RATIO, error: 0.008 }),
  dedup(), prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true);
doc.createExtension(KHRMeshQuantization).setRequired(true);
await io.write(OUT, doc);
console.log('tris:', { Ears: regions.Ears.length / 3, Body: regions.Body.length / 3, Tongue: regions.Tongue.length / 3 }, 'sliver dropped', dropped);
console.log('pivot', pivot.map(x => +x.toFixed(3)), '→ wrote', OUT);
