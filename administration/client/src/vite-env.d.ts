/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}