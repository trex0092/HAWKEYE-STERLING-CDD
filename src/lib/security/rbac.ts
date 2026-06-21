/**
 * Role-Based Access Control (RBAC) — periodic-table block "RBAC".
 *
 * A static role → permission matrix. `can()` is the single check used to gate
 * store mutations (ZTA wraps it in ../governance/policy.ts) and to disable UI
 * controls. Permissions are coarse, named capabilities — not UI routes — so the
 * same matrix governs the React app, the store actions and the tests.
 *
 * Pure and dependency-free.
 */
import { ROLE_RANK, type Role } from './identity';

/** Named capabilities a role may hold. */
export type Permission =
  | 'assessment:edit'
  | 'assessment:complete'
  | 'report:export'
  | 'ai:use'
  | 'ai:accept'
  | 'band:override'
  | 'data:erase'
  | 'data:export'
  | 'audit:view';

/**
 * Role → granted permissions. Higher roles inherit nothing implicitly; each grant
 * is explicit so the matrix reads as firm policy. Auditor is read-only (audit
 * view only); approver/MLRO add the sign-off-bearing actions; admin holds all.
 */
const MATRIX: Record<Role, readonly Permission[]> = {
  auditor: ['audit:view'],
  analyst: ['assessment:edit', 'ai:use', 'audit:view'],
  approver: [
    'assessment:edit',
    'assessment:complete',
    'report:export',
    'ai:use',
    'ai:accept',
    'band:override',
    'audit:view',
  ],
  mlro: [
    'assessment:edit',
    'assessment:complete',
    'report:export',
    'ai:use',
    'ai:accept',
    'band:override',
    'data:export',
    'audit:view',
  ],
  admin: [
    'assessment:edit',
    'assessment:complete',
    'report:export',
    'ai:use',
    'ai:accept',
    'band:override',
    'data:erase',
    'data:export',
    'audit:view',
  ],
};

/** True when `role` holds `permission`. */
export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

/** All permissions held by a role (for UI introspection / the governance panel). */
export function permissionsFor(role: Role): readonly Permission[] {
  return MATRIX[role];
}

/** Lists the roles that hold a permission (lowest-privilege first). */
export function rolesWith(permission: Permission): Role[] {
  return (Object.keys(MATRIX) as Role[])
    .filter((r) => MATRIX[r].includes(permission))
    .sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
}
