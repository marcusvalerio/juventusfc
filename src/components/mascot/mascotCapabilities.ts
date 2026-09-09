import { MASCOT_MODEL_URL } from './mascotConfig';

/** What the mascot layer can actually render on this device. */
export type MascotRenderMode = 'still' | 'model';

type Connection = { saveData?: boolean };
type ExtendedNavigator = Navigator & { deviceMemory?: number; connection?: Connection };

let webglSupport: boolean | undefined;

/**
 * A context is created once and thrown away. Asking the question is cheap;
 * asking it on every mount is not, hence the cache.
 */
export function hasWebGL() {
  if (webglSupport !== undefined) return webglSupport;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
    );
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/**
 * Modest hardware gets the model at a lower pixel ratio and without contact
 * shadows rather than losing it entirely; a device asking to save data gets the
 * still composition, which is a single image.
 */
export function isLowPowerDevice() {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as ExtendedNavigator;
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
}

export function prefersDataSaving() {
  if (typeof navigator === 'undefined') return false;
  return (navigator as ExtendedNavigator).connection?.saveData === true;
}

let modelProbe: Promise<boolean> | undefined;

/**
 * Is the GLB actually there?
 *
 * Both hosts answer a missing path with `index.html` (the SPA fallback), so a
 * 200 alone proves nothing — the content type is what separates a real model
 * from the app shell. Probing beats bundling the 3D stack behind a guess: while
 * no model exists, Three.js is never fetched at all.
 */
export function probeMascotModel(): Promise<boolean> {
  modelProbe ??= (async () => {
    if (typeof fetch === 'undefined') return false;
    try {
      const response = await fetch(MASCOT_MODEL_URL, { method: 'HEAD' });
      if (!response.ok) return false;
      const type = response.headers.get('content-type') ?? '';
      return !/text\/html/i.test(type);
    } catch {
      return false;
    }
  })();
  return modelProbe;
}

/** Escape hatch for tests: forces the next probe to run again. */
export function resetMascotModelProbe() {
  modelProbe = undefined;
}
