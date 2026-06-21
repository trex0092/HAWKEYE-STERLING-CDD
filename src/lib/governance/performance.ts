/**
 * Performance Tracking (PERF) + Latency (LAT) — periodic-table blocks "PERF" and
 * "LAT".
 *
 * Aggregates AI quality/efficiency proxies from the telemetry buffer: grounding
 * pass rate, analyst acceptance rate, average AI risk score, and latency
 * percentiles. Surfaced in the governance panel; consumed by the drift tracker.
 *
 * Pure and dependency-free.
 */
import type { TelemetryEvent } from './telemetry';

export interface PerformanceSummary {
  aiCalls: number;
  groundedRate: number; // 0..1
  acceptanceRate: number; // 0..1 of drafts accepted
  avgRiskScore: number; // 0..100
  avgLatencyMs: number;
  p95LatencyMs: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/** Computes performance metrics over AI-call telemetry. */
export function summarizePerformance(events: readonly TelemetryEvent[]): PerformanceSummary {
  const ai = events.filter((e) => e.action === 'ai-call' && e.ai);
  const n = ai.length;
  if (n === 0) {
    return {
      aiCalls: 0,
      groundedRate: 1,
      acceptanceRate: 0,
      avgRiskScore: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
    };
  }

  const grounded = ai.filter((e) => e.ai!.grounded === true).length;
  const accepted = ai.filter((e) => e.ai!.accepted === true).length;
  const risks = ai.map((e) => e.ai!.riskScore ?? 0);
  const latencies = ai
    .map((e) => e.ai!.latencyMs ?? e.latencyMs ?? 0)
    .filter((x) => x > 0)
    .sort((a, b) => a - b);

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

  return {
    aiCalls: n,
    groundedRate: grounded / n,
    acceptanceRate: accepted / n,
    avgRiskScore: avg(risks),
    avgLatencyMs: Math.round(avg(latencies)),
    p95LatencyMs: Math.round(percentile(latencies, 95)),
  };
}
