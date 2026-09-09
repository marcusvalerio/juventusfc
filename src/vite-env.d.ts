/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Overrides where `Mascot3D` looks for the GLB. Defaults to /models/juventus-mascot.glb */
  readonly VITE_MASCOT_MODEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
