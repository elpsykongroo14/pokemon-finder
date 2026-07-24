/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TCG_PROXY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
