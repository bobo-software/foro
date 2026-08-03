/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SKAFTIN_API_URL?: string;
  readonly VITE_SKAFTIN_API_KEY?: string;
  readonly VITE_SKAFTIN_API?: string;
  readonly VITE_SKAFTIN_ACCESS_TOKEN?: string;
  readonly VITE_SKAFTIN_PROJECT_ID?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
