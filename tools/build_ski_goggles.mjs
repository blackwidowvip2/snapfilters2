// Build a 3D ski-goggle mask (single wrap-around shield) from scratch and write
// it as a GLB, coloured like the reference photo: a hot-pink frame around a
// mirrored lens that fades from blue at the edges to orange/yellow in the centre.
// No strap — just the front mask, oriented facing +Z so it wears like the other
// glasses props (createSunglassesFromGLB auto-centres + auto-fits it to the face).
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';

// ── 2-D outline of the shield (right half; mirrored to the left) ────────────
// A rounded wide top with the bottom sweeping to a soft central nose point.
function halfOutline() {
  const c = new THREE.Path();
  c.moveTo(0, 0.52);                       // top centre
  c.bezierCurveTo(0.45, 0.54, 0.82, 0.46, 0.98, 0.22);  // top-right shoulder
  c.bezierCurveTo(1.04, 0.05, 1.03, -0.12, 0.96, -0.26); // right side
  c.bezierCurveTo(0.86, -0.42, 0.62, -0.5, 0.34, -0.52); // lower-right hump
  c.bezierCurveTo(0.20, -0.53, 0.10, -0.5, 0.0, -0.42);  // down to nose point
  return c.getPoints(40);
}

// Full closed outline scaled toward the centre by `k` (for the inner lens edge).
function outline(k = 1, cx = 0, cy = 0) {
  const right = halfOutline();
  const pts = [];
  for (const p of right) pts.push(new THREE.Vector2(cx + (p.x - cx) * k, cy + (p.y - cy) * k));
  for (let i = right.length - 1; i >= 0; i--) {
    const p = right[i];
    pts.push(new THREE.Vector2(cx - (p.x - cx) * k, cy + (p.y - cy) * k));
  }
  return pts;
}

function shapeFrom(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i].x, pts[i].y);
  s.closePath();
  return s;
}

// Wrap the flat geometry around a vertical axis so the sides curve back toward
// the ears, and push everything to its final depth.
function bend(geo, R, zBase) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const t = x / R;
    p.setX(i, R * Math.sin(t));
    p.setZ(i, zBase + z - R * (1 - Math.cos(t)));
  }
  geo.computeVertexNormals();
  return geo;
}

// ── Frame: ring between the outer outline and the lens hole, extruded ────────
const FRAME_DEPTH = 0.14, LENS_DEPTH = 0.05;
const outer = shapeFrom(outline(1.0));
outer.holes = [new THREE.Path(outline(0.84))];   // lens hole (ExtrudeGeometry wants a Path)

let frameGeo = new THREE.ExtrudeGeometry(outer, { depth: FRAME_DEPTH, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 3, curveSegments: 24 });
frameGeo.translate(0, 0, -FRAME_DEPTH / 2);
frameGeo = bend(frameGeo, 1.9, 0.0);

// ── Lens: a TESSELLATED shield surface (interior vertices) so the radial mirror
// gradient renders smoothly — orange/yellow centre → blue at the rim. Built as a
// grid clipped to the inner outline polygon, then bent to wrap the face. ───────
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function buildLens() {
  const poly = outline(0.85);
  const step = 0.035;
  const xs = [], ys = [];
  for (let x = -1.1; x <= 1.1; x += step) xs.push(x);
  for (let y = -0.6; y <= 0.6; y += step) ys.push(y);
  const idxMap = new Map();   // "ix,iy" -> vertex index
  const verts = [], cols = [];
  const center = new THREE.Color(0xffd23a), mid = new THREE.Color(0xff7e1a), edge = new THREE.Color(0x1666ff);
  const c = new THREE.Color();
  const add = (ix, iy) => {
    const key = ix + ',' + iy;
    let id = idxMap.get(key);
    if (id !== undefined) return id;
    const x = xs[ix], y = ys[iy];
    id = verts.length / 3; verts.push(x, y, 0);
    const r = Math.min(1, Math.hypot(x / 1.0, (y - 0.05) / 0.52));   // 0 centre → 1 rim
    if (r < 0.6) c.copy(center).lerp(mid, r / 0.6);
    else c.copy(mid).lerp(edge, (r - 0.6) / 0.4);
    cols.push(c.r, c.g, c.b);
    idxMap.set(key, id);
    return id;
  };
  const tris = [];
  for (let ix = 0; ix < xs.length - 1; ix++) for (let iy = 0; iy < ys.length - 1; iy++) {
    const cx = (xs[ix] + xs[ix + 1]) / 2, cy = (ys[iy] + ys[iy + 1]) / 2;
    if (!pointInPoly(cx, cy, poly)) continue;       // keep cells whose centre is inside
    const a = add(ix, iy), b = add(ix + 1, iy), d = add(ix, iy + 1), e = add(ix + 1, iy + 1);
    tris.push(a, b, d, b, e, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  g.setIndex(tris);
  return g;
}
let lensGeo = bend(buildLens(), 1.9, -0.02);   // sit just behind the frame front

// ── Assemble a glTF document ────────────────────────────────────────────────
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene();

function addMesh(geo, name, material) {
  geo = geo.toNonIndexed ? geo : geo;
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const idx = geo.index;
  const prim = doc.createPrimitive().setMaterial(material);
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos.array)).setBuffer(buffer));
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor.array)).setBuffer(buffer));
  if (geo.attributes.color) {
    prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(new Float32Array(geo.attributes.color.array)).setBuffer(buffer));
  }
  if (idx) prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx.array)).setBuffer(buffer));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  scene.addChild(doc.createNode(name).setMesh(mesh));
}

const pink = doc.createMaterial('FramePink')
  .setBaseColorFactor([1.0, 0.13, 0.46, 1.0])
  .setMetallicFactor(0.1).setRoughnessFactor(0.35);
const mirror = doc.createMaterial('Lens')
  .setBaseColorFactor([1, 1, 1, 1])
  .setMetallicFactor(1.0).setRoughnessFactor(0.18)
  .setEmissiveFactor([0.25, 0.18, 0.05])
  .setDoubleSided(true);

addMesh(frameGeo, 'Frame', pink);
addMesh(lensGeo, 'Lens', mirror);

const OUT = process.argv[2] || 'public/models/Ski_goggles.glb';
await new NodeIO().write(OUT, doc);
console.log('wrote', OUT);
