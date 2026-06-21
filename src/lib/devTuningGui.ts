// ════════════════════════════════════════════════════════════════════════
//  Dev-only lil-gui panel for tuning 3D eye-anchored masks live.
//
//  Loaded ONLY via `if (import.meta.env.DEV) import('./devTuningGui')` so both
//  this module and the lil-gui dependency are tree-shaken out of production.
//  It binds sliders to the mutable objects in devTuning.ts; the mask updater
//  reads those same objects every frame, so dragging a slider moves the mask
//  immediately. A "📋 Log to console" button prints a paste-ready code line.
// ════════════════════════════════════════════════════════════════════════
import GUI from 'lil-gui';
import { getMaskTuning, tuningIds, type MaskTuning } from './devTuning';

let gui: GUI | null = null;
const folders: Record<string, GUI> = {};
let current = '';

function buildFolder(id: string) {
  const t = getMaskTuning(id);
  if (!t || !gui) return;
  const f = gui.addFolder(id);
  // Eye anchor: where the model's eyes sit, in normalised model coords.
  f.add(t, 'eyeNx', 0, 1, 0.005).name('eyeNx (←→)');
  f.add(t, 'eyeNy', 0, 1, 0.005).name('eyeNy (↓↑)');
  f.add(t, 'eyeNz', 0, 1, 0.005).name('eyeNz (depth)');
  f.add(t, 'scaleMul', 0.3, 2.5, 0.01).name('scale');
  // Build rotation, in degrees for readability.
  f.add(t, 'rotX', -180, 180, 1).name('rot X°');
  f.add(t, 'rotY', -180, 180, 1).name('rot Y°');
  f.add(t, 'rotZ', -180, 180, 1).name('rot Z°');
  f.add({ log: () => logLine(id, t) }, 'log').name('📋 Log to console');
  folders[id] = f;
}

// Print a paste-ready updateEyeAnchoredMask(...) call + rotation block. Rotation
// is shown both in degrees and as the Math.PI fractions the source uses.
function logLine(id: string, t: MaskTuning) {
  const rad = (d: number) => {
    if (d === 0) return '0';
    const frac = d / 180; // multiples of π
    const r = (d * Math.PI / 180).toFixed(4);
    // Show nice π forms for the common 90/180 cases.
    if (Math.abs(frac) === 1) return frac > 0 ? 'Math.PI' : '-Math.PI';
    if (Math.abs(frac) === 0.5) return frac > 0 ? 'Math.PI / 2' : '-Math.PI / 2';
    return r;
  };
  console.log(
    `[tuning] ${id}:\n` +
    `  updateEyeAnchoredMask(${t.eyeNx.toFixed(3)}, ${t.eyeNy.toFixed(3)}, ` +
    `${t.eyeNz.toFixed(3)}, ${t.scaleMul.toFixed(2)}, '${id}'),\n` +
    `  rotation: { x: ${rad(t.rotX)}, y: ${rad(t.rotY)}, z: ${rad(t.rotZ)} }   ` +
    `// (${t.rotX}°, ${t.rotY}°, ${t.rotZ}°)`,
  );
}

/** Create the panel (once) and show only the active filter's folder. */
export function showTuning(activeFilter: string) {
  if (current === activeFilter) return;
  current = activeFilter;

  if (!gui) {
    gui = new GUI({ title: '🦖 Mask tuning (dev)' });
    for (const id of tuningIds()) buildFolder(id);
  }
  // A folder only exists for ids that registered tuning (the eye-anchored masks).
  for (const [id, f] of Object.entries(folders)) {
    if (id === activeFilter) { f.show(); f.open(); }
    else { f.hide(); }
  }
  // Hide the whole panel when no tunable mask is active.
  if (folders[activeFilter]) gui.show();
  else gui.hide();
}
