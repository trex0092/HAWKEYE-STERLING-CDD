/**
 * Auditability / Traceability hardening (AUDIT, TRACE) — periodic-table blocks
 * "AUDIT" and "TRACE".
 *
 * The store already keeps a timestamped activity trail; this makes it
 * tamper-evident. Each entry's hash chains in the previous entry's hash
 * (SHA-256, Web Crypto), so any retro-edit or deletion of a past entry breaks the
 * chain and `verifyChain` reports the first broken link. No external module.
 */

export interface ChainableEntry {
  id: number;
  ts: number;
  message: string;
  /** SHA-256 over (prevHash + id + ts + message). Set by appendToChain. */
  hash?: string;
}

const enc = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', enc.encode(input) as unknown as ArrayBuffer),
  );
  let hex = '';
  for (const b of digest) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/** Computes an entry's hash given the previous entry's hash (or '' for genesis). */
export async function hashEntry(
  entry: Omit<ChainableEntry, 'hash'>,
  prevHash: string,
): Promise<string> {
  return sha256Hex(`${prevHash}|${entry.id}|${entry.ts}|${entry.message}`);
}

/** Returns a copy of the entry with its chained hash filled in. */
export async function appendToChain(
  entry: Omit<ChainableEntry, 'hash'>,
  prevHash: string,
): Promise<ChainableEntry> {
  return { ...entry, hash: await hashEntry(entry, prevHash) };
}

export interface ChainVerification {
  valid: boolean;
  /** Index of the first tampered/broken entry, or -1 when intact. */
  brokenAt: number;
}

/**
 * Verifies an ordered chain (oldest first). An entry is valid when its stored hash
 * equals the recomputed hash over the previous link. Missing hashes (legacy
 * entries) are skipped so older trails don't read as "tampered".
 */
export async function verifyChain(entries: ChainableEntry[]): Promise<ChainVerification> {
  let prev = '';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.hash === undefined) {
      prev = '';
      continue;
    }
    const expected = await hashEntry({ id: e.id, ts: e.ts, message: e.message }, prev);
    if (expected !== e.hash) return { valid: false, brokenAt: i };
    prev = e.hash;
  }
  return { valid: true, brokenAt: -1 };
}
