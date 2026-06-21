/**
 * Encryption (ENC) — periodic-table block "ENC". Data-at-rest protection built on
 * the platform Web Crypto API (AES-GCM + PBKDF2) — no external module.
 *
 * The assessment is persisted to localStorage (src/store/useAssessment.ts). This
 * module supplies a key derived from the session passphrase and an
 * encrypt/decrypt pair, plus `createEncryptedStorage` — a drop-in async storage
 * adapter for Zustand `persist`. The adapter is *transparent before unlock*: with
 * no key set it passes plaintext through (and can read legacy plaintext), so the
 * app and tests keep working; once a key is installed at unlock it writes
 * ciphertext. In transit, confidentiality is provided by HTTPS (the function
 * endpoints), which is outside application code.
 */

const PBKDF2_ITERATIONS = 150_000;
const SALT = 'hawkeye-cdd-v1'; // app-scoped salt; the passphrase is the secret.
const CIPHER_PREFIX = 'enc:v1:'; // marks a value this adapter produced.

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Derives an AES-GCM key from a passphrase via PBKDF2-SHA256. */
export async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase) as unknown as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT) as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypts a UTF-8 string; output is `enc:v1:<iv>.<ciphertext>` (base64). */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
      key,
      enc.encode(plaintext) as unknown as ArrayBuffer,
    ),
  );
  return `${CIPHER_PREFIX}${toB64(iv)}.${toB64(ct)}`;
}

/** Decrypts a value produced by encryptString. Throws on tamper/wrong key. */
export async function decryptString(key: CryptoKey, payload: string): Promise<string> {
  const body = payload.slice(CIPHER_PREFIX.length);
  const [ivB64, ctB64] = body.split('.');
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(ivB64) as unknown as ArrayBuffer },
    key,
    fromB64(ctB64) as unknown as ArrayBuffer,
  );
  return dec.decode(pt);
}

/** True when a stored value is one this adapter encrypted. */
export function isCiphertext(value: string): boolean {
  return value.startsWith(CIPHER_PREFIX);
}

/**
 * A module-scoped session key. Installed at unlock (deriveKey from the passphrase)
 * and cleared on lock. The persist adapter reads it lazily so it can encrypt as
 * soon as the key exists and fall back to plaintext before it does.
 */
let sessionKey: CryptoKey | null = null;
export async function installSessionKey(passphrase: string): Promise<void> {
  sessionKey = await deriveKey(passphrase);
}
export function clearSessionKey(): void {
  sessionKey = null;
}
export function hasSessionKey(): boolean {
  return sessionKey !== null;
}

/**
 * Drop-in async storage for Zustand `persist`. Encrypts on write when a session
 * key is present; decrypts on read; transparently reads legacy plaintext so
 * existing localStorage data is not lost (it is re-encrypted on the next write).
 */
export function createEncryptedStorage(backing: Storage = localStorage) {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const raw = backing.getItem(name);
      if (raw === null) return null;
      if (!isCiphertext(raw)) return raw; // legacy plaintext — migrate on next write.
      if (!sessionKey) return null; // locked: cannot read ciphertext yet.
      try {
        return await decryptString(sessionKey, raw);
      } catch {
        return null; // tampered or wrong key — treat as empty.
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      if (sessionKey) backing.setItem(name, await encryptString(sessionKey, value));
      else backing.setItem(name, value); // pre-unlock writes stay plaintext.
    },
    removeItem: async (name: string): Promise<void> => backing.removeItem(name),
  };
}
