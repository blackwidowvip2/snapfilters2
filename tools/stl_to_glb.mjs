// Convert a BINARY STL → GLB, then optimise (weld/index → simplify → meshopt).
// STL is geometry only (the Materialise COLOR= attribute here is a single uniform
// colour), so the mesh gets one baseColorFactor; richer per-region colour is
// applied later in-app via a vertexColorFn (like the horse head).
//
//   node tools/stl_to_glb.mjs public/models/VipLionMask.stl public/models/VipLionMask.glb
import fs from 'fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, dedup, prune, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

const IN  = process.argv[2] || 'public/models/VipLionMask.stl';
const OUT = process.argv[3] || 'public/models/VipLionMask.glb';
const RATIO = Number(process.argv[4] ?? 0.4);   // simplify target (keep 40%)

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;

// ── Parse binary STL ───────────────────────────────────────────────────────
const buf = fs.readFileSync(IN);
const triCount = buf.readUInt32LE(80);
const expected = 84 + triCount * 50;
if (buf.length !== expected) {
  throw new Error(`Not a binary STL (size ${buf.length}, expected ${expected}). ASCII STL not supported by this script.`);
}
console.log('triangles:', triCount);

// POSITION only — flat per-face STL normals would stop weld from merging shared
// vertices (different normals = different vertex), so we drop them and compute
// smooth normals AFTER welding/simplifying.
const positions = new Float32Array(triCount * 9);
for (let i = 0; i < triCount; i++) {
  const o = 84 + i * 50;
  for (let v = 0; v < 3; v++) {
    const vo = o + 12 + v * 12;
    const p = i * 9 + v * 3;
    positions[p]     = buf.readFloatLE(vo);
    positions[p + 1] = buf.readFloatLE(vo + 4);
    positions[p + 2] = buf.readFloatLE(vo + 8);
  }
}

// ── Build a glTF document ──────────────────────────────────────────────────
const doc = new Document();
const buffer = doc.createBuffer();
const pos = doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer);

// Uniform STL colour 255,172,41 (sRGB) → linear baseColorFactor.
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const material = doc.createMaterial('lion')
  .setBaseColorFactor([s2l(255), s2l(172), s2l(41), 1])
  .setRoughnessFactor(0.85).setMetallicFactor(0.0);

const prim = doc.createPrimitive().setAttribute('POSITION', pos).setMaterial(material);
const mesh = doc.createMesh('VipLionMask').addPrimitive(prim);
const node = doc.createNode('VipLionMask').setMesh(mesh);
doc.createScene().addChild(node);

// ── Weld + simplify (now that vertices can merge by position) ───────────────
await doc.transform(
  weld(),
  dedup(),
  prune(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.001 }),
);

// ── Smooth vertex normals from the final indexed geometry ───────────────────
{
  const P = prim.getAttribute('POSITION').getArray();
  const idx = prim.getIndices().getArray();
  const N = new Float32Array(P.length);
  const ax = [0, 0, 0], bx = [0, 0, 0];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    ax[0] = P[b] - P[a]; ax[1] = P[b + 1] - P[a + 1]; ax[2] = P[b + 2] - P[a + 2];
    bx[0] = P[c] - P[a]; bx[1] = P[c + 1] - P[a + 1]; bx[2] = P[c + 2] - P[a + 2];
    const nx = ax[1] * bx[2] - ax[2] * bx[1];
    const ny = ax[2] * bx[0] - ax[0] * bx[2];
    const nz = ax[0] * bx[1] - ax[1] * bx[0];
    for (const o of [a, b, c]) { N[o] += nx; N[o + 1] += ny; N[o + 2] += nz; }
  }
  for (let i = 0; i < N.length; i += 3) {
    const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1;
    N[i] /= l; N[i + 1] /= l; N[i + 2] /= l;
  }
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer));
}

await doc.transform(
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

doc.createExtension(EXTMeshoptCompression).setRequired(true);
doc.createExtension(KHRMeshQuantization).setRequired(true);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await io.write(OUT, doc);
console.log('wrote', OUT);
