// Optimise a GLB without visible quality loss:
//   weld/dedup/prune → texture resize (2048→1024) → meshopt compression.
// The app's GLTFLoader already has the Meshopt decoder wired up (see
// filters/props/sunglasses.ts), so meshopt-compressed output loads directly.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, dedup, prune, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const IN  = process.argv[2];
const OUT = process.argv[3];

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(IN);

await doc.transform(
  weld(),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 85 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

doc.createExtension(EXTMeshoptCompression).setRequired(true);
doc.createExtension(KHRMeshQuantization).setRequired(true);

await io.write(OUT, doc);
console.log('wrote', OUT);
