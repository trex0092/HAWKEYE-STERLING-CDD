/**
 * EU AI Act controls (AIACT) — periodic-table block "AIACT".
 *
 * Encodes the Act's risk-based stance in code: every AI capability is classified,
 * prohibited uses are guarded at runtime, and a Record-of-Processing object is
 * generated from the capability list (transparency is already printed on the
 * report). `guardUse` fails closed for any unregistered or prohibited use, so the
 * app cannot quietly cross a tier boundary.
 *
 * Pure and dependency-free.
 */

export type AiRiskTier = 'minimal' | 'limited' | 'high' | 'unacceptable';

export interface AiCapability {
  id: string;
  name: string;
  tier: AiRiskTier;
  /** Human-in-the-loop required for this capability. */
  humanOversight: boolean;
  transparencyLabel: boolean;
}

/** The registered, permitted AI capabilities (mirrors docs/AI-REGISTER.md). */
export const AI_CAPABILITIES: readonly AiCapability[] = [
  {
    id: 'AI-001-narrative',
    name: 'Compliance Co-pilot — narrative polish',
    tier: 'limited',
    humanOversight: true,
    transparencyLabel: true,
  },
  {
    id: 'AI-002-triage',
    name: 'Compliance Co-pilot — adverse-media triage',
    tier: 'limited',
    humanOversight: true,
    transparencyLabel: true,
  },
];

/** Uses the Act prohibits in this product context — fail closed if requested. */
export const PROHIBITED_USES = [
  'automated-customer-decision', // no automated decisioning over customers
  'social-scoring',
  'biometric-categorisation',
] as const;

export interface UseGuard {
  allowed: boolean;
  reason: string;
}

/**
 * Runtime guard: an AI use is allowed only if it is a registered capability that
 * is not prohibited and (for limited/high tiers) keeps human oversight.
 */
export function guardUse(capabilityId: string, requestedUse?: string): UseGuard {
  if (requestedUse && (PROHIBITED_USES as readonly string[]).includes(requestedUse)) {
    return { allowed: false, reason: `prohibited use under EU AI Act: ${requestedUse}` };
  }
  const cap = AI_CAPABILITIES.find((c) => c.id === capabilityId);
  if (!cap) return { allowed: false, reason: `unregistered AI capability: ${capabilityId}` };
  if ((cap.tier === 'limited' || cap.tier === 'high') && !cap.humanOversight) {
    return { allowed: false, reason: `${cap.tier}-risk capability without human oversight` };
  }
  return { allowed: true, reason: `${cap.tier}-risk, human-in-the-loop` };
}

export interface ProcessingRecord {
  capabilityId: string;
  name: string;
  tier: AiRiskTier;
  humanOversight: boolean;
  transparencyLabel: boolean;
}

/** Generates the Record of Processing (ROPA-style) from the capability list. */
export function recordOfProcessing(): ProcessingRecord[] {
  return AI_CAPABILITIES.map((c) => ({
    capabilityId: c.id,
    name: c.name,
    tier: c.tier,
    humanOversight: c.humanOversight,
    transparencyLabel: c.transparencyLabel,
  }));
}
