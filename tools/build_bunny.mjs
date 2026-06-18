// Optimise the Bunny ears+nose GLB for the web with minimal quality loss:
//   weld/dedup/prune → conservative mesh simplify → texture resize (→1024)
//   → meshopt compression + quantization.
// The 15 MB source is ~306k triangles + ~6 MB of JPEG textures. A face prop
// pooled 4× does not need that density, so a gentle simplify (keep 55%, tight
// error) plus meshopt geometry compression brings it down dramatically while
// staying visually identical. The app's GLTFLoader already has the Meshopt
// decoder wired up (see filters/props/sunglasses.ts).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, dedup, prune, simplify, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const IN  = process.argv[2] || 'public/models/Bunny_ears_nose.glb';
const OUT = process.argv[3] || 'public/models/Bunny_ears_nose.opt.glb';

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(IN);

await doc.transform(
  weld(),
  dedup(),
  prune(),
  // Keep 55% of triangles with a tight error bound → no visible change on a
  // smooth organic shape, but a big geometry cut from 306k tris.
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.55, error: 0.001 }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 85 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

doc.createExtension(EXTMeshoptCompression).setRequired(true);
doc.createExtension(KHRMeshQuantization).setRequired(true);

await io.write(OUT, doc);
console.log('wrote', OUT);
