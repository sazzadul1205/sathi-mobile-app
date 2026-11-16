# Universal AI Documentation — Sathi Care Coordination PWA

> Single, comprehensive reference for AI agents and contributors working in this repository.
> Read this together with `AGENTS.md` (project rules) and the source-of-truth materials in `Project_Plan/`.
> Derived from the current codebase, configuration, and docs in this repo (2026-11-15).

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Quick start and commands](#2-quick-start-and-commands)
3. [Project identity and source of truth](#3-project-identity-and-source-of-truth)
4. [Repository structure](#4-repository-structure)
5. [System architecture](#5-system-architecture)
6. [Data model, local database, and sync](#6-data-model-local-database-and-sync)
7. [API contract (client-facing)](#7-api-contract-client-facing)
8. [Implemented scope and pending work](#8-implemented-scope-and-pending-work)
9. [Design system and styling](#9-design-system-and-styling)
10. [PWA implementation](#10-pwa-implementation)
11. [Testing, quality gates, and CI/CD](#11-testing-quality-gates-and-cicd)
12. [AI agent workflows and tooling](#12-ai-agent-workflows-and-tooling)
13. [Security, privacy, and medical-safety guardrails](#13-security-privacy-and-medical-safety-guardrails)
14. [Standard change workflows](#14-standard-change-workflows)
15. [Reference index](#15-reference-index)

---

## 1. Purpose and scope

This document consolidates the information an AI coding agent needs to work safely and correctly on Sathi:

- what the product is and what it must/must not do,
- where authoritative requirements live and how to trace work to them,
- how the app is structured (frontend, local-first data, future backend boundary),
- how to verify changes (tests, lint, build, CI),
- and which project-specific workflows and guardrails are mandatory.

**Scope boundary:** this repo is the **frontend PWA**. The backend (planned ASP.NET Core Web API + SQL Server) is a separate service and does not exist here; the client is architected for server sync but currently runs standalone offline. Do not invent backend behavior, endpoints, or requirements beyond the documented contract/SRS.

---

## 2. Quick start and commands

**Requirements:** Node.js `^20.19.0 || >=22.12.0` (see `package.json` engines).

| Command                  | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `npm install`            | Install deps (also (re)installs git hooks via `postinstall`) |
| `npm run dev`            | Vite dev server (PWA service worker enabled in dev)          |
| `npm run build`          | Production build incl. service worker + manifest (`dist/`)   |
| `npm run preview`        | Preview the production build                                 |
| `npm run lint`           | ESLint (must be clean)                                       |
| `npm test`               | Vitest unit + component tests once                           |
| `npm run test:watch`     | Vitest watch mode                                            |
| `npm run test:e2e`       | Playwright end-to-end tests (Chromium)                       |
| `npm run test:e2e:ui`    | Playwright UI runner                                         |
| `npm run test:all`       | Vitest, then Playwright                                      |
| `npm run generate:icons` | Regenerate PWA icons from `scripts/generate-icons.mjs`       |

**Mandatory verification before finishing changes:**

- Always: `npm run lint && npm test` (also enforced by the pre-push hook).
- If build config, tokens, manifest, or PWA surface changed: also `npm run build`.
- If routing, screens, or user flows changed: run `npm run test:e2e` when feasible (e2e requires Playwright Chromium installed: `npx playwright install chromium`).

---

## 3. Project identity and source of truth

### Product

Sathi is a shared care-coordination PWA for family members and caregivers to coordinate an elderly patient's **medication, inventory, purchases, and transport**. It is **online-first in intent** with **approved offline recording and queued sync**. The server is the authoritative shared record; this frontend must never be the sole authority for permissions, stock math, or shared-record integrity.

### Stack (this repo)

- React 19, Vite 8, Tailwind CSS 4, `vite-plugin-pwa`
- State/routing/forms: `zustand`, `react-router-dom`, `react-hook-form`, `zod`
- Testing: Vitest + Testing Library + jsdom, Playwright (Chromium), `fake-indexeddb`
- Planned backend (separate): ASP.NET Core Web API + SQL Server, REST over HTTPS

### Source of truth (read before building)

| Artifact                                             | Role                                                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Project_Plan/Medical Care Coordination App SRS …md` | **Requirements authority** — every feature traces to FR/BR/SR/NFR IDs. If not in the SRS, do not build it. |
| `Project_Plan/Design.html`                           | **Visual reference** (26 approved screens).                                                                |
| `docs/ARCHITECTURE.md`                               | System/frontend architecture and data-flow rules.                                                          |
| `docs/DATA_MODEL.md`                                 | Conceptual entities, relationships, and invariants.                                                        |
| `docs/LOCAL_DATABASE.md`                             | Standalone offline IndexedDB model and sync-readiness design.                                              |
| `docs/FRONTEND_STATUS.md`                            | Implemented vs. pending scope — read before claiming a feature exists.                                     |
| `docs/API_CONTRACT.md`                               | Client-facing REST/sync conventions and endpoint groups.                                                   |
| `docs/TESTING.md`                                    | Test layers, SRS→test mapping, and testing rules.                                                          |
| `docs/AI_DEVELOPMENT_INFRASTRUCTURE.md`              | Spec→context→plan→implement→verify→review→ship infrastructure.                                             |
| `AGENTS.md`                                          | Project rules every AI agent must follow.                                                                  |

**Read-only/generated:** `dist/` and `Project_Plan/` — never edit by hand.

---

## 4. Repository structure

```bash
.
├─ .github/workflows/ci.yml      CI: lint/test/build + e2e
├─ .kilo/                        Kilo commands, subagents, Agent Manager scripts
│  ├─ command/                   /feature, /verify, /review, /spec, /new-theme, /pwa-check
│  ├─ agent/                     frontend-dev, test-writer, pwa-auditor
│  ├─ setup-script.ps1           worktree npm ci
│  └─ run-script.ps1             dev server on per-worktree port
├─ docs/                         Architecture, data model, local DB, API, status, testing, AI infra
├─ e2e/                          Playwright specs
├─ Project_Plan/                 SRS + Design.html (read-only reference)
├─ public/                       Static assets and generated PWA icons
├─ scripts/generate-icons.mjs    Icon generation (sharp)
├─ src/
│  ├─ app/                       Router, session/plan guards, tab-bar shell
│  ├─ components/                Shared UI kit (semantic design tokens only)
│  ├─ lib/
│  │  ├─ db/                     IndexedDB schema/client/records/cipher (local-first, sync-ready)
│  │  └─ repo/                   Repositories: app, plan, medicines, schedule, inventory
│  ├─ pwa/                       Manifest (single source of truth) + manifest tests
│  ├─ screens/                   Login, PlanSelector, CreatePlan, Dashboard, Medicines,
│  │                             MedicineForm, Schedule, Settings (+ tests)
│  ├─ store/                     Zustand stores: session, plan, medicines
│  ├─ styles/themes/             Color variants (default/ocean/sage/dark) + contract test
│  ├─ test/                      Vitest setup and seed helpers
│  ├─ index.css                  Token mapping into Tailwind
│  ├─ main.jsx                   Entry point
│  └─ theme.js                   Theme init/set/persistence
├─ index.html                    App shell + PWA/meta links
├─ vite.config.js                Vite + Tailwind + vite-plugin-pwa config
├─ playwright.config.js          E2E config (dedicated dev server port)
├─ eslint.config.js              Lint config
├─ AGENTS.md                     Project rules for AI agents
└─ README.md                     Project overview
```

Dependency direction (intended): `app → features/screens → lib`; shared UI in `components/`. Feature code must use `src/lib/` adapters (db/repo; future api/sync/auth) rather than calling `fetch`/IndexedDB directly.

---

## 5. System architecture

### Context

- **Frontend (this repo):** React + Vite PWA. Online-first UI, offline capture, queued sync (sync-ready). UX-level guards only.
- **Backend (separate, planned):** ASP.NET Core Web API over HTTPS, SQL Server, Identity. Authoritative for permissions, business rules, audit, and sync conflict resolution.
- **Contract:** versioned REST JSON (`/api/v1`, camelCase) with idempotent sync events; see `docs/API_CONTRACT.md`.

### Online data flow (target)

1. User action → feature/screen → `lib` adapter → backend (permission checked server-side).
2. Response is authoritative → update local caches/UI.
3. Audit-relevant actions render from server response, not optimistic-only assumptions.

### Offline data flow (local-first, sync-ready)

1. **Read:** serve previously synced/authorized data from IndexedDB (no network required).
2. **Write:** create immutable local events with unique `eventId`, `recordedBy`, `eventTime`, and `syncState` (`pending|synced|conflict`).
3. **Queue:** outbound events accumulate in `syncQueue` (keyed by `eventId`); UI can surface pending/sync state.
4. **Sync (future):** push batched events with IDs; server dedupes by `eventId` (retries never duplicate). Server response authoritative; conflicts returned for authorized review, never applied silently.
5. **Revocation:** access changes apply on reconnect; UX must state this honestly.

Offline authorization for sensitive operations expires **24 h** after last online authorization (FR-73/74).

### PWA runtime

- `vite-plugin-pwa` with `generateSW`, `registerType: 'autoUpdate'`.
- Precaches build assets/icons/manifest; navigate fallback `/index.html`.
- Runtime caching: images CacheFirst (30 days), fonts CacheFirst (1 year).
- Dev SW enabled; Playwright e2e blocks service workers for determinism.

---

## 6. Data model, local database, and sync

### Conceptual entities (see `docs/DATA_MODEL.md`)

`User`, `CarePlan` (1:1 `Patient`), `CarePlanMember`, `Medicine`, `MedicationSchedule`, `DoseRecord`, `Inventory`/`InventoryLocation`, `StockMovement`, `PurchaseRecord`, `TransferRecord`, `Notification`, `AuditLog`, `SyncRecord`.

Key invariants:

- One care plan ↔ one patient (BR-01).
- Schedules derive from manually entered prescriptions (BR-04); no auto-generated/prescribing behavior (FR-16/17, BR-15).
- Only `given` dose outcomes reduce stock (BR-05); purchases increase stock only on receipt (BR-06).
- Transfers never change totals; carried stock stays in total (BR-07/08).
- Corrections/adjustments are append-only, reasoned, never silent overwrites (BR-09/12, FR-26/41).

### Local IndexedDB model (see `docs/LOCAL_DATABASE.md`)

- **App DB (`sathi-app`, device-wide):** `plans`, `users` (no credentials), `session` (incl. offline auth expiry), `meta`, `keys`.
- **Plan DB (`sathi-plan-<planId>`, per plan):** `patient`, `locations`, `members`, `medicines`, `schedules`, `doseRecords`, `inventory`, `stockMovements`, `purchases`, `transfers`, `notifications`, `auditLog`, `syncQueue`.
- **Isolation:** one DB per plan (SR-07); plan deletion is a full local wipe (SR-13).
- **Sync envelope on plan records:** `id`, `eventId`, `planId`, `recordedBy`, `createdAt`, `updatedAt`, `eventTime`, `arrivalTime`, `syncState`, `serverId`, `revision`.
- **Ledger immutability (enforced in `src/lib/db/records.js`):** `doseRecords`, `stockMovements`, `auditLog` are append-only; only sync metadata (`markSynced`/`markConflict`) may mutate ledger rows.
- **Encryption boundary (`src/lib/db/cipher.js`):** field-level encryption for sensitive fields (e.g. patient/dose notes); `identityCipher` for dev/tests, AES-GCM-256 via WebCrypto for at-rest protection (defense-in-depth; not a substitute for server-side security).
- **Migrations:** `SCHEMA_VERSION` + additive migrations in `src/lib/db/schema.js`.

---

## 7. API contract (client-facing)

Defined in `docs/API_CONTRACT.md` (to be mirrored/finalized with backend):

- HTTPS only, base `/api/v1`, JSON camelCase, ISO-8601 UTC dates.
- Bearer auth; re-auth for sensitive operations; rate-limited public auth endpoints.
- Errors: RFC 7807 `application/problem+json`; failed logins must not reveal account existence.
- Plan-scoped URLs (`/plans/{planId}/…`) enforce isolation (SR-07); permissions enforced server-side (SR-02/08).
- Endpoint groups: Auth, Plans, Members, Patient, Medicines, Schedules, Dose records, Inventory, Purchases, Transfers, Notifications, Sync, Audit.
- **Sync:** client pushes batched events (`eventId`, `type`, `payload`, `recordedBy`, `eventTime`); server dedupes by `eventId`; per-event result `accepted|duplicate|conflict`; conflicts surfaced for review (never silently applied). Pull via changes since cursor. Event time and arrival time both preserved (FR-79).
- **Versioning:** additive within `/api/v1`; breaking changes bump major version. Client adapter is the single place that knows the base version.

**Note:** no real API client/sync engine is wired in this repo yet; `syncQueue` accumulates events locally (see frontend status).

---

## 8. Implemented scope and pending work

See `docs/FRONTEND_STATUS.md` for the authoritative, verified status.

### Implemented (standalone, verified)

- App shell/routing with session + plan guards and tab navigation.
- Local device auth/profiles (no shared credentials) with 24 h offline authorization.
- Care plan create/select/delete (local wipe semantics).
- Dashboard (plan context, dose summary, upcoming doses, low-stock alerts, quick actions).
- Medicines CRUD with manual instructions, separate strength records, low-stock threshold.
- Stock ledger (append-only movements: receipt/consumption/adjustment), derived totals.
- Schedule + dose recording (outcomes given/missed/refused/other; `given` reduces stock; corrections append-only with reason).
- Sync-readiness envelope and `syncQueue` (event IDs/times/states) — no network push yet.
- PWA (manifest, icons, SW, offline shell, caching) and modular theme system (4 variants).

### Not yet implemented (planned)

- Backend service + real sync/push-pull and conflict resolution UI.
- Members/permissions management UI (model exists).
- Inventory screen (per-location view), purchases, transfers, notifications, audit history UI, account recovery.
- Cloud/server-backed auth (currently local device profiles).
- Background sync worker in the service worker.

Do not claim these features exist unless verified in code/tests.

---

## 9. Design system and styling

- **Tokens:** semantic design tokens only in components (e.g. `bg-brand`, `text-ink`, status colors). **Never hardcode hex values in components.**
- **Theme system:** `src/styles/themes/*.css` define `[data-theme="…"]` token sets; `src/index.css` maps `--t-*` tokens into Tailwind utilities; `src/theme.js` controls init/set/persistence and first-run OS dark-mode handling.
- **Variants:** `default` (teal), `ocean`, `sage`, `dark`. Adding a variant = new theme file satisfying the full token contract + import in `src/index.css` + register in `availableThemes` (`src/theme.js`). Guarded by `src/styles/themes.test.js`.
- **Layout:** mobile-first; follow `Project_Plan/Design.html`.

---

## 10. PWA implementation

- **Manifest:** single source of truth `src/pwa/manifest.js` (consumed by `vite.config.js`, validated by `src/pwa/manifest.test.js`).
- **Icons:** generated into `public/` by `scripts/generate-icons.mjs` (192, 512, 512 maskable, apple-touch 180, favicons). Re-run `npm run generate:icons` after artwork changes.
- **Service worker:** Workbox generateSW via VitePWA; precaches app shell/assets; navigate fallback `/index.html`; runtime CacheFirst for images/fonts.
- **HTML:** `index.html` includes theme-color, description, apple-touch/meta, and favicon links.
- **Validation:** manifest/icon tests, build artifacts (`dist/sw.js`, `dist/manifest.webmanifest`, icons), and `/pwa-check` workflow.

---

## 11. Testing, quality gates, and CI/CD

### Test layers

| Layer                     | Location / tool              | Purpose                                                |
| ------------------------- | ---------------------------- | ------------------------------------------------------ |
| Theme contract            | `src/styles/themes.test.js`  | every variant defines full token contract              |
| PWA manifest/assets       | `src/pwa/manifest.test.js`   | manifest fields + PNG signature/dimensions             |
| Local DB                  | `src/lib/db/db.test.js`      | schema, isolation, envelope, ledger, queue, cipher     |
| Repositories/domain logic | `src/lib/repo/repo.test.js`  | care rules, append-only behavior, derived totals       |
| Components/screens        | `src/**/*.test.jsx`          | render/interaction against real repos + fake-indexeddb |
| End-to-end                | `e2e/*.spec.js` (Playwright) | real UI flows, routing, guards, persistence            |

### Testing rules (see `docs/TESTING.md`)

- Trace tests to SRS IDs where applicable; prefer behavior over implementation.
- Offline/sync-related tests must prove: no duplicates on replay (FR-80), conflicts flagged not applied (FR-81/82), event time preserved (FR-79).
- Do not assert against `dist/`; assert source-level contracts/behavior.

### Enforcement

- **Pre-push hook** (`simple-git-hooks`): `npm run lint && npm test` (blocks push on failure; hooks installed on `npm install`).
- **CI** (`.github/workflows/ci.yml`, push/PR): job `build` runs `npm ci → lint → test → build` and uploads `dist/`; job `e2e` installs Playwright Chromium and runs `npm run test:e2e`, uploads report.

### Config notes

- Vitest: jsdom, setup `src/test/setup.js`, includes `src/**/*.{test,spec}.{js,jsx}` only (e2e excluded).
- Playwright: `e2e/`, dedicated dev server on port `5199` (`strictPort`, no reuse), service workers blocked, mobile-like viewport.

---

## 12. AI agent workflows and tooling

### Project instructions

- **`AGENTS.md`** — mandatory project rules (spec-first, commands, architecture, styling, security).
- **Global instructions** (if present in environment) may also apply; follow project-specific rules in this repo.

### Kilo commands (`.kilo/command/`)

| Command      | Purpose                                                                          |
| ------------ | -------------------------------------------------------------------------------- |
| `/feature`   | Spec-first workflow: SRS IDs → plan → failing tests → implement → verify         |
| `/verify`    | Full quality gate: lint, test, build, audit                                      |
| `/review`    | Multi-perspective review of uncommitted changes (no fixes)                       |
| `/spec`      | Read-only SRS briefing for a topic (IDs, entities, acceptance criteria, screens) |
| `/new-theme` | Add a color variant end-to-end with contract/test/build checks                   |
| `/pwa-check` | Validate manifest, icons, HTML meta, SW config, and build artifacts              |

### Kilo subagents (`.kilo/agent/`)

- **`frontend-dev`** — implements frontend features under spec-first, layering, token, and safety rules.
- **`test-writer`** — writes failing, SRS-traceable tests first (no feature implementation).
- **`pwa-auditor`** — audits/fixes trivial PWA surface gaps.

### Agent Manager (worktrees)

- `.kilo/setup-script.ps1` — `npm ci` in worktrees.
- `.kilo/run-script.ps1` — dev server on a per-worktree port.

### Spec-driven loop

`Spec → Context → Plan → Implement → Verify → Review → Ship`

- Locate FR/BR/SR/NFR IDs in the SRS; extend tests from acceptance criteria first.
- Implement respecting server authority and append-only/audit rules.
- Pass all gates locally and in CI before merge.

---

## 13. Security, privacy, and medical-safety guardrails

### Hard rules

- **No prescribing/diagnosis:** never suggest doses, diagnose, or recommend treatment changes (BR-15).
- **Server-authoritative boundaries:** permissions, stock math, and shared-record integrity are enforced by the backend; client checks are UX mirrors only (SRS §8, SR-02).
- **Append-only integrity:** dose outcomes, stock movements, corrections, and audit records are never silently overwritten (FR-26/41, BR-09/12, SR-09/10). Conflicts are flagged for review.
- **Stock semantics:** only `given` reduces stock; purchases add stock only on receipt; transfers move stock without changing totals; carried stock remains in totals (BR-05/06/07/08).
- **Secrets and sensitive data:** no credentials/tokens/keys in source, storage, or logs (SR-06). No sensitive patient details in notification previews or URLs (SR-12).
- **Isolation and access:** plan-scoped data isolation (SR-07); unknown/revoked authorization must never grant access (SR-15). Offline auth expires after 24 h (FR-73); revocation applies on reconnect (FR-75).
- **Local cache:** sensitive fields encrypted at rest (SR-05, defense-in-depth).

### Operational safety

- Do not claim the backend, sync, or unimplemented screens exist.
- Do not commit unless explicitly requested; do not perform destructive operations without approval.
- Prefer correctness and traceability over speculative features.

---

## 14. Standard change workflows

### Feature

1. **Spec check:** identify SRS FR/BR/SR/NFR IDs and relevant design screens; stop if unspecced/ambiguous.
2. **Plan:** affected files/screens and API contract impact.
3. **Tests first:** encode acceptance criteria as failing tests.
4. **Implement:** respect layering, tokens, adapters, append-only and authority rules.
5. **Verify:** `npm run lint && npm test` (+ `npm run build` / e2e as applicable).
6. **Review & ship:** spec/correctness/security/architecture review; CI green.

### Bugfix

Reproduce → add failing regression test → fix → full gates. Never fix without a test.

### Schema / API / data change

Update data model + API contract docs first (when applicable), then backend/client adapters/UI. Prefer additive changes; breaking contract changes require versioning. Do not rewrite ledger history.

### Design / theme change

Change tokens/theme files first → token-contract test must pass → screens follow tokens → update visual reference only if required.

---

## 15. Reference index

| Topic                          | Primary location                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Agent rules                    | `AGENTS.md`                                                                         |
| Product overview               | `README.md`                                                                         |
| Requirements                   | `Project_Plan/Medical Care Coordination App SRS …md`                                |
| Visual design                  | `Project_Plan/Design.html`                                                          |
| Architecture                   | `docs/ARCHITECTURE.md`, `docs/AI_DEVELOPMENT_INFRASTRUCTURE.md`                     |
| Data model                     | `docs/DATA_MODEL.md`                                                                |
| Local/offline DB & sync design | `docs/LOCAL_DATABASE.md`                                                            |
| API/sync contract              | `docs/API_CONTRACT.md`                                                              |
| Implemented vs pending         | `docs/FRONTEND_STATUS.md`                                                           |
| Testing                        | `docs/TESTING.md`, `e2e/`, `src/**/*.test.*`                                        |
| PWA                            | `src/pwa/manifest.js`, `vite.config.js`, `scripts/generate-icons.mjs`, `index.html` |
| CI                             | `.github/workflows/ci.yml`                                                          |
| Kilo workflows                 | `.kilo/command/*.md`, `.kilo/agent/*.md`                                            |

---

_This document is a consolidation aid. When details conflict, defer to the SRS for requirements, to code/tests/CI config for current behavior, and to `docs/FRONTEND_STATUS.md` for implemented scope._
