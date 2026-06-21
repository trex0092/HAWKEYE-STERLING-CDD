/**
 * Typology suggestion index (uses the secure vector store, VDB).
 *
 * Builds a single access-controlled `SecureVectorStore` from the reference
 * typologies and exposes a nearest-match lookup. The match is **advisory only** —
 * it suggests likely themes from analyst-pasted text so the analyst can consider
 * them; it never records a finding or changes a band (HITL preserved).
 */
import { SecureVectorStore, type SearchHit } from '@/lib/security/vectorStore';
import { TYPOLOGIES } from '@/data/typologies';
import type { Role } from '@/lib/security/identity';

let store: SecureVectorStore | null = null;

function index(): SecureVectorStore {
  if (!store) {
    store = new SecureVectorStore();
    store.upsert(TYPOLOGIES.map((t) => ({ id: t.id, label: t.label, text: t.text })));
  }
  return store;
}

const tokenize = (t: string): Set<string> => new Set(t.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/**
 * Returns the top typology matches for free text, gated by the caller's role.
 * Requires real lexical overlap with the typology (not just a vector score) so an
 * unrelated paste yields no noise.
 */
export function suggestTypologies(text: string, role: Role, topK = 3): SearchHit[] {
  if (!text.trim()) return [];
  const q = tokenize(text);
  return index()
    .search(text, role, topK * 2)
    .filter((h) => {
      const ty = TYPOLOGIES.find((t) => t.id === h.id);
      if (!ty || h.score <= 0.05) return false;
      return [...tokenize(ty.text)].some((tok) => q.has(tok));
    })
    .slice(0, topK);
}
