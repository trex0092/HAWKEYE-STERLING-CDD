/** Small formatting helpers for the session clock + autosave stamp. */

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Seconds → "mm:ss" (e.g. 3599 → "59:59"). */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Local "h:mm:ss AM/PM" timestamp used by the "Autosaved …" footer. */
export function formatClock(now: Date): string {
  return now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
