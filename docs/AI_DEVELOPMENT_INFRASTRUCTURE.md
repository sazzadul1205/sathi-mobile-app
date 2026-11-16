# AI Development Infrastructure — Sathi Care Coordination PWA

> Architectural overview of the spec-to-ship workflow and guardrails for AI/human contributors. No implementation code. Derived from SRS (`Project_Plan/`), design, and current repo state.

---

## 1. Loop

`Spec → Context → Plan → Implement → Verify → Review → Ship`

Every change must be traceable to SRS FR/BR/SR/NFR IDs (or explicitly identified as non-spec local work) and pass automated gates.

## 2. System context

- **Frontend (this repo):** React + Vite PWA, local-first IndexedDB, offline-capable, sync-ready model.
- **Backend (planned, separate):** ASP.NET Core Web API + SQL Server — authoritative permissions, rules, audit, sync/conflicts.
- **Contract:** REST `/api/v1` (camelCase JSON, HTTPS, idempotent sync events) per `docs/API_CONTRACT.md`.

## 3. Principles

| Principle | Consequence |
| --- | --- |
| Server-authoritative (target) | Client never invents permissions/stock/shared truth; UX mirrors only. |
| Local-first/offline-capable | Records/events queued locally; no duplicate replay; conflicts flagged. |
| Auditability & append-only care history | Corrections/ledgers never silently overwritten. |
| Privacy & medical safety | No prescribing/diagnosis; minimize sensitive exposure; encrypted/sealed local boundaries where implemented. |
| Spec-driven | Tests and implementation trace to SRS/design; update docs/tests with behavior changes. |

## 4. Layers

- **L1 Spec/planning:** `Project_Plan/` (SRS, `Design.html`), derived docs (`docs/*.md`), SRS→test mapping.
- **L2 Context/agents:** `AGENTS.md`, `.kilo/command/*`, `.kilo/agent/*`, focused domain context.
- **L3 Implementation:** `src/app`, `src/screens`, `src/components`, `src/store`, `src/lib/{db,repo,security}`, `src/pwa`, `src/styles`.
- **L4 Quality gates:** ESLint, Vitest, Playwright e2e, build/PWA artifacts, CI; pre-push hook (`lint && test`).
- **L5 Design system:** semantic tokens/themes with contract tests; no hardcoded component hex.
- **L6 Data integrity & sync:** sync envelope/queue, append-only ledgers, per-dose schedule model, correction semantics, future server sync.
- **L7 Security/compliance:** CSP/referrer hardening, device-key/cipher and sealed payload helpers, no secrets in code/logs, plan isolation, SRS safety rules.
- **L8 Release/ops:** CI artifacts (`dist/`), static hosting over HTTPS for frontend, backend versioned separately against shared contract.

## 5. Standard workflows

- **Feature:** spec IDs/screens → plan → failing tests → implement → verify (`lint`, `test`, `build`/`e2e` as needed) → review → ship.
- **Bugfix:** reproduce → regression test → fix → full gates.
- **Schema/API/data:** update model/contract docs first (when applicable), additive preferred, preserve ledger history.
- **Design/theme:** tokens first → contract tests → screens follow tokens.
- **PWA/security:** validate manifest/icons/meta/SW/CSP and keep transport/security claims accurate.

## 6. Guardrails

1. No prescribing, diagnosis, or automatic dose/treatment recommendations.
2. Only `given` reduces stock; purchases affect stock on receipt per rules.
3. Transfers do not change totals; carried stock remains in totals.
4. No silent overwrites — corrections/conflicts are explicit records.
5. Client is not the permission/authority source; backend enforces when present.
6. Keep docs/tests current with behavior; do not claim unimplemented backend/sync/capabilities.
7. Zero known avoidable lint/test regressions at merge time.

## 7. Extension points

- Backend service + real sync/auth/conflict resolution (separate repo) against shared contract.
- Wiring `secureFetch`/sealed envelopes and field encryption into real API/sync flows with server-side counterparts.
- Additional themes/screens/capabilities via spec-first, token-safe, test-gated changes.
