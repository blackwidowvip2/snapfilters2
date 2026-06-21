// ════════════════════════════════════════════════════════════════════════
//  Dev-only live tuning store for 3D eye-anchored masks.
//
//  Tuning a mask (eyeNx/eyeNy/eyeNz/scaleMul + build rotation) used to be an
//  edit → reload → eyeball → repeat loop. This holds those numbers in a mutable
//  store that the per-frame updater reads live, so the lil-gui panel
//  (see devTuningGui.ts, loaded ONLY in dev) can nudge them in real time.
//
//  This file imports nothing heavy and is safe to reference from production
//  code: getMaskTuning() simply returns undefined when no panel registered the
//  id (i.e. always, in a prod build), so the updater falls back to its baked-in
//  constants. The actual GUI + lil-gui dependency live in devTuningGui.ts, which
//  is dynamically imported behind an `import.meta.env.DEV` guard so it is
//  tree-shaken out of production bundles entirely.
// ════════════════════════════════════════════════════════════════════════

export type MaskTuning = {
  eyeNx: number;
  eyeNy: number;
  eyeNz: number;
  scaleMul: number;
  /** Build rotation in DEGREES (converted to radians by the updater). */
  rotX: number;
  rotY: number;
  rotZ: number;
};

const store: Record<string, MaskTuning> = {};

/**
 * Register a mask's shipping defaults so the panel opens on the exact numbers
 * that ship. Returns the live (mutable) object the GUI binds its sliders to.
 * Idempotent — re-registering the same id keeps the existing live values.
 */
export function registerMaskTuning(id: string, defaults: MaskTuning): MaskTuning {
  if (!store[id]) store[id] = { ...defaults };
  return store[id];
}

/** Live tuning values for `id`, or undefined when nothing registered it. */
export function getMaskTuning(id: string): MaskTuning | undefined {
  return store[id];
}

/** Every registered id (used by the GUI to build a folder per mask). */
export function tuningIds(): string[] {
  return Object.keys(store);
}
