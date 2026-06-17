// Splay the LEFT temple arm of the Groucho disguise slightly outward (away from
// the head) so both arms point symmetrically. The arm is several separate shells
// (components); we union-find them and pick the ones whose CENTROID is far-left
// and behind the frame (cx < -0.7 && cz < -0.05), then rotate those WHOLE shells
// rigidly about a vertical (Y) axis through the hinge (their frontmost point).
// Rotating whole shells can't tear them, and the hinge barely moves, so the
// arm-to-frame overlap is preserved with no gap.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, dedup, prune, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const IN    = 'C:/Users/Black/Downloads/Groucho_disguise.glb';
const OUT   = 'public/models/Groucho_disguise.glb';
const ANGLE = (process.argv.find(a => a.startsWith('--deg='))?.split('=')[1] ?? 9) * Math.PI / 180;
const RENDER = process.argv.includes('--render');

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(IN);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION');
const idx = prim.getIndices();
const N = pos.getCount();
const v = [0, 0, 0];

// ── Connected components, then pick the left-temple shells by centroid ──────
const parent = new Int32Array(N);
for (let i = 0; i < N; i++) parent[i] = i;
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
const uni  = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
const ic = idx.getCount();
for (let i = 0; i < ic; i += 3) { uni(idx.getScalar(i), idx.getScalar(i + 1)); uni(idx.getScalar(i + 1), idx.getScalar(i + 2)); }
const comp = {};
for (let i = 0; i < N; i++) { const r = find(i); if (!comp[r]) comp[r] = { n: 0, sx: 0, sz: 0 }; const c = comp[r]; pos.getElement(i, v); c.n++; c.sx += v[0]; c.sz += v[2]; }
const isLeftTemple = (root) => { const c = comp[root]; return (c.sx / c.n) < -0.7 && (c.sz / c.n) < -0.05; };
const inSel = (i) => isLeftTemple(find(i));

// Hinge = frontmost point of the selected arm (x averaged at z≈max).
let hz = -1e9;
for (let i = 0; i < N; i++) { if (inSel(i)) { pos.getElement(i, v); if (v[2] > hz) hz = v[2]; } }
let hxSum = 0, hxN = 0;
for (let i = 0; i < N; i++) { if (inSel(i)) { pos.getElement(i, v); if (v[2] > hz - 0.05) { hxSum += v[0]; hxN++; } } }
const hx = hxSum / hxN;
console.log('hinge x,z =', hx.toFixed(3), hz.toFixed(3), 'angle deg =', (ANGLE * 180 / Math.PI).toFixed(1));

const cos = Math.cos(ANGLE), sin = Math.sin(ANGLE);
let nRot = 0;
for (let i = 0; i < N; i++) {
  if (!inSel(i)) continue;
  pos.getElement(i, v);
  const dx = v[0] - hx, dz = v[2] - hz;
  // +ANGLE pushes the back of the arm (dz<0) to more-negative x = outward.
  v[0] = hx + dx * cos + dz * sin;
  v[2] = hz - dx * sin + dz * cos;
  pos.setElement(i, v);
  nRot++;
}
console.log('rotated', nRot, 'vertices');

if (RENDER) {
  const W = 400, H = 400, img = Buffer.alloc(W * H * 3, 25);
  for (let i = 0; i < N; i++) {
    pos.getElement(i, v);
    const px = Math.floor((v[0] + 1.1) / 2.2 * W), py = Math.floor((1.1 - v[2]) / 2.2 * H);
    if (px < 0 || px >= W || py < 0 || py >= H) continue;
    const o = (py * W + px) * 3;
    if (v[0] < 0) { img[o] = 230; img[o + 1] = 80; img[o + 2] = 80; } else { img[o] = 80; img[o + 1] = 140; img[o + 2] = 230; }
  }
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile('.debug/top_rot.png');
  console.log('rendered .debug/top_rot.png');
}

await doc.transform(
  weld(), dedup(), prune(),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 85 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true);
doc.createExtension(KHRMeshQuantization).setRequired(true);
await io.write(OUT, doc);
console.log('wrote', OUT);
