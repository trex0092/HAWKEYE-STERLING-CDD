/**
 * Monitoring (MON) — periodic-table block "MON".
 *
 * Rolls the observability modules into one health snapshot for the governance
 * panel: performance summary, drift status, live anomalies, usage, and an overall
 * status light. Read-only; composes telemetry + performance + drift + anomaly +
 * usage so the UI has a single call.
 *
 * Pure and dependency-free.
 */
import { events } from './telemetry';
import { summarizePerformance, type PerformanceSummary } from './performance';
import { detectDrift, type DriftReport } from './drift';
import { detectAnomalies, type Anomaly } from './anomaly';
import { summarizeUsage, type UsageSummary } from './usage';

export type HealthStatus = 'healthy' | 'degraded' | 'alert';

export interface HealthSnapshot {
  status: HealthStatus;
  performance: PerformanceSummary;
  drift: DriftReport;
  anomalies: Anomaly[];
  usage: UsageSummary;
}

/** Computes the current health snapshot from the live telemetry buffer. */
export function healthSnapshot(now: number = Date.now()): HealthSnapshot {
  const evts = events();
  const performance = summarizePerformance(evts);
  const drift = detectDrift(evts);
  const anomalies = detectAnomalies(evts, undefined, now);
  const usage = summarizeUsage(evts);

  const status: HealthStatus = anomalies.some(
    (a) => a.id === 'access-denials' || a.id === 'ai-burst',
  )
    ? 'alert'
    : drift.drifted || anomalies.length > 0
      ? 'degraded'
      : 'healthy';

  return { status, performance, drift, anomalies, usage };
}
