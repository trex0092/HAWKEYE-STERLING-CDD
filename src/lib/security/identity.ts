/**
 * Identity & Access Management (IAM) — Periodic-table block "IAM", with the role
 * vocabulary shared by RBAC (rbac.ts), ABAC/ZTA (../governance/policy.ts) and the
 * approval gate (../report.ts).
 *
 * Code-only by design: there is no backend directory service, so identities are a
 * small in-app registry. The current identity is held in the (non-persisted)
 * session slice of the store and is established at unlock via the SSO seam
 * (sso.ts). Repoint `resolveIdentity` at a real IdP without touching callers.
 *
 * Pure and dependency-free so the browser bundle, the Netlify functions and the
 * Vitest suite all share one source of truth for who-can-do-what.
 */

/** The fixed set of governance roles, lowest to highest privilege. */
export type Role = 'auditor' | 'analyst' | 'approver' | 'mlro' | 'admin';

export const ROLES: readonly Role[] = ['auditor', 'analyst', 'approver', 'mlro', 'admin'];

/** Privilege rank — used by ABAC rules that need "at least role X". */
export const ROLE_RANK: Record<Role, number> = {
  auditor: 0,
  analyst: 1,
  approver: 2,
  mlro: 3,
  admin: 4,
};

/** A resolved identity for the active session. */
export interface User {
  id: string;
  name: string;
  role: Role;
}

/**
 * In-app user registry. This is the code-only IAM store; in a deployment the
 * `VITE_OIDC_*` seam (sso.ts) would replace it with directory-backed identities.
 */
export const USER_REGISTRY: readonly User[] = [
  { id: 'analyst', name: 'Compliance Analyst', role: 'analyst' },
  { id: 'approver', name: 'Approving Officer', role: 'approver' },
  { id: 'mlro', name: 'MLRO', role: 'mlro' },
  { id: 'auditor', name: 'Internal Auditor', role: 'auditor' },
  { id: 'admin', name: 'System Administrator', role: 'admin' },
];

/** Looks up a registered user by id (case-insensitive). */
export function findUser(id: string): User | undefined {
  const key = id.trim().toLowerCase();
  return USER_REGISTRY.find((u) => u.id.toLowerCase() === key);
}

/** True when `role` is at least as privileged as `min`. */
export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/**
 * RESP (Responsibility Mapping): named owner for each governed AI capability and
 * for the assessment outcome. Mirrors docs/AI-REGISTER.md so ownership is also
 * available to code (report disclosure, governance panel).
 */
export const RESPONSIBILITY_MAP: Record<string, { owner: Role; description: string }> = {
  'AI-001-narrative': {
    owner: 'mlro',
    description: 'AI narrative polish — Compliance/MLRO owns sign-off',
  },
  'AI-002-triage': {
    owner: 'mlro',
    description: 'AI adverse-media triage — Compliance/MLRO owns sign-off',
  },
  'assessment-outcome': {
    owner: 'approver',
    description: 'Final CDD decision — Approving Officer accountable',
  },
};
