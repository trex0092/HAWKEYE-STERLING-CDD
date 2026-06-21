/**
 * Structured logging / telemetry (LOG) — periodic-table block "LOG", and the data
 * spine for MON / PERF / USAGE / DRIFT / ANOM.
 *
 * The store's activity log is human-readable prose; telemetry is the structured
 * counterpart: typed events with actor, action, resource, outcome, latency and
 * optional AI metrics. Events are kept in a bounded in-memory ring (the session's
 * observability buffer) and are also emitted to a sink the store wires to the
 * existing `mirrorToAudit` path — so nothing new leaves the app.
 *
 * Pure and dependency-free.
 */

export type Outcome = 'allow' | 'deny' | 'ok' | 'error';

export interface AiMetrics {
  model?: string;
  grounded?: boolean;
  ungroundedCount?: number;
  riskScore?: number;
  latencyMs?: number;
  accepted?: boolean;
}

export interface TelemetryEvent {
  ts: number;
  actor: string;
  role?: string;
  action: string;
  resource?: string;
  outcome: Outcome;
  latencyMs?: number;
  ai?: AiMetrics;
  detail?: string;
}

const MAX_EVENTS = 500;
const buffer: TelemetryEvent[] = [];
type Sink = (e: TelemetryEvent) => void;
let sink: Sink | null = null;

/** Wire an external sink (the store passes its audit-mirror here). */
export function setTelemetrySink(fn: Sink | null): void {
  sink = fn;
}

/** Records an event into the ring buffer and forwards it to the sink. */
export function record(event: Omit<TelemetryEvent, 'ts'> & { ts?: number }): TelemetryEvent {
  const full: TelemetryEvent = { ts: Date.now(), ...event };
  buffer.push(full);
  if (buffer.length > MAX_EVENTS) buffer.shift();
  try {
    sink?.(full);
  } catch {
    /* telemetry sink is best-effort */
  }
  return full;
}

/** A read-only snapshot of the buffer (newest last). */
export function events(): readonly TelemetryEvent[] {
  return buffer.slice();
}

/** Clears the buffer (used by tests and GDPR erasure). */
export function resetTelemetry(): void {
  buffer.length = 0;
}
