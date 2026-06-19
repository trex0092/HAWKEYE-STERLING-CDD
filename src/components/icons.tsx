/**
 * Icon registry — maps the design's placeholder Unicode glyphs to our icon set
 * (lucide-react). Importing from here keeps the glyph→icon swap in one place.
 *
 *   ⎙ → PrintExport     ✓ → Complete / Diligence   ☰ → Register
 *   ▤ → ActivityLog     ↗ → SendToAsana            ↺ → Reset
 *   ⟳ → ReAssess        ⏱ → Countdown
 *   ⊟ → LockToggle      🔒 → LockBadge             ▶ → Override
 *   + → AddPerson       (remove) → RemovePerson
 */
export {
  Printer as PrintExport,
  CheckCircle2 as Complete,
  ClipboardList as Register,
  ScrollText as ActivityLog,
  ArrowUpRight as SendToAsana,
  RotateCcw as Reset,
  RefreshCw as ReAssess,
  Timer as Countdown,
  Lock as LockToggle,
  Lock as LockBadge,
  ChevronRight as Override,
  Plus as AddPerson,
  Trash2 as RemovePerson,
  ShieldCheck as Diligence,
  ArrowLeft as Back,
  TriangleAlert as Alert,
} from 'lucide-react';
