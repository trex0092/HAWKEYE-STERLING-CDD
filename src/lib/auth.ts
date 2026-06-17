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
const EXPECTED_PASSPHRASE: string = import.meta.env.VITE_SESSION_PASSPHRASE ?? 'sterling';

/**
 * Simple passphrase comparison. Note: this is the local/dev fallback only — it is
 * not constant-time (and can't be meaningfully so client-side). Real protection
 * comes from VITE_AUTH_ENDPOINT (server-side) or the hosting gate.
 */
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

  // If an auth endpoint is configured, verify server-side; otherwise fall back
  // to the local configured passphrase. Either way the call sites are unchanged.
  const endpoint = import.meta.env.VITE_AUTH_ENDPOINT;
  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: candidate }),
      });
      return res.ok
        ? { ok: true }
        : { ok: false, error: 'Incorrect passphrase — please try again.' };
    } catch {
      return { ok: false, error: 'Could not reach the authentication service.' };
    }
  }

  const ok = safeEqual(candidate, EXPECTED_PASSPHRASE);
  return ok ? { ok: true } : { ok: false, error: 'Incorrect passphrase — please try again.' };
}
