/**
 * Secure Vector Database (VDB) — periodic-table block "VDB".
 *
 * A code-only, in-memory vector store for reference lookups (e.g. matching free
 * text to the firm's risk typologies). "Secure" here means: (1) a deterministic,
 * local hashing embedder — no text is sent to an external embedding model; (2)
 * access is gated by an RBAC permission so retrieval is authorised; (3) only
 * vectors + opaque ids are held, never the source PII. No external module.
 *
 * The embedder is a hashed bag-of-words projected into a fixed-dimension vector
 * with cosine similarity — sufficient for deterministic, dependency-free nearest-
 * neighbour over a small reference set.
 */
import { can, type Permission } from './rbac';
import type { Role } from './identity';

const DIM = 64;

/** Deterministic local embedding: hashed token bag → unit vector. */
export function embed(text: string): Float32Array {
  const v = new Float32Array(DIM);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    v[(h >>> 0) % DIM] += 1;
  }
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < DIM; i++) dot += a[i] * b[i];
  return dot;
}

export interface VectorRecord {
  id: string;
  label: string;
  vector: Float32Array;
}

export interface SearchHit {
  id: string;
  label: string;
  score: number;
}

const READ_PERMISSION: Permission = 'audit:view';

/** A minimal, access-controlled vector index. */
export class SecureVectorStore {
  private records: VectorRecord[] = [];

  /** Adds reference items. Only labels + vectors are stored (no raw PII). */
  upsert(items: { id: string; label: string; text: string }[]): void {
    for (const it of items) {
      const vector = embed(it.text);
      const existing = this.records.find((r) => r.id === it.id);
      if (existing) existing.vector = vector;
      else this.records.push({ id: it.id, label: it.label, vector });
    }
  }

  get size(): number {
    return this.records.length;
  }

  /**
   * Nearest-neighbour search, gated by RBAC. Throws when the caller's role lacks
   * read access (ZTA: retrieval is an authorised action, not ambient).
   */
  search(query: string, role: Role, topK = 3): SearchHit[] {
    if (!can(role, READ_PERMISSION)) {
      throw new Error('vector-store: read not permitted for role ' + role);
    }
    const q = embed(query);
    return this.records
      .map((r) => ({ id: r.id, label: r.label, score: cosine(q, r.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
