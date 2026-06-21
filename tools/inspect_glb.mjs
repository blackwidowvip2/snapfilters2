// Quick composition report for a GLB: triangle count, texture sizes, and which
// bytes dominate — so we can pick a sane optimisation strategy per model.
//   node tools/inspect_glb.mjs public/models/Foo.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      tris += (idx ? idx.getCount() : pos.getCount()) / 3;
    }
  const texes = doc.getRoot().listTextures().map(t => {
    const img = t.getImage();
    const size = t.getSize();
    return `${size ? size.join('x') : '?'} ${t.getMimeType()} ${(img?.byteLength / 1024 | 0)}KB`;
  });
  console.log(`\n${file}`);
  console.log(`  triangles: ${tris | 0}`);
  console.log(`  textures (${texes.length}): ${texes.join(' | ') || 'none'}`);
}
