/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Session passphrase for the lock gate (see src/lib/auth.ts). */
  readonly VITE_SESSION_PASSPHRASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
