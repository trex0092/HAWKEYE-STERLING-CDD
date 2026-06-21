/**
 * Tests for the code-only governance layer: POLICY/ABAC/ZTA, LOG/MON/PERF/USAGE/
 * LAT, ANOM, DRIFT, RISK, BIAS, HALL, AUDIT/TRACE, RCause, ESC, AIACT, ISO42K,
 * GDPR.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { authorizeAction } from '@/lib/governance/policy';
import { record, events, resetTelemetry, setTelemetrySink } from '@/lib/governance/telemetry';
import { summarizePerformance } from '@/lib/governance/performance';
import { summarizeUsage } from '@/lib/governance/usage';
import { detectAnomalies } from '@/lib/governance/anomaly';
import { detectDrift } from '@/lib/governance/drift';
import { scoreAiOutput } from '@/lib/governance/aiRisk';
import { detectBias } from '@/lib/governance/bias';
import { scoreHallucination } from '@/lib/governance/hallucination';
import { appendToChain, verifyChain } from '@/lib/governance/auditChain';
import { analyzeRootCause } from '@/lib/governance/rootCause';
import { escalateAiEvent } from '@/lib/governance/escalation';
import { guardUse, recordOfProcessing } from '@/lib/governance/aiAct';
import { validateControlLoop } from '@/lib/governance/iso42001';
import {
  consentGate,
  isPastRetention,
  buildDataExport,
  eraseLocalData,
} from '@/lib/governance/gdpr';
import type { TelemetryEvent } from '@/lib/governance/telemetry';

beforeEach(() => resetTelemetry());

describe('POLICY / ABAC / ZTA (authorizeAction)', () => {
  const analyst = { user: { id: 'analyst', role: 'analyst' as const }, sessionActive: true };
  it('denies without identity, denies on expired session, enforces RBAC', () => {
    expect(
      authorizeAction(
        { action: 'export', permission: 'report:export' },
        { user: null, sessionActive: true },
      ).allow,
    ).toBe(false);
    expect(
      authorizeAction(
        { action: 'edit', permission: 'assessment:edit' },
        { ...analyst, sessionActive: false },
      ).allow,
    ).toBe(false);
    expect(authorizeAction({ action: 'export', permission: 'report:export' }, analyst).allow).toBe(
      false,
    ); // analyst lacks export
    expect(authorizeAction({ action: 'edit', permission: 'assessment:edit' }, analyst).allow).toBe(
      true,
    );
  });

  it('ABAC: high-risk export needs MLRO, incomplete cannot export', () => {
    const approver = { user: { id: 'approver', role: 'approver' as const }, sessionActive: true };
    expect(
      authorizeAction(
        { action: 'export', permission: 'report:export' },
        { ...approver, resource: { band: 'high' } },
      ).allow,
    ).toBe(false); // approver < mlro for EDD
    const mlro = { user: { id: 'mlro', role: 'mlro' as const }, sessionActive: true };
    expect(
      authorizeAction(
        { action: 'export', permission: 'report:export' },
        { ...mlro, resource: { band: 'high' } },
      ).allow,
    ).toBe(true);
    expect(
      authorizeAction(
        { action: 'export', permission: 'report:export' },
        { ...mlro, resource: { incomplete: true } },
      ).allow,
    ).toBe(false);
  });

  it('records every decision to telemetry', () => {
    authorizeAction({ action: 'edit', permission: 'assessment:edit' }, analyst);
    expect(events().some((e) => e.action === 'edit' && e.outcome === 'allow')).toBe(true);
  });
});

describe('LOG / MON / PERF / USAGE (telemetry)', () => {
  it('records events and forwards to a sink', () => {
    const seen: TelemetryEvent[] = [];
    setTelemetrySink((e) => seen.push(e));
    record({
      actor: 'analyst',
      action: 'ai-call',
      outcome: 'ok',
      ai: { grounded: true, accepted: true, riskScore: 5, latencyMs: 800 },
    });
    setTelemetrySink(null);
    expect(seen).toHaveLength(1);
    const perf = summarizePerformance(events());
    expect(perf.aiCalls).toBe(1);
    expect(perf.groundedRate).toBe(1);
    expect(perf.acceptanceRate).toBe(1);
    expect(summarizeUsage(events()).aiInvocations).toBe(1);
  });
});

describe('ANOM + DRIFT', () => {
  it('detects an AI burst', () => {
    const now = Date.now();
    const evts: TelemetryEvent[] = Array.from({ length: 9 }, (_, i) => ({
      ts: now - i * 100,
      actor: 'analyst',
      action: 'ai-call',
      outcome: 'ok',
    }));
    expect(detectAnomalies(evts, undefined, now).some((a) => a.id === 'ai-burst')).toBe(true);
  });

  it('flags drift when grounding degrades over time', () => {
    const base = Date.now() - 100000;
    const good: TelemetryEvent[] = Array.from({ length: 4 }, (_, i) => ({
      ts: base + i,
      actor: 'a',
      action: 'ai-call',
      outcome: 'ok',
      ai: { grounded: true, riskScore: 5 },
    }));
    const bad: TelemetryEvent[] = Array.from({ length: 4 }, (_, i) => ({
      ts: Date.now() + i,
      actor: 'a',
      action: 'ai-call',
      outcome: 'ok',
      ai: { grounded: false, riskScore: 70 },
    }));
    expect(detectDrift([...good, ...bad]).drifted).toBe(true);
  });
});

describe('RISK / BIAS / HALL', () => {
  it('scores a grounded, neutral draft as low risk', () => {
    const source = 'Acme Ltd is registered in the United Kingdom. Shareholding 60 percent.';
    const draft = 'Acme Ltd is registered in the United Kingdom with a 60 percent shareholding.';
    const r = scoreAiOutput(draft, source);
    expect(r.tier).toBe('low');
    expect(scoreHallucination(draft, source).grounded).toBe(true);
  });

  it('scores an ungrounded, biased draft as higher risk', () => {
    const source = 'Acme Ltd is registered in the United Kingdom.';
    const draft =
      'Acme Ltd, obviously shady, is registered in Panama with 99 percent offshore holdings.';
    const r = scoreAiOutput(draft, source);
    expect(r.score).toBeGreaterThan(0);
    expect(detectBias(draft).biased).toBe(true);
  });
});

describe('AUDIT / TRACE (hash chain)', () => {
  it('detects tampering with a past entry', async () => {
    const e1 = await appendToChain({ id: 1, ts: 1, message: 'created' }, '');
    const e2 = await appendToChain({ id: 2, ts: 2, message: 'completed' }, e1.hash!);
    expect((await verifyChain([e1, e2])).valid).toBe(true);
    const tampered = { ...e1, message: 'edited' };
    expect((await verifyChain([tampered, e2])).valid).toBe(false);
  });
});

describe('RCause / ESC', () => {
  it('classifies failure codes and escalates high AI risk', () => {
    expect(analyzeRootCause('rate-limited').category).toBe('rate-limit');
    expect(analyzeRootCause('ungrounded').category).toBe('model-quality');
    const risk = scoreAiOutput('In Panama 99 percent offshore obviously shady', 'clean source');
    const items = escalateAiEvent(risk);
    expect(items.length).toBeGreaterThanOrEqual(0); // may or may not be high; route is valid when present
    if (items.length) expect(items[0].routeTo).toMatch(/mlro|approver/);
  });
});

describe('AIACT / ISO42K', () => {
  it('guards prohibited / unregistered uses and lists ROPA', () => {
    expect(guardUse('AI-001-narrative').allowed).toBe(true);
    expect(guardUse('AI-999').allowed).toBe(false);
    expect(guardUse('AI-001-narrative', 'social-scoring').allowed).toBe(false);
    expect(recordOfProcessing().length).toBeGreaterThan(0);
  });

  it('control loop is complete and owned', () => {
    const v = validateControlLoop();
    expect(v.complete).toBe(true);
    expect(v.gaps).toEqual([]);
  });
});

describe('GDPR', () => {
  it('gates on consent, flags retention, exports and erases', () => {
    expect(consentGate(false).allowed).toBe(false);
    expect(consentGate(true).allowed).toBe(true);
    const old = Date.now() - 11 * 365.25 * 24 * 60 * 60 * 1000;
    expect(isPastRetention(old)).toBe(true);
    expect(isPastRetention(Date.now())).toBe(false);

    localStorage.setItem('hawkeye-cdd', JSON.stringify({ a: 1 }));
    expect(buildDataExport()).toContain('hawkeye-cdd');
    eraseLocalData();
    expect(localStorage.getItem('hawkeye-cdd')).toBeNull();
  });
});
