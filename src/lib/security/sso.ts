/**
 * Single Sign-On (SSO) — periodic-table block "SSO".
 *
 * An OIDC-style identity seam with a code-only local provider as the default.
 * Honest scope: no federation/integration is shipped (per the build constraints).
 * `resolveIdentity` maps a chosen account id to a registered User; when
 * `VITE_OIDC_ISSUER` is configured it would defer to a real IdP — the seam is
 * documented so callers (LockGate, store) never change. This mirrors the existing
 * `authenticate()` / `VITE_AUTH_ENDPOINT` pattern in src/lib/auth.ts.
 *
 * Pure and dependency-free.
 */
import { findUser, type User } from './identity';

export interface SsoResult {
  ok: boolean;
  user?: User;
  error?: string;
}

/** True when an external OIDC issuer is configured (federation seam active). */
export function ssoFederationConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OIDC_ISSUER);
}

/**
 * Resolves a session identity. With the local provider (default) the `account`
 * is a registered user id (analyst/approver/mlro/auditor/admin). When a real
 * issuer is configured this is where the OIDC code-exchange would run; until then
 * we fail closed for unknown federated accounts rather than inventing access.
 */
export async function resolveIdentity(account: string): Promise<SsoResult> {
  const id = account.trim();
  if (!id) return { ok: false, error: 'Choose an account to continue.' };

  if (ssoFederationConfigured()) {
    // Seam: exchange the IdP token here and map claims → User. Not shipped.
    return { ok: false, error: 'Federated SSO is configured but no provider client is bundled.' };
  }

  const user = findUser(id);
  return user ? { ok: true, user } : { ok: false, error: 'Unknown account.' };
}
