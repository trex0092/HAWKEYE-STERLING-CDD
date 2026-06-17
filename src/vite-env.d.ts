/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Session passphrase for the lock gate when no auth endpoint is set (see src/lib/auth.ts). */
  readonly VITE_SESSION_PASSPHRASE?: string;
  /** Optional auth endpoint; when set, the lock gate verifies passphrases server-side. */
  readonly VITE_AUTH_ENDPOINT?: string;
  /** Optional webhook that creates the Asana task server-side (see src/lib/integrations/asana.ts). */
  readonly VITE_ASANA_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
