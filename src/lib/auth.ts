/**
 * Session authentication.
 *
 * The prototype "unlocks on any input"; this is the real gate. `authenticate`
 * validates the supplied passphrase and is the single seam to swap for a server
 * call — replace the body with `fetch('/api/auth/session', …)` and the rest of
 * the app (LockGate + store) keeps working unchanged.
 */

/** A fresh session lasts 60 minutes. */
export const SESSION_DURATION_SECONDS = 60 * 60;

export interface AuthResult {
  ok: boolean;
  /** A short, user-facing reason when `ok` is false. */
  error?: string;
}

/**
 * Configured passphrase. Set `VITE_SESSION_PASSPHRASE` in `.env.local` to
 * override. The default keeps local/dev usable without configuration.
 */
const EXPECTED_PASSPHRASE: string =
  import.meta.env.VITE_SESSION_PASSPHRASE ?? 'sterling';

/** Length-independent string comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function authenticate(passphrase: string): Promise<AuthResult> {
  const candidate = passphrase.trim();
  if (!candidate) {
    return { ok: false, error: 'Enter your passphrase to continue.' };
  }

  // --- Swap this block for a real backend request in production. ---
  const ok = safeEqual(candidate, EXPECTED_PASSPHRASE);
  // ----------------------------------------------------------------

  return ok
    ? { ok: true }
    : { ok: false, error: 'Incorrect passphrase — please try again.' };
}
