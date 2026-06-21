# AI Systems Register — Hawkeye Sterling CDD

**Governance Layer 1 (AI Discovery & Inventory): you can't govern what you can't see.**
This register is the single source of truth for every AI/LLM capability in the product.
Update it in the same pull request whenever an AI capability is added, changed, or retired.

Last reviewed: 2026-06-21 · Owner: Compliance / MLRO

---

## AI-001 · Compliance Co-pilot — Narrative polish

| Field                      | Value                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                 | Active (opt-in; disabled unless `ANTHROPIC_API_KEY` is set)                                                                                                                                 |
| **Purpose**                | Rephrase the deterministic compliance narrative into more fluent prose as a **draft** for the analyst.                                                                                      |
| **Model**                  | `claude-haiku-4-5-20251001` (pinned; override via `AI_COPILOT_MODEL`)                                                                                                                       |
| **Provider**               | Anthropic API (server-side, via Netlify Function)                                                                                                                                           |
| **Risk tier**              | **Limited risk / human-in-the-loop.** Advisory only; cannot set the risk band, decision, or finalise a report.                                                                              |
| **Inputs**                 | The app-generated narrative text only. PII (passport, Emirates ID, DOB, email) is redacted before the call — see `src/lib/ai/redaction.ts`.                                                 |
| **Authoritative fallback** | The deterministic narrative (`src/lib/narrative.ts`). Used whenever AI is unconfigured or fails.                                                                                            |
| **Human control point**    | Output opens in a review modal; the analyst **Accepts / edits / Discards** it. Accept inserts it in the report labelled AI-assisted; nothing is auto-applied. Logged to the activity trail. |
| **Assurance**              | Grounding / no-fabrication check (`src/lib/ai/grounding.ts`) + golden tests (`src/test/ai-copilot.test.ts`), run in CI.                                                                     |
| **Rollback**               | Unset `ANTHROPIC_API_KEY` (instantly reverts to deterministic narrative).                                                                                                                   |
| **Code**                   | `netlify/functions/ai-copilot.mts`, `src/lib/integrations/aiCopilot.ts`                                                                                                                     |

## AI-002 · Compliance Co-pilot — Adverse-media triage

| Field                            | Value                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Status**                       | Available (same backend, `mode: 'adverse-triage'`); not yet surfaced in the UI                  |
| **Purpose**                      | Summarise analyst-pasted raw adverse-media results into themed findings as a **suggestion**.    |
| **Model / Provider / Risk tier** | As AI-001. Cannot record a finding or change a band — the analyst enters the structured result. |
| **Inputs**                       | Analyst-pasted text, fenced as untrusted data; PII redacted before the call.                    |
| **Assurance / Rollback**         | As AI-001.                                                                                      |

## AI-003 · Asana AI Teammate (optional, deferred)

| Field                    | Value                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Status**               | **Not configured** (`get_workspace_agents` → empty). Registered here so it is governed if ever enabled.                        |
| **Purpose (if enabled)** | Triage / summarise tasks in the _Compliance Renewals_ Asana project.                                                           |
| **Governance condition** | Must obey the same human-review rule — no autonomous freezing, reporting, or decisioning. Add a full row here before enabling. |

---

## Layer-by-layer coverage

| Layer                               | How it is met                                                                           | Where                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1 · Discovery & Inventory           | This register                                                                           | `docs/AI-REGISTER.md`                                                                       |
| 2 · Data Governance                 | PII redaction before any model call; minimal inputs; no training on data                | `src/lib/ai/redaction.ts`                                                                   |
| 3 · Security & Resilience           | Key server-side only; untrusted-text fencing; timeout + size caps; 503 → safe fallback  | `netlify/functions/ai-copilot.mts`                                                          |
| 4 · Model & Agent Assurance         | Pinned model id; grounding check; golden eval tests in CI                               | `src/lib/ai/grounding.ts`, `src/test/ai-copilot.test.ts`                                    |
| 5 · Human Oversight                 | In-app Accept / edit / Discard review modal; never sets band/decision; activity-logged  | `AiCopilotModal.tsx`, `src/store/useAiCopilot.ts`, `src/components/workstation/Sidebar.tsx` |
| 6 · Governance / Compliance / Audit | Model id + outcome logged; AI-assistance disclosure printed on the report; reg. mapping | `src/pages/Report.tsx`, `docs/COMPLIANCE-NOTES.md`, activity log                            |

## Regulatory mapping (summary)

- **EU AI Act** — limited-risk transparency: AI assistance is disclosed and clearly labelled; no automated decision-making over customers.
- **ISO/IEC 42001** — this register + the compliance checklist evidence an AI management-system control loop.
- **NIST AI RMF** — _Map_ (this register), _Measure_ (grounding + eval tests), _Manage_ (human-in-the-loop, rollback switch), _Govern_ (sign-off + audit trail).

See `docs/COMPLIANCE-NOTES.md` for the firm checklist and the limitations the firm must confirm.
