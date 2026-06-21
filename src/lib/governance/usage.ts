/**
 * Usage Analytics (USAGE) — periodic-table block "USAGE".
 *
 * Aggregates the telemetry buffer into adoption/usage metrics: counts per action,
 * per actor, and AI adoption (how often AI is invoked and accepted). Read-only
 * aggregation surfaced in the governance panel — no new telemetry leaves the app.
 *
 * Pure and dependency-free.
 */
import type { TelemetryEvent } from './telemetry';

export interface UsageSummary {
  totalEvents: number;
  byAction: Record<string, number>;
  byActor: Record<string, number>;
  aiInvocations: number;
  aiAcceptances: number;
  aiAcceptanceRate: number; // 0..1
}

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

/** Builds the usage summary from a telemetry slice. */
export function summarizeUsage(events: readonly TelemetryEvent[]): UsageSummary {
  const aiCalls = events.filter((e) => e.action === 'ai-call');
  const aiAccepts = aiCalls.filter((e) => e.ai?.accepted === true).length;
  return {
    totalEvents: events.length,
    byAction: tally(events.map((e) => e.action)),
    byActor: tally(events.map((e) => e.actor)),
    aiInvocations: aiCalls.length,
    aiAcceptances: aiAccepts,
    aiAcceptanceRate: aiCalls.length === 0 ? 0 : aiAccepts / aiCalls.length,
  };
}
