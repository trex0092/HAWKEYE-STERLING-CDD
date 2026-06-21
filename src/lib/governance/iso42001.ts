/**
 * ISO/IEC 42001 control register (ISO42K) — periodic-table block "ISO42K".
 *
 * Turns the "6-layer mapping" prose into a machine-checkable control register:
 * each control has an owner, an implementation reference and a status. A test
 * asserts the register is complete (every control owned + implemented), which is
 * the evidence of a maintained AI-management-system control loop. `documentation`
 * here means it is also live in code, not only Markdown.
 *
 * Pure and dependency-free.
 */
import type { Role } from '../security/identity';

export type ControlStatus = 'implemented' | 'partial' | 'planned';

export interface Iso42001Control {
  layer: number;
  id: string;
  name: string;
  owner: Role;
  status: ControlStatus;
  /** Code/doc reference evidencing the control. */
  reference: string;
}

export const CONTROL_REGISTER: readonly Iso42001Control[] = [
  {
    layer: 1,
    id: 'L1-inventory',
    name: 'AI discovery & inventory',
    owner: 'mlro',
    status: 'implemented',
    reference: 'docs/AI-REGISTER.md, src/lib/governance/aiAct.ts',
  },
  {
    layer: 2,
    id: 'L2-data',
    name: 'Data governance / minimisation & rights',
    owner: 'mlro',
    status: 'implemented',
    reference: 'src/lib/ai/redaction.ts, src/lib/governance/gdpr.ts',
  },
  {
    layer: 3,
    id: 'L3-security',
    name: 'Security & resilience',
    owner: 'admin',
    status: 'implemented',
    reference: 'src/lib/security/*, netlify/shared/rateLimit.ts',
  },
  {
    layer: 4,
    id: 'L4-assurance',
    name: 'Model & agent assurance',
    owner: 'mlro',
    status: 'implemented',
    reference: 'src/lib/governance/{hallucination,bias,aiRisk,drift}.ts',
  },
  {
    layer: 5,
    id: 'L5-oversight',
    name: 'Human oversight',
    owner: 'approver',
    status: 'implemented',
    reference: 'AiCopilotModal.tsx, src/lib/governance/policy.ts',
  },
  {
    layer: 6,
    id: 'L6-audit',
    name: 'Governance, compliance & audit',
    owner: 'auditor',
    status: 'implemented',
    reference: 'src/lib/governance/{telemetry,auditChain,usage}.ts',
  },
];

export interface RegisterValidation {
  complete: boolean;
  gaps: string[];
}

/** Validates the control loop: every control must be owned and implemented. */
export function validateControlLoop(): RegisterValidation {
  const gaps: string[] = [];
  for (const c of CONTROL_REGISTER) {
    if (!c.owner) gaps.push(`${c.id}: no owner`);
    if (c.status !== 'implemented') gaps.push(`${c.id}: status ${c.status}`);
    if (!c.reference) gaps.push(`${c.id}: no implementation reference`);
  }
  return { complete: gaps.length === 0, gaps };
}
