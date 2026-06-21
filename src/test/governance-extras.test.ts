/**
 * Tests for the code-only governance hardening: the export approval gate
 * (Layer 5) and the serverless rate limiter (Layer 3).
 */
import { describe, it, expect } from 'vitest';
import { canExport } from '@/lib/report';
import { checkRateLimit } from '../../netlify/shared/rateLimit';

describe('export approval gate (Layer 5)', () => {
  it('blocks export until an approving officer is named', () => {
    expect(canExport({ approvedBy: '' })).toBe(false);
    expect(canExport({ approvedBy: '   ' })).toBe(false);
  });

  it('allows export once an approving officer is present', () => {
    expect(canExport({ approvedBy: 'A. Director' })).toBe(true);
  });
});

describe('serverless rate limiter (Layer 3)', () => {
  it('allows requests up to the limit, then blocks with a retry hint', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('tracks separate keys independently', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(checkRateLimit(a, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(a, 1, 60_000).allowed).toBe(false);
    // A different key is unaffected.
    expect(checkRateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});
