/**
 * Model Drift detection (DRIFT) — periodic-table block "DRIFT".
 *
 * Compares recent AI quality against an earlier baseline to spot degradation over
 * time. It splits AI-call telemetry into an older "baseline" half and a "recent"
 * half and flags drift when the grounding pass rate drops or the average risk
 * score / latency rises beyond a tolerance. Complements the weekly eval workflow
 * (.github/workflows/ai-evals.yml) with a runtime signal.
 *
 * Pure and dependency-free.
 */
import type { TelemetryEvent } from './telemetry';
import { summarizePerformance, type PerformanceSummary } from './performance';

export interface DriftReport {
  drifted: boolean;
  reasons: string[];
  baseline: PerformanceSummary;
  recent: PerformanceSummary;
}

export interface DriftTolerance {
  groundedDrop: number; // allowed fall in grounded rate (0..1)
  riskRise: number; // allowed rise in avg risk score (0..100)
  latencyRise: number; // allowed rise in avg latency (ms)
  minSamples: number; // minimum AI calls per side to judge
}

export const DEFAULT_DRIFT_TOLERANCE: DriftTolerance = {
  groundedDrop: 0.15,
  riskRise: 15,
  latencyRise: 4000,
  minSamples: 3,
};

/** Detects drift between the older and newer halves of AI telemetry. */
export function detectDrift(
  events: readonly TelemetryEvent[],
  tol: DriftTolerance = DEFAULT_DRIFT_TOLERANCE,
): DriftReport {
  const ai = events.filter((e) => e.action === 'ai-call' && e.ai).sort((a, b) => a.ts - b.ts);
  const mid = Math.floor(ai.length / 2);
  const baseline = summarizePerformance(ai.slice(0, mid));
  const recent = summarizePerformance(ai.slice(mid));

  const reasons: string[] = [];
  if (baseline.aiCalls >= tol.minSamples && recent.aiCalls >= tol.minSamples) {
    if (baseline.groundedRate - recent.groundedRate > tol.groundedDrop) {
      reasons.push(
        `grounding fell ${(baseline.groundedRate * 100).toFixed(0)}%→${(recent.groundedRate * 100).toFixed(0)}%`,
      );
    }
    if (recent.avgRiskScore - baseline.avgRiskScore > tol.riskRise) {
      reasons.push(
        `avg risk rose ${baseline.avgRiskScore.toFixed(0)}→${recent.avgRiskScore.toFixed(0)}`,
      );
    }
    if (recent.avgLatencyMs - baseline.avgLatencyMs > tol.latencyRise) {
      reasons.push(`latency rose ${baseline.avgLatencyMs}ms→${recent.avgLatencyMs}ms`);
    }
  }

  return { drifted: reasons.length > 0, reasons, baseline, recent };
}
