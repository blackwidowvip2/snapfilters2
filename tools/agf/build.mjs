// Build a 3D AGF text emboss from "AGF tekst.jpg" and place it on the cap front.
// Pipeline: decode jpg -> smooth silhouette -> marching-squares contours (with holes)
// -> earcut triangulation -> extrude along the fitted crown-surface normal -> merge into cap GLB.
import fs from 'fs';
import jpeg from 'jpeg-js';
import earcut from 'earcut';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const CAP_IN  = 'C:/Users/Black/Downloads/AGF_cap_uden_logo.glb';
const IMG_IN  = 'C:/Users/Black/Desktop/AGF tekst.jpg';
const OUT     = 'C:/Users/Black/Downloads/AGF_cap.glb';

// ---- tunables ----
const LUM_THRESH = 140;      // logo = pixels darker than this
const SS         = 3;        // supersample factor for smoother contours
const BLUR_PASSES= 2;
const SIMPLIFY   = 1.4;      // Douglas-Peucker epsilon (supersampled px)
const TARGET_W   = 0.52;     // logo world width (cap is ~1.08 wide)
const Y_CENTER   = 0.275;    // vertical placement on crown (lowered a bit)
const EMBOSS     = 0.014;    // raised thickness
const BACK_SINK  = 0.003;    // sink back face just under cap skin (avoid z-fight)
const COLOR      = [1.0, 1.0, 1.0];       // white

// ============================================================ image -> mask
const img = jpeg.decode(fs.readFileSync(IMG_IN), { useTArray: true });
const W = img.width, H = img.height, D = img.data;
const base = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const lum = 0.299 * D[i] + 0.587 * D[i + 1] + 0.114 * D[i + 2];
  base[y * W + x] = lum < LUM_THRESH ? 1 : 0;
}
// content bbox (in original px)
let minx = W, maxx = 0, miny = H, maxy = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (base[y * W + x]) {
  if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
}
const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, wpx = maxx - minx;
const scale = TARGET_W / wpx;           // world units per original px

// supersample + blur into a scalar field GW x GH, with a 1px empty border so
// boundary contours close cleanly.
const GW = W * SS + 2, GH = H * SS + 2;
let F = new Float32Array(GW * GH);
for (let y = 0; y < H * SS; y++) for (let x = 0; x < W * SS; x++)
  F[(y + 1) * GW + (x + 1)] = base[((y / SS) | 0) * W + ((x / SS) | 0)];
for (let p = 0; p < BLUR_PASSES; p++) {
  const G = new Float32Array(GW * GH);
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += F[(y + dy) * GW + (x + dx)];
    G[y * GW + x] = s / 9;
  }
  F = G;
}
// map supersampled grid coord -> original px -> world (x,y)
const gx2px = gx => ((gx - 1) / SS);
const gy2px = gy => ((gy - 1) / SS);
const toWorld = (gx, gy) => [ (gx2px(gx) - cx) * scale, Y_CENTER - (gy2px(gy) - cy) * scale ];

// ============================================================ marching squares
const ISO = 0.5;
const verts = new Map();   // key -> index
const vlist = [];          // [gx,gy]
function vid(key, gx, gy) { let id = verts.get(key); if (id === undefined) { id = vlist.length; vlist.push([gx, gy]); verts.set(key, id); } return id; }
const interp = (a, b) => (ISO - a) / (b - a);
// edge points (keyed by edge identity so neighbouring cells share exact verts)
function hEdge(x, y) { const a = F[y * GW + x], b = F[y * GW + x + 1]; const t = interp(a, b); return vid('H' + x + '_' + y, x + t, y); }
function vEdge(x, y) { const a = F[y * GW + x], b = F[(y + 1) * GW + x]; const t = interp(a, b); return vid('V' + x + '_' + y, x, y + t); }
const adj = new Map();     // undirected adjacency  id -> Set(ids)
function link(a, b) { if (a === b) return; (adj.get(a) || adj.set(a, new Set()).get(a)).add(b); (adj.get(b) || adj.set(b, new Set()).get(b)).add(a); }
for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
  const tl = F[y * GW + x] >= ISO, tr = F[y * GW + x + 1] >= ISO, br = F[(y + 1) * GW + x + 1] >= ISO, bl = F[(y + 1) * GW + x] >= ISO;
  const c = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
  if (c === 0 || c === 15) continue;
  const T = () => hEdge(x, y), B = () => hEdge(x, y + 1), L = () => vEdge(x, y), R = () => vEdge(x + 1, y);
  switch (c) {
    case 1: case 14: link(L(), B()); break;
    case 2: case 13: link(B(), R()); break;
    case 3: case 12: link(L(), R()); break;
    case 4: case 11: link(T(), R()); break;
    case 6: case 9:  link(T(), B()); break;
    case 7: case 8:  link(L(), T()); break;
    case 5:  link(L(), T()); link(B(), R()); break;   // saddle
    case 10: link(L(), B()); link(T(), R()); break;   // saddle
  }
}
// stitch loops
const used = new Set();
const loops = [];
for (const start of adj.keys()) {
  if (used.has(start)) continue;
  const loop = [start]; used.add(start);
  let cur = start, prev = -1;
  while (true) {
    let next = -1;
    for (const n of adj.get(cur)) if (n !== prev && !used.has(n)) { next = n; break; }
    if (next === -1) { // close back to start if possible
      break;
    }
    used.add(next); loop.push(next); prev = cur; cur = next;
  }
  if (loop.length >= 3) loops.push(loop.map(id => vlist[id]));
}

// ============================================================ simplify
function simplify(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = 1; keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); const A = pts[a], Bp = pts[b];
    let dmax = 0, idx = -1; const dx = Bp[0] - A[0], dy = Bp[1] - A[1]; const L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - A[0]) * dy - (pts[i][1] - A[1]) * dx) / L; if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > eps && idx !== -1) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
let rings = loops.map(l => simplify(l, SIMPLIFY)).filter(r => r.length >= 3);

// ============================================================ classify holes
function area(r) { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function pip(pt, r) { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1]; if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
const reps = rings.map(r => r[0]);
const parent = rings.map((r, i) => {
  let best = -1, bestA = Infinity;
  for (let j = 0; j < rings.length; j++) if (j !== i && pip(reps[i], rings[j])) { const a = Math.abs(area(rings[j])); if (a < bestA) { bestA = a; best = j; } }
  return best;
});
const depth = rings.map((_, i) => { let d = 0, p = parent[i]; while (p !== -1) { d++; p = parent[p]; } return d; });

// ============================================================ surface fit (crown front)
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const cap = await io.read(CAP_IN);
const apply = (m, v) => [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
const cverts = []; const tmp = [0,0,0];
for (const node of cap.getRoot().listNodes()) { const mesh = node.getMesh(); if (!mesh) continue; const wm = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) { const pos = prim.getAttribute('POSITION'); const n = pos.getCount(); for (let i = 0; i < n; i++) { pos.getElement(i, tmp); cverts.push(apply(wm, tmp)); } } }
const crown = cverts.filter(v => !(v[1] < 0.215 && v[2] > 0.3));   // drop brim
function maxZ(xc, yc, r = 0.04) { let best = -Infinity; for (const v of crown) if (Math.abs(v[0]-xc) < r && Math.abs(v[1]-yc) < r && v[2] > best) best = v[2]; return best; }
// least-squares quadratic z = a+bx+cy+dx^2+ey^2+fxy
const rowsA = [], rhs = [];
for (let X = -0.30; X <= 0.301; X += 0.05) for (let Y = 0.19; Y <= 0.401; Y += 0.03) { const z = maxZ(X, Y); if (z === -Infinity) continue; rowsA.push([1, X, Y, X*X, Y*Y, X*Y]); rhs.push(z); }
// normal equations (6x6) + Gaussian elimination
const N = 6; const M = Array.from({length:N},()=>new Array(N+1).fill(0));
for (let r = 0; r < rowsA.length; r++) for (let i = 0; i < N; i++) { for (let j = 0; j < N; j++) M[i][j] += rowsA[r][i]*rowsA[r][j]; M[i][N] += rowsA[r][i]*rhs[r]; }
for (let i = 0; i < N; i++) { let p = i; for (let k = i+1; k < N; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; [M[i],M[p]]=[M[p],M[i]]; const piv = M[i][i]; for (let j = i; j <= N; j++) M[i][j] /= piv; for (let k = 0; k < N; k++) if (k !== i) { const f = M[k][i]; for (let j = i; j <= N; j++) M[k][j] -= f*M[i][j]; } }
const C = M.map(r => r[N]);   // [a,b,c,d,e,f]
const surfZ = (x,y) => C[0]+C[1]*x+C[2]*y+C[3]*x*x+C[4]*y*y+C[5]*x*y;
const dZdx  = (x,y) => C[1]+2*C[3]*x+C[5]*y;
const dZdy  = (x,y) => C[2]+2*C[4]*y+C[5]*x;
function surfPoint(x, y, off) { const z = surfZ(x,y); let nx = -dZdx(x,y), ny = -dZdy(x,y), nz = 1; const L = Math.hypot(nx,ny,nz); nx/=L; ny/=L; nz/=L; return [x + nx*off, y + ny*off, z + nz*off]; }

// ============================================================ build geometry (flat, non-indexed)
const P = [], Nrm = [];
function tri(a, b, c) {
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2], vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const L=Math.hypot(nx,ny,nz)||1; nx/=L;ny/=L;nz/=L;
  for (const p of [a,b,c]) { P.push(p[0],p[1],p[2]); Nrm.push(nx,ny,nz); }
}
// world position of a ring point at given normal offset
const place = (pt, off) => { const [wx, wy] = toWorld(pt[0], pt[1]); return surfPoint(wx, wy, off); };

let faceTris = 0, wallTris = 0;
for (let i = 0; i < rings.length; i++) {
  if (depth[i] % 2 !== 0) continue;            // odd depth = hole, handled by its parent
  const outer = rings[i];
  const holeRings = rings.filter((_, j) => parent[j] === i && depth[j] % 2 === 1);
  // assemble flat coords for earcut: outer (positive area) then holes (negative area)
  const oo = area(outer) > 0 ? outer : [...outer].reverse();
  const coords = []; const holeIdx = []; const ringSeq = [oo];
  for (const p of oo) coords.push(p[0], p[1]);
  for (const h of holeRings) { holeIdx.push(coords.length / 2); const hh = area(h) < 0 ? h : [...h].reverse(); ringSeq.push(hh); for (const p of hh) coords.push(p[0], p[1]); }
  const idx = earcut(coords, holeIdx, 2);
  const flat = []; for (const r of ringSeq) for (const p of r) flat.push(p);
  // front + back faces
  for (let t = 0; t < idx.length; t += 3) {
    const a = flat[idx[t]], b = flat[idx[t+1]], c = flat[idx[t+2]];
    tri(place(a, EMBOSS), place(b, EMBOSS), place(c, EMBOSS));               // front (raised)
    tri(place(a, -BACK_SINK), place(c, -BACK_SINK), place(b, -BACK_SINK));   // back (sunk, reversed)
    faceTris += 2;
  }
  // walls for outer + holes
  for (const r of ringSeq) {
    for (let k = 0; k < r.length; k++) {
      const p = r[k], q = r[(k + 1) % r.length];
      const pf = place(p, EMBOSS), qf = place(q, EMBOSS), pb = place(p, -BACK_SINK), qb = place(q, -BACK_SINK);
      tri(pb, qb, qf); tri(pb, qf, pf); wallTris += 2;
    }
  }
}
console.log(`rings=${rings.length} (outers triangulated), faceTris=${faceTris}, wallTris=${wallTris}, verts=${P.length/3}`);

// ============================================================ write into a copy of the cap doc
const root = cap.getRoot();
const buffer = root.listBuffers()[0] || cap.createBuffer();
const posAcc = cap.createAccessor('AGF_pos').setType('VEC3').setArray(new Float32Array(P)).setBuffer(buffer);
const nrmAcc = cap.createAccessor('AGF_nrm').setType('VEC3').setArray(new Float32Array(Nrm)).setBuffer(buffer);
const mat = cap.createMaterial('AGF_blue').setBaseColorFactor([...COLOR, 1]).setMetallicFactor(0).setRoughnessFactor(0.45).setDoubleSided(true);
const prim = cap.createPrimitive().setAttribute('POSITION', posAcc).setAttribute('NORMAL', nrmAcc).setMaterial(mat);
const mesh = cap.createMesh('AGF_text').addPrimitive(prim);
const node = cap.createNode('AGF_text').setMesh(mesh);
root.listScenes()[0].addChild(node);

// ---- optimise: clean up + meshopt compression (visually lossless) ----
// weld merges coincident verts, dedup/prune drop redundant data, meshopt
// quantises + compresses geometry (EXT_meshopt_compression). The snapfilters
// loader already installs MeshoptDecoder, so it decodes transparently.
await cap.transform(
  weld(),
  dedup(),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(OUT, cap);
console.log('WROTE', OUT);
