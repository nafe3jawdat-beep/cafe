/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. https://cafe-backend-kmoj.onrender.com (no trailing slash, no /api). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
