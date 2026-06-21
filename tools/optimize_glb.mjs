// Optimise a GLB without visible quality loss:
//   weld/dedup/prune → [simplify] → texture resize (2048→1024) → meshopt.
// The app's GLTFLoader already has the Meshopt decoder wired up (see
// filters/props/sunglasses.ts), so meshopt-compressed output loads directly.
//
//   node tools/optimize_glb.mjs <in.glb> <out.glb> [ratio=1]
//
// ratio is the simplify target (fraction of triangles to KEEP). The shipped
// GLBs were already weld/meshopt'd but never SIMPLIFIED, so they stayed large
// despite modest 1024² textures — passing e.g. 0.5 halves the poly count, which
// is where the real size win is for these geometry-dominated props.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, dedup, prune, simplify, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const IN  = process.argv[2];
const OUT = process.argv[3];
const RATIO = Number(process.argv[4] ?? 1);   // 1 = no simplify (back-compat)

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(IN);

const triCount = () => {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices(), pos = prim.getAttribute('POSITION');
      n += (idx ? idx.getCount() : pos.getCount()) / 3;
    }
  return n | 0;
};
console.log('triangles in :', triCount());

await doc.transform(
  weld(),
  dedup(),
  prune(),
  ...(RATIO < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.001 })] : []),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 85 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
console.log('triangles out:', triCount());

doc.createExtension(EXTMeshoptCompression).setRequired(true);
doc.createExtension(KHRMeshQuantization).setRequired(true);

await io.write(OUT, doc);
console.log('wrote', OUT);
