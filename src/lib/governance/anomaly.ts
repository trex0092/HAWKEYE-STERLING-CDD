/**
 * Anomaly Detection (ANOM) — periodic-table block "ANOM".
 *
 * Threshold/heuristic detection over the telemetry buffer: bursts of AI calls,
 * repeated grounding failures, a run of access denials, off-hours activity, and
 * rapid repeated band overrides. These are operational-behaviour anomalies (not a
 * trained model); each detection becomes an escalation candidate.
 *
 * Pure and dependency-free.
 */
import type { TelemetryEvent } from './telemetry';

export interface Anomaly {
  id: string;
  detail: string;
}

export interface AnomalyConfig {
  windowMs: number;
  aiBurst: number; // AI calls within window that count as a burst
  groundingFailures: number;
  accessDenials: number;
  overrides: number;
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  windowMs: 60_000,
  aiBurst: 8,
  groundingFailures: 3,
  accessDenials: 5,
  overrides: 4,
};

function withinWindow(events: readonly TelemetryEvent[], windowMs: number, now: number) {
  return events.filter((e) => now - e.ts <= windowMs);
}

/** Detects anomalies in a telemetry slice. */
export function detectAnomalies(
  events: readonly TelemetryEvent[],
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG,
  now: number = Date.now(),
): Anomaly[] {
  const recent = withinWindow(events, config.windowMs, now);
  const anomalies: Anomaly[] = [];

  const aiCalls = recent.filter((e) => e.action === 'ai-call').length;
  if (aiCalls >= config.aiBurst) {
    anomalies.push({ id: 'ai-burst', detail: `${aiCalls} AI calls in window` });
  }

  const groundingFails = recent.filter((e) => e.ai && e.ai.grounded === false).length;
  if (groundingFails >= config.groundingFailures) {
    anomalies.push({ id: 'grounding-failures', detail: `${groundingFails} ungrounded drafts` });
  }

  const denials = recent.filter((e) => e.outcome === 'deny').length;
  if (denials >= config.accessDenials) {
    anomalies.push({ id: 'access-denials', detail: `${denials} access denials` });
  }

  const overrides = recent.filter((e) => e.action === 'band-override').length;
  if (overrides >= config.overrides) {
    anomalies.push({ id: 'rapid-overrides', detail: `${overrides} band overrides` });
  }

  for (const e of recent) {
    const hour = new Date(e.ts).getHours();
    if ((hour < 6 || hour >= 22) && (e.outcome === 'ok' || e.outcome === 'allow')) {
      anomalies.push({ id: 'off-hours', detail: `activity at ${hour}:00` });
      break;
    }
  }

  return anomalies;
}
