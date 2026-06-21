# AI Governance & Security Controls — code map

This maps every block of the _AI Governance & Security Periodic Table (2026)_ to its
implementation in this repository. The controls are **code-only**: they use the existing
stack plus the platform Web Crypto API — no new dependencies, no new external integrations,
and the Asana integration is untouched.

> Honesty note: controls that normally require a backend (SSO/IAM/MFA federation) are
> implemented as self-contained in-code engines plus a documented seam (mirroring the
> existing `authenticate()` / `VITE_AUTH_ENDPOINT` pattern). For the unscoped single-operator
> prototype the default session identity is administrator, preserving prior behaviour; a real
> deployment resolves a narrower role at unlock and RBAC/ABAC then restrict accordingly.

## Identity & Access Control

| Block | Implementation                                                                   | Code                                               |
| ----- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| RBAC  | Role → permission matrix; gates UI + sensitive store actions                     | `src/lib/security/rbac.ts`                         |
| ABAC  | Attribute rules (role/resource/session) in the policy engine                     | `src/lib/governance/policy.ts`                     |
| MFA   | RFC-6238 TOTP second factor (Web Crypto HMAC-SHA1) at the gate                   | `src/lib/security/totp.ts`, `LockGate.tsx`         |
| SSO   | OIDC-style seam with code-only local identity provider                           | `src/lib/security/sso.ts`                          |
| IAM   | User/role registry + session identity                                            | `src/lib/security/identity.ts`, `useAssessment.ts` |
| ZTA   | `authorizeAction` choke point — re-verify identity+permission+session per action | `src/lib/governance/policy.ts`                     |

## Data Protection

| Block | Implementation                                                | Code                                             |
| ----- | ------------------------------------------------------------- | ------------------------------------------------ |
| VDB   | Access-controlled in-memory vector store, local hash-embedder | `src/lib/security/vectorStore.ts`                |
| PIPE  | Composed egress pipeline (validate→threat→redact→DLP)         | `src/lib/security/pipeline.ts`                   |
| TOKEN | Deterministic HMAC-SHA256 tokenization + vault                | `src/lib/security/tokenization.ts`               |
| ENC   | AES-GCM + PBKDF2 at-rest encryption; Zustand persist adapter  | `src/lib/security/crypto.ts`, `useAssessment.ts` |
| MASK  | PII redaction before any model call (reused everywhere)       | `src/lib/ai/redaction.ts`                        |
| DLP   | Outbound scanner for residual PII/secrets; hard-block egress  | `src/lib/security/dlp.ts`                        |

## Risk Management

| Block  | Implementation                                          | Code                                                |
| ------ | ------------------------------------------------------- | --------------------------------------------------- |
| RISK   | AI-output risk score (hallucination+bias+threat)        | `src/lib/governance/aiRisk.ts`                      |
| DRIFT  | Baseline-vs-recent degradation over AI telemetry        | `src/lib/governance/drift.ts`                       |
| BIAS   | Loaded-language + protected-characteristic checks       | `src/lib/governance/bias.ts`                        |
| HALL   | Quantified hallucination scorer on grounding            | `src/lib/governance/hallucination.ts`               |
| THREAT | Prompt-injection/jailbreak signatures (client + server) | `src/lib/security/threatIntel.ts`, `ai-copilot.mts` |
| REDT   | Adversarial red-team test suite (CI)                    | `src/test/redteam.test.ts`                          |

## Monitoring & Observability

| Block | Implementation                                                  | Code                                                    |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------- |
| MON   | Health snapshot in the Activity Log governance panel            | `src/lib/governance/monitor.ts`, `ActivityLogModal.tsx` |
| ANOM  | Threshold detection over telemetry (bursts, denials, off-hours) | `src/lib/governance/anomaly.ts`                         |
| LOG   | Structured telemetry over the activity log + audit mirror       | `src/lib/governance/telemetry.ts`                       |
| LAT   | AI round-trip latency captured per call                         | `src/lib/integrations/aiCopilot.ts`                     |
| PERF  | Grounded/acceptance/risk/latency aggregation                    | `src/lib/governance/performance.ts`                     |

## Audit & Accountability

| Block   | Implementation                                         | Code                                                      |
| ------- | ------------------------------------------------------ | --------------------------------------------------------- |
| AUDIT   | Tamper-evident SHA-256 hash chain (seal & verify)      | `src/lib/governance/auditChain.ts`, `useAssessment.ts`    |
| TRACE   | Telemetry + activity trail + version history           | `src/lib/governance/telemetry.ts`, `useAssessment.ts`     |
| RESP    | Responsibility map (capability owners) + sign-off      | `src/lib/security/identity.ts`, `Section08Signoff.tsx`    |
| RCause  | Failure taxonomy (category/cause/remediation)          | `src/lib/governance/rootCause.ts`                         |
| ESC     | Screening escalation + AI/threat/anomaly human routing | `src/lib/risk.ts`, `src/lib/governance/escalation.ts`     |
| APPROVE | RBAC/ABAC-aware export + AI accept gate                | `src/lib/report.ts` (`canExportAs`), `AiCopilotModal.tsx` |
| HITL    | AI advisory only; analyst Accept/Edit/Discard          | `AiCopilotModal.tsx`, `AiTriageModal.tsx`                 |

## Compliance & Governance

| Block  | Implementation                                       | Code                                                 |
| ------ | ---------------------------------------------------- | ---------------------------------------------------- |
| DOC    | This map + AI register + compliance notes            | `docs/GOVERNANCE-CONTROLS.md`, `docs/AI-REGISTER.md` |
| POLICY | Central policy engine (enforcement backbone)         | `src/lib/governance/policy.ts`                       |
| ISO42K | Machine-checkable control register + validation test | `src/lib/governance/iso42001.ts`                     |
| GDPR   | Erasure, portability, consent gate, retention flag   | `src/lib/governance/gdpr.ts`, `useAssessment.ts`     |
| AIACT  | Risk-tier classification, prohibited-use guard, ROPA | `src/lib/governance/aiAct.ts`                        |
| USAGE  | Per-action/actor/AI-adoption analytics               | `src/lib/governance/usage.ts`                        |

## Tests

`src/test/security.test.ts`, `src/test/governance.test.ts`, `src/test/redteam.test.ts`
(plus the existing suites) — all run in CI via `npm run test`.
