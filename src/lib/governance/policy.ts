/**
 * Policy Enforcement (POLICY) + Attribute-Based Access Control (ABAC) + Zero-Trust
 * Architecture (ZTA) — periodic-table blocks "POLICY", "ABAC", "ZTA".
 *
 * One engine, three blocks: `authorizeAction` is the zero-trust choke point every
 * mutating store action passes through. It re-verifies, per action: (1) a session
 * identity exists, (2) RBAC grants the base permission, and (3) ABAC attribute
 * rules pass (role/resource/environment context). Nothing is trusted just because
 * the session is unlocked — that is the ZTA stance. Every decision is recorded to
 * telemetry, so POLICY is enforced *and* evidenced.
 *
 * Pure and dependency-free (telemetry recording is best-effort).
 */
import { can, type Permission } from '../security/rbac';
import { roleAtLeast, type Role } from '../security/identity';
import { record } from './telemetry';

/** Subject/resource/environment attributes an ABAC rule may read. */
export interface AccessContext {
  user: { id: string; role: Role } | null;
  /** Session must be live (not expired) for any action — core ZTA check. */
  sessionActive: boolean;
  resource?: {
    band?: 'low' | 'med' | 'high';
    incomplete?: boolean;
  };
  now?: number;
}

export interface AccessDecision {
  allow: boolean;
  reason: string;
}

/** The capability each action requires, plus the human-readable action name. */
export interface ActionSpec {
  action: string;
  permission: Permission;
}

/**
 * ABAC rules layered on top of RBAC. Each returns null to abstain or a deny reason.
 * Firm policy lives here: e.g. exporting an EDD (high-risk) report needs MLRO.
 */
const ABAC_RULES: ((spec: ActionSpec, ctx: AccessContext) => string | null)[] = [
  (_spec, ctx) => (ctx.sessionActive ? null : 'session-expired'),
  (spec, ctx) =>
    spec.permission === 'report:export' && ctx.resource?.incomplete
      ? 'cannot export an incomplete assessment'
      : null,
  (spec, ctx) =>
    spec.permission === 'report:export' &&
    ctx.resource?.band === 'high' &&
    ctx.user &&
    !roleAtLeast(ctx.user.role, 'mlro')
      ? 'EDD (high-risk) export requires MLRO'
      : null,
];

/**
 * The zero-trust gate. Returns an allow/deny decision and records it. Callers
 * (store actions) should refuse to mutate on `allow === false`.
 */
export function authorizeAction(spec: ActionSpec, ctx: AccessContext): AccessDecision {
  let decision: AccessDecision;

  if (!ctx.user) {
    decision = { allow: false, reason: 'no-identity' };
  } else if (!can(ctx.user.role, spec.permission)) {
    decision = { allow: false, reason: `role ${ctx.user.role} lacks ${spec.permission}` };
  } else {
    const denied = ABAC_RULES.map((r) => r(spec, ctx)).find((r) => r !== null);
    decision = denied ? { allow: false, reason: denied } : { allow: true, reason: 'granted' };
  }

  record({
    actor: ctx.user?.id ?? 'anonymous',
    role: ctx.user?.role,
    action: spec.action,
    resource: spec.permission,
    outcome: decision.allow ? 'allow' : 'deny',
    detail: decision.reason,
  });
  return decision;
}
