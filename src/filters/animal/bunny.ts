import { DrawCtx } from '../DrawCtx';

// The whole bunny — ears AND nose — is now a single real 3D model
// ("Bunny_ears_nose.glb") rendered on the Three.js layer (see useThreeRenderer /
// updateBunnyEars), anchored so the model's nose sits on the person's nose.
// There is no longer any 2D paint (whiskers/cheeks were removed), so this
// overlay is intentionally a no-op.
export function drawBunny(_d: DrawCtx) {
  /* no 2D overlay — the bunny is entirely the 3D prop */
}
