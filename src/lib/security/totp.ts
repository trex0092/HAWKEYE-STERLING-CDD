/**
 * Multi-Factor Authentication (MFA) — periodic-table block "MFA".
 *
 * A self-contained RFC-6238 TOTP implementation built on the platform Web Crypto
 * API (crypto.subtle HMAC-SHA1) — no external module. The lock gate can require a
 * 6-digit time-based code as a second factor after the passphrase when a shared
 * secret is configured (`VITE_TOTP_SECRET`, base32). When no secret is set MFA is
 * inactive and the gate behaves exactly as before (single factor) — so this is
 * additive and never locks anyone out of the dev/demo flow.
 *
 * Pure (aside from the platform crypto) and dependency-free.
 */

const DIGITS = 6;
const PERIOD_SECONDS = 30;

/** Decodes an RFC-4648 base32 string (TOTP secret) to bytes. */
function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Big-endian 8-byte counter for the HMAC message. */
function counterBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  let n = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  return buf;
}

/** Generates the TOTP code for a base32 secret at a given time (ms). */
export async function generateTotp(secret: string, atMs: number = Date.now()): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / PERIOD_SECONDS);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', cryptoKey, counterBytes(counter) as unknown as ArrayBuffer),
  );
  // Dynamic truncation (RFC 4226 §5.4).
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Verifies a candidate code against the secret, allowing ±1 window of clock skew
 * (the standard tolerance). Constant work regardless of match.
 */
export async function verifyTotp(
  secret: string,
  candidate: string,
  atMs: number = Date.now(),
): Promise<boolean> {
  const code = candidate.trim();
  if (!/^\d{6}$/.test(code)) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = await generateTotp(secret, atMs + drift * PERIOD_SECONDS * 1000);
    if (expected === code) return true;
  }
  return false;
}

/** Whether MFA is configured (a TOTP secret is present). */
export function mfaConfigured(secret: string | undefined): secret is string {
  return typeof secret === 'string' && secret.trim().length > 0;
}
