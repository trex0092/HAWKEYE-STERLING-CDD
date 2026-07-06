/**
 * Unit tests for the transient toast store (src/store/useToast.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '@/store/useToast';

describe('useToast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToast.getState().hide();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('show() surfaces a message', () => {
    useToast.getState().show('Assessment saved');
    expect(useToast.getState().message).toBe('Assessment saved');
  });

  it('auto-hides the message after 2600ms', () => {
    useToast.getState().show('Saved');
    vi.advanceTimersByTime(2599);
    expect(useToast.getState().message).toBe('Saved');
    vi.advanceTimersByTime(1);
    expect(useToast.getState().message).toBeNull();
  });

  it('hide() clears immediately and cancels the pending auto-hide', () => {
    useToast.getState().show('Saved');
    useToast.getState().hide();
    expect(useToast.getState().message).toBeNull();
    vi.advanceTimersByTime(5000); // no throw, stays cleared
    expect(useToast.getState().message).toBeNull();
  });

  it('re-showing restarts the auto-hide timer', () => {
    useToast.getState().show('First');
    vi.advanceTimersByTime(2000);
    useToast.getState().show('Second');
    vi.advanceTimersByTime(2000); // 2000ms since "Second"
    expect(useToast.getState().message).toBe('Second');
    vi.advanceTimersByTime(600); // now 2600ms since "Second"
    expect(useToast.getState().message).toBeNull();
  });
});
