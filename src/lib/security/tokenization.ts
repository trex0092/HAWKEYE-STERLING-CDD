/**
 * Tokenization (TOKEN) — periodic-table block "TOKEN".
 *
 * Upgrades the redaction placeholders (../ai/redaction.ts) to *cryptographic*
 * tokenization: each sensitive value is replaced by a stable token derived via
 * HMAC-SHA256 (Web Crypto) over the value, keyed by a session secret. The same
 * value always yields the same token (so grounding/joins survive) but the token
 * does not reveal the value, and the original is recoverable only through the
 * in-boundary vault map. No external module; reuses the PII detection patterns.
 */
import { redactSensitive } from '../ai/redaction';

export interface TokenVault {
  /** token -> original value (kept inside our trust boundary only). */
  [token: string]: string;
}

export interface TokenizeResult {
  tokenized: string;
  vault: TokenVault;
}

const enc = new TextEncoder();

function hex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

/** HMAC-SHA256(value) keyed by `secret`, truncated — a deterministic token id. */
async function hmacToken(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret) as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, enc.encode(value) as unknown as ArrayBuffer),
  );
  return `TKN_${hex(mac).slice(0, 16)}`;
}

/**
 * Replaces detected PII with deterministic HMAC tokens. We reuse redaction's
 * detector to *find* the values, then swap its `[REDACTED-..]` placeholders for
 * stable crypto tokens and record the reverse mapping in the vault.
 */
export async function tokenizeSensitive(text: string, secret: string): Promise<TokenizeResult> {
  const { redacted, map } = redactSensitive(text);
  const vault: TokenVault = {};
  let out = redacted;
  for (const [placeholder, original] of Object.entries(map)) {
    const token = await hmacToken(secret, original);
    out = out.split(placeholder).join(token);
    vault[token] = original;
  }
  return { tokenized: out, vault };
}

/** Restores original values from a vault (inverse of tokenizeSensitive). */
export function detokenize(text: string, vault: TokenVault): string {
  let out = text;
  for (const [token, original] of Object.entries(vault)) {
    out = out.split(token).join(original);
  }
  return out;
}
