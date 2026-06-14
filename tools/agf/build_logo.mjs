// Build AGF_cap_logo.glb: place the full AGF crest PNG as a textured decal on
// the cap front (conforming to the crown curvature). The PNG background (the
// baked checkerboard) is flood-filled to transparent from the edges, stopping
// at the blue shield outline, so the WHITE inside the shield is kept.
import fs from 'fs';
import { PNG } from 'pngjs';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, dedup, prune, meshopt, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

const BLANK = 'tools/agf/AGF_cap_logo_blank.glb';
const IMG   = 'C:/Users/Black/Desktop/AGF logo.png';
const OUT   = 'public/models/AGF_cap_logo.glb';
const OUT2  = 'C:/Users/Black/Downloads/AGF_cap_logo.glb';

// ---- placement tunables (cap is ~1.08 wide) ----
const Y_CENTER = 0.260;   // vertical centre of the crest on the crown
const HEIGHT   = 0.493;   // crest visual height (arc length) — +40%
const OFFSET   = 0.012;   // raise above the cap skin (avoid z-fight)
const COLS = 30, ROWS = 30;

// ============================================================ key out PNG bg
const png = PNG.sync.read(fs.readFileSync(IMG));
const { width: IW, height: IH, data: PX } = png;
const pidx = (x, y) => (y * IW + x) * 4;
const isBg = (i) => { const r = PX[i], g = PX[i + 1], b = PX[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mn >= 205 && (mx - mn) <= 22; };
const seen = new Uint8Array(IW * IH); const stack = [];
const pushp = (x, y) => { if (x < 0 || y < 0 || x >= IW || y >= IH) return; const p = y * IW + x; if (seen[p] || !isBg(pidx(x, y))) return; seen[p] = 1; stack.push(p); };
for (let x = 0; x < IW; x++) { pushp(x, 0); pushp(x, IH - 1); }
for (let y = 0; y < IH; y++) { pushp(0, y); pushp(IW - 1, y); }
while (stack.length) { const p = stack.pop(); const x = p % IW, y = (p / IW) | 0; pushp(x + 1, y); pushp(x - 1, y); pushp(x, y + 1); pushp(x, y - 1); }
let removed = 0; for (let p = 0; p < IW * IH; p++) if (seen[p]) { PX[p * 4 + 3] = 0; removed++; }
const pngBytes = PNG.sync.write(png);
const aspect = IW / IH;
console.log(`keyed PNG ${IW}x${IH}, removed ${removed} bg px, aspect ${aspect.toFixed(3)}`);

// ============================================================ load cap + surface fit
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const cap = await io.read(BLANK);
const root = cap.getRoot();
const apply = (m, v) => [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
const cverts = []; const tmp = [0,0,0];
for (const node of root.listNodes()) { const mesh = node.getMesh(); if (!mesh) continue; const wm = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) { const pos = prim.getAttribute('POSITION'); const n = pos.getCount(); for (let i = 0; i < n; i++) { pos.getElement(i, tmp); cverts.push(apply(wm, tmp)); } } }
const crown = cverts.filter(v => !(v[1] < 0.215 && v[2] > 0.3));
function maxZ(xc, yc, r = 0.04) { let best = -Infinity; for (const v of crown) if (Math.abs(v[0]-xc) < r && Math.abs(v[1]-yc) < r && v[2] > best) best = v[2]; return best; }
const rowsA = [], rhs = [];
for (let X = -0.30; X <= 0.301; X += 0.05) for (let Y = 0.19; Y <= 0.401; Y += 0.03) { const z = maxZ(X, Y); if (z === -Infinity) continue; rowsA.push([1, X, Y, X*X, Y*Y, X*Y]); rhs.push(z); }
const N = 6; const M = Array.from({length:N},()=>new Array(N+1).fill(0));
for (let r = 0; r < rowsA.length; r++) for (let i = 0; i < N; i++) { for (let j = 0; j < N; j++) M[i][j] += rowsA[r][i]*rowsA[r][j]; M[i][N] += rowsA[r][i]*rhs[r]; }
for (let i = 0; i < N; i++) { let p = i; for (let k = i+1; k < N; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; [M[i],M[p]]=[M[p],M[i]]; const piv = M[i][i]; for (let j = i; j <= N; j++) M[i][j] /= piv; for (let k = 0; k < N; k++) if (k !== i) { const f = M[k][i]; for (let j = i; j <= N; j++) M[k][j] -= f*M[i][j]; } }
const C = M.map(r => r[N]);
const surfZ = (x,y) => C[0]+C[1]*x+C[2]*y+C[3]*x*x+C[4]*y*y+C[5]*x*y;
const dZdx  = (x,y) => C[1]+2*C[3]*x+C[5]*y;
const dZdy  = (x,y) => C[2]+2*C[4]*y+C[5]*x;
function surfPoint(x, y, off) { const z = surfZ(x,y); let nx=-dZdx(x,y), ny=-dZdy(x,y), nz=1; const L=Math.hypot(nx,ny,nz); nx/=L;ny/=L;nz/=L; return { p:[x+nx*off, y+ny*off, z+nz*off], n:[nx,ny,nz] }; }

// ============================================================ simplify the cap
// The blank cap is wildly over-tessellated (~289k tris) for a smooth surface.
// Decimate it (visually lossless) BEFORE the decal is added so only the cap is
// touched. The surface fit above was taken from the original vertices, so the
// decal placement is unaffected.
await MeshoptSimplifier.ready;
await cap.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.004, lockBorder: true }));

// Simplify keeps the original per-vertex normals, which become inconsistent
// across the newly-merged triangles -> dark shading specks. Recompute smooth
// (area-weighted) normals from the decimated geometry to remove them.
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
  const pos = prim.getAttribute('POSITION'); const idxA = prim.getIndices();
  if (!pos || !idxA) continue;
  const nv = pos.getCount(); const NN = new Float32Array(nv * 3);
  const a = [0,0,0], b = [0,0,0], c = [0,0,0]; const ic = idxA.getCount();
  for (let i = 0; i < ic; i += 3) {
    const i0 = idxA.getScalar(i), i1 = idxA.getScalar(i+1), i2 = idxA.getScalar(i+2);
    pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2], vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;   // area-weighted face normal
    for (const id of [i0,i1,i2]) { NN[id*3]+=nx; NN[id*3+1]+=ny; NN[id*3+2]+=nz; }
  }
  for (let i = 0; i < nv; i++) { const x=NN[i*3],y=NN[i*3+1],z=NN[i*3+2]; const L=Math.hypot(x,y,z)||1; NN[i*3]=x/L; NN[i*3+1]=y/L; NN[i*3+2]=z/L; }
  prim.getAttribute('NORMAL').setArray(NN);
}

// ============================================================ 6-panel seams
// Drape thin stitch lines on the real crown surface by ray-casting from an
// interior centre outward. 6 seams, 60° apart, offset 30° so the FRONT panel
// (and the crest) stays between two seams instead of being split by one.
const capTris = [];
{
  const va=[0,0,0], vb=[0,0,0], vc=[0,0,0];
  for (const node of root.listNodes()) { const mesh = node.getMesh(); if (!mesh) continue; const wm = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) { const pos = prim.getAttribute('POSITION'); const idx = prim.getIndices(); if (!idx) continue; const ic = idx.getCount();
      for (let i = 0; i < ic; i += 3) { pos.getElement(idx.getScalar(i),va); pos.getElement(idx.getScalar(i+1),vb); pos.getElement(idx.getScalar(i+2),vc);
        const A=apply(wm,va),B=apply(wm,vb),Cc=apply(wm,vc); capTris.push([A[0],A[1],A[2],B[0],B[1],B[2],Cc[0],Cc[1],Cc[2]]); } } }
}
// Radial axis must pass through the top button (the crown apex), so the seams
// converge there. Find the apex (highest vertex, averaged over the top cluster)
// and drop the ray centre straight below it.
let apexY=-Infinity;
for (const t of capTris) for (let k=0;k<9;k+=3) if (t[k+1]>apexY) apexY=t[k+1];
let ax=0,az=0,an=0;
for (const t of capTris) for (let k=0;k<9;k+=3) { const y=t[k+1]; if (y>apexY-0.03) { ax+=t[k]; az+=t[k+2]; an++; } }
const apexX=ax/an, apexZ=az/an;
const Cx=apexX, Cy=apexY-0.55, Cz=apexZ;   // centre on the vertical axis under the button
function rayTri(ox,oy,oz,dx,dy,dz,t){
  const e1x=t[3]-t[0],e1y=t[4]-t[1],e1z=t[5]-t[2], e2x=t[6]-t[0],e2y=t[7]-t[1],e2z=t[8]-t[2];
  const px=dy*e2z-dz*e2y, py=dz*e2x-dx*e2z, pz=dx*e2y-dy*e2x; const det=e1x*px+e1y*py+e1z*pz; if (Math.abs(det)<1e-9) return null;
  const inv=1/det, tx=ox-t[0],ty=oy-t[1],tz=oz-t[2]; const u=(tx*px+ty*py+tz*pz)*inv; if (u<0||u>1) return null;
  const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x; const v=(dx*qx+dy*qy+dz*qz)*inv; if (v<0||u+v>1) return null;
  const tt=(e2x*qx+e2y*qy+e2z*qz)*inv; if (tt<=1e-5) return null;
  let nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x; const L=Math.hypot(nx,ny,nz)||1; nx/=L;ny/=L;nz/=L;
  return { t:tt, n:[nx,ny,nz] };
}
function cast(dx,dy,dz){   // nearest outward hit
  let best=Infinity, bn=null;
  for (const t of capTris){ const h=rayTri(Cx,Cy,Cz,dx,dy,dz,t); if (h && h.t<best){ best=h.t; bn=h.n; } }
  if (!Number.isFinite(best)) return null;
  let n=bn; if (n[0]*dx+n[1]*dy+n[2]*dz<0) n=[-n[0],-n[1],-n[2]];   // outward
  return { p:[Cx+dx*best,Cy+dy*best,Cz+dz*best], n };
}
const SEAM_AZ = [30,90,150,210,270,330];
const PHI0 = 7*Math.PI/180, PHI1 = 72*Math.PI/180, PHI_N = 26;
// The real cap mesh is bumpy, so the seam ribbon needs enough lift to stay
// continuous over the bumps — it reads as authentic raised panel piping.
const HALF_W = 0.009, RAISE = 0.05;
const SP=[], SN=[], SIDX=[];
for (const azDeg of SEAM_AZ) {
  const th = azDeg*Math.PI/180;
  const pts=[], nrm=[];
  for (let s=0;s<=PHI_N;s++){ const phi=PHI0+(PHI1-PHI0)*s/PHI_N;
    const dx=Math.sin(phi)*Math.sin(th), dy=Math.cos(phi), dz=Math.sin(phi)*Math.cos(th);
    const hit=cast(dx,dy,dz); if (!hit) continue;
    pts.push([hit.p[0]+hit.n[0]*RAISE, hit.p[1]+hit.n[1]*RAISE, hit.p[2]+hit.n[2]*RAISE]); nrm.push(hit.n);
  }
  if (pts.length<2) continue;
  const base = SP.length/3;
  for (let k=0;k<pts.length;k++){
    const pPrev=pts[Math.max(0,k-1)], pNext=pts[Math.min(pts.length-1,k+1)];
    let tx=pNext[0]-pPrev[0], ty=pNext[1]-pPrev[1], tz=pNext[2]-pPrev[2]; const tl=Math.hypot(tx,ty,tz)||1; tx/=tl;ty/=tl;tz/=tl;
    const n=nrm[k]; // side = normal x tangent
    let ux=n[1]*tz-n[2]*ty, uy=n[2]*tx-n[0]*tz, uz=n[0]*ty-n[1]*tx; const ul=Math.hypot(ux,uy,uz)||1; ux/=ul;uy/=ul;uz/=ul;
    SP.push(pts[k][0]-ux*HALF_W, pts[k][1]-uy*HALF_W, pts[k][2]-uz*HALF_W); SN.push(n[0],n[1],n[2]);
    SP.push(pts[k][0]+ux*HALF_W, pts[k][1]+uy*HALF_W, pts[k][2]+uz*HALF_W); SN.push(n[0],n[1],n[2]);
  }
  for (let k=0;k<pts.length-1;k++){ const a=base+k*2, b=a+1, c=a+2, d=a+3; SIDX.push(a,b,d, a,d,c); }
}
console.log(`seams: ${SEAM_AZ.length} lines, verts ${SP.length/3}, tris ${SIDX.length/3}, apex Z ${apexZ.toFixed(2)}`);

// ============================================================ build decal panel
// The crown tilts back steeply, so the surface ARC LENGTH differs from the flat
// world delta — mapping the texture over flat X/Y squishes the crest. Instead we
// space the grid vertices by equal surface arc length in each direction (with
// uniform UVs), so the crest keeps the PNG's aspect ratio on the curved surface.
// HEIGHT is now the crest's visual height (vertical arc length); width = HEIGHT*aspect.
function arcSamples(dsdt, t0, S, Nn) {
  const step = 2e-4;
  let tMax = t0, a = 0; while (a < S / 2 && tMax - t0 < 3) { a += dsdt(tMax) * step; tMax += step; }
  let tMin = t0; a = 0;  while (a < S / 2 && t0 - tMin < 3) { a += dsdt(tMin) * step; tMin -= step; }
  const lut = []; let tt = tMin, acc = 0; lut.push([tt, 0]);
  while (tt < tMax) { acc += dsdt(tt) * step; tt += step; lut.push([tt, acc]); }
  const total = acc || 1; const out = []; let li = 0;
  for (let k = 0; k <= Nn; k++) { const target = total * k / Nn; while (li < lut.length - 1 && lut[li][1] < target) li++; out.push(lut[li][0]); }
  return out;
}
const WIDTH_ARC = HEIGHT * aspect;
// vertical samples (ascending Y) spaced by equal arc length along the centre line
const ys = arcSamples((y) => Math.hypot(1, dZdy(0, y)), Y_CENTER, HEIGHT, ROWS);
const P = [], Nor = [], UV = [], IDX = [];
for (let j = 0; j <= ROWS; j++) {
  const wy = ys[j];
  // per-row horizontal samples, spaced by equal arc length across the dome
  const xs = arcSamples((x) => Math.hypot(1, dZdx(x, wy)), 0, WIDTH_ARC, COLS);
  for (let i = 0; i <= COLS; i++) {
    const { p, n } = surfPoint(xs[i], wy, OFFSET);
    P.push(p[0], p[1], p[2]);
    Nor.push(n[0], n[1], n[2]);
    UV.push(i / COLS, 1 - j / ROWS);     // v=0 (image top) at largest Y (panel top)
  }
}
const vid = (i, j) => j * (COLS + 1) + i;
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
  const a = vid(i, j), b = vid(i+1, j), c = vid(i+1, j+1), d = vid(i, j+1);
  IDX.push(a, b, c, a, c, d);
}
console.log(`panel arc ${WIDTH_ARC.toFixed(3)}x${HEIGHT} (Y world ${ys[0].toFixed(3)}..${ys[ROWS].toFixed(3)}), verts ${(P.length/3)}, tris ${IDX.length/3}`);

// ============================================================ assemble glTF
const buf = root.listBuffers()[0] || cap.createBuffer();
// white cap material so the blank cap mesh shows as a clean white cap
// Off-white ("knækket hvid"), matte fabric: a non-clipping base value lets the
// lighting shade the crown/brim form so the cap's contours read instead of
// washing out to flat white.
const capMat = cap.createMaterial('cap_white').setBaseColorFactor([0.82,0.81,0.77,1]).setMetallicFactor(0).setRoughnessFactor(0.85);
for (const m of root.listMeshes()) for (const prim of m.listPrimitives()) if (!prim.getMaterial()) prim.setMaterial(capMat);

// crest texture + decal material (alpha keyed -> shield only)
const tex = cap.createTexture('AGF_crest').setImage(pngBytes).setMimeType('image/png');
const decalMat = cap.createMaterial('AGF_crest')
  .setBaseColorFactor([1,1,1,1]).setBaseColorTexture(tex)
  .setMetallicFactor(0).setRoughnessFactor(0.6)
  .setAlphaMode('BLEND').setDoubleSided(true);

const posA = cap.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buf);
const norA = cap.createAccessor().setType('VEC3').setArray(new Float32Array(Nor)).setBuffer(buf);
const uvA  = cap.createAccessor().setType('VEC2').setArray(new Float32Array(UV)).setBuffer(buf);
const idxA = cap.createAccessor().setType('SCALAR').setArray(new Uint32Array(IDX)).setBuffer(buf);
const prim = cap.createPrimitive().setAttribute('POSITION', posA).setAttribute('NORMAL', norA).setAttribute('TEXCOORD_0', uvA).setIndices(idxA).setMaterial(decalMat);
const mesh = cap.createMesh('AGF_logo_decal').addPrimitive(prim);
const node = cap.createNode('AGF_logo_decal').setMesh(mesh);
root.listScenes()[0].addChild(node);

// seams — subtle grey stitch lines (darker than the off-white so they read)
if (SP.length) {
  const seamMat = cap.createMaterial('cap_seams').setBaseColorFactor([0.10,0.12,0.26,1]).setMetallicFactor(0).setRoughnessFactor(0.8).setDoubleSided(true);
  const sposA = cap.createAccessor().setType('VEC3').setArray(new Float32Array(SP)).setBuffer(buf);
  const snorA = cap.createAccessor().setType('VEC3').setArray(new Float32Array(SN)).setBuffer(buf);
  const sidxA = cap.createAccessor().setType('SCALAR').setArray(new Uint32Array(SIDX)).setBuffer(buf);
  const sprim = cap.createPrimitive().setAttribute('POSITION', sposA).setAttribute('NORMAL', snorA).setIndices(sidxA).setMaterial(seamMat);
  const smesh = cap.createMesh('cap_seams').addPrimitive(sprim);
  root.listScenes()[0].addChild(cap.createNode('cap_seams').setMesh(smesh));
}

// ============================================================ optimise + write
await cap.transform(weld(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(OUT, cap);
fs.copyFileSync(OUT, OUT2);
console.log('WROTE', OUT, '(' + fs.statSync(OUT).size + ' bytes) and', OUT2);
