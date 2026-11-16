# Universal AI Documentation — Sathi Care Coordination PWA

> Single, comprehensive reference for AI agents and contributors working in this repository.
> Read together with `AGENTS.md` and source-of-truth materials in `Project_Plan/`.
> Derived from the current codebase, configuration, and docs in this repo (2026-11-16 snapshot).

---

## 1. Purpose and scope

This document consolidates what AI coding agents need to work safely and correctly on Sathi: product intent, authoritative sources, architecture, local-first data/sync model, implemented scope, verification, and guardrails.

**Scope boundary:** this repo is the **frontend PWA**. The backend (planned ASP.NET Core Web API + SQL Server) is separate and not present here. The app runs standalone offline (local-first IndexedDB). Do not claim backend behavior, real sync, or server-enforced security/permissions beyond documented contracts and implemented local behavior.

---

## 2. Quick start and commands

**Requirements:** Node.js `^20.19.0 || >=22.12.0`.

| Command | Purpose |
| --- | --- |
| `npm install` | Install deps (installs git hooks via `postinstall`) |
| `npm run dev` | Vite dev server (PWA SW enabled in dev) |
| `npm run build` | Production build + service worker + manifest (`dist/`) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit/component tests once |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright e2e (Chromium, dedicated port 5199) |
| `npm run test:e2e:ui` | Playwright UI runner |
| `npm run test:all` | Vitest then Playwright |
| `npm run generate:icons` | Regenerate PWA icons |

**Verification:** `npm run lint && npm test` always (pre-push hook). Add `npm run build` for build/config/token/manifest/PWA changes and `npm run test:e2e` for routing/screen/flow changes (requires `npx playwright install chromium` once).

---

## 3. Project identity and source of truth

**Product:** Sathi coordinates medication, inventory, purchases, and transport for a shared care plan. Intended model: online-first with approved offline recording and queued sync; server authoritative for permissions, stock integrity, and shared records.

**Stack:** React 19, Vite 8, Tailwind CSS 4, `vite-plugin-pwa`, `zustand`, `react-router-dom`, `react-hook-form`, `zod`, Vitest/Testing Library/jsdom, Playwright, `fake-indexeddb`.

**Source of truth:** SRS in `Project_Plan/` (FR/BR/SR/NFR IDs), `Project_Plan/Design.html` (26 visual screens), `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/LOCAL_DATABASE.md`, `docs/API_CONTRACT.md`, `docs/FRONTEND_STATUS.md`, `docs/TESTING.md`, `docs/AI_DEVELOPMENT_INFRASTRUCTURE.md`, `AGENTS.md`. `Project_Plan/` and `dist/` are read-only/generated.

---

## 4. Repository structure (key paths)

- `.github/workflows/ci.yml` — lint/test/build + e2e CI.
- `.kilo/command/*.md`, `.kilo/agent/*.md`, `.kilo/*-script.ps1` — Kilo workflows/agents/Agent Manager scripts.
- `docs/*.md` — architecture, data model, local DB, API contract, status, testing, AI infra, this document.
- `e2e/` — Playwright specs/helpers.
- `src/app/` — router and guards/shell; `src/screens/` — UI screens + tests; `src/components/` — shared UI.
- `src/lib/db/` — IndexedDB schema/client/records/cipher/device key; `src/lib/repo/` — domain repositories; `src/lib/security/` — sealed envelope and secure fetch helpers.
- `src/store/` — Zustand stores (session, plan, medicines, members).
- `src/pwa/manifest.js` — manifest source of truth; `src/styles/themes/` — token variants.

---

## 5. System architecture

- **Frontend (this repo):** React PWA, local-first reads/writes to plan-scoped IndexedDB, UX guards only.
- **Backend (planned):** authoritative API (auth/permissions/rules/audit/sync/conflicts). Not implemented here.
- **Local data flow:** writes create sync-ready records/events (envelope with `eventId`, times, `syncState`, etc.); outbound events accumulate in `syncQueue`. No network push/pull yet.
- **PWA runtime:** generateSW/autoUpdate, precache app shell/assets, navigate fallback `/index.html`, runtime CacheFirst for images/fonts; dev SW enabled, e2e blocks SW.

Layering intent: `app → screens/features → lib`; shared UI in `components/`. Prefer `src/lib` adapters over direct `fetch`/IndexedDB in feature code.

---

## 6. Data model, local database, and sync

### Entities/invariants
`User/profile`, `CarePlan` (1:1 `Patient`), `CarePlanMember`, `Medicine`, schedule/times, `DoseRecord`, inventory/locations/`StockMovement`, `PurchaseRecord`, `TransferRecord`, `Notification`, `AuditLog`, `SyncRecord/queue`.

- One plan ↔ one patient (BR-01). Manual instructions only (BR-15). Only `given` reduces stock (BR-05); purchases increase stock on receipt (BR-06). Transfers do not change totals (BR-07/08). Corrections/adjustments append-only, reasoned (BR-09/12, FR-26/41). No duplicate replay by `eventId` (FR-80); conflicts surfaced, not silently applied (FR-81/82).

### Local storage
- **App DB (`sathi-app`):** `plans`, `users`, `session` (offline auth expiry), `meta`, `keys`.
- **Plan DB (`sathi-plan-<id>`):** `patient`, `locations`, `members`, `medicines`, `schedules`, `doseRecords`, `inventory`, `stockMovements`, `purchases`, `transfers`, `notifications`, `auditLog`, `syncQueue`.
- **Ledger stores:** `doseRecords`, `stockMovements`, `auditLog` append-only (sync metadata may be updated via sync helpers).
- **Medicine times:** normalized per-dose entries `{ time: "HH:MM", quantity: number, mealRelation: ""|"before"|"after"|"with" }` (deduped/sorted; backward-compatible parsing). Slots/records carry per-dose quantity and meal timing; latest correction determines displayed slot outcome.

### Security/encryption (local)
- Field/device crypto boundary in `src/lib/db/cipher.js` and `src/lib/db/deviceKey.js` (AES-GCM-256 non-extractable device key in app DB when WebCrypto available; identity fallback in constrained contexts).
- `src/lib/security/secureEnvelope.js` and `src/lib/security/secureFetch.js`: sealed transport envelopes (`__sealed`, v1, base64 iv/data), in-app unseal, redacted errors, optional request sealing and sealed-response enforcement.
- **Not yet wired** to live sync/API calls or all sensitive persisted fields; backend must participate for true end-to-end wire protection. Browser runtime/DevTools can still expose data on a controlled client.

---

## 7. API contract (planned)

`docs/API_CONTRACT.md`: HTTPS `/api/v1`, JSON camelCase, bearer auth, RFC7807 errors, plan-scoped endpoints, server-enforced permissions/rules, sync push/pull with idempotent `eventId`, per-event results, conflict surfacing, event vs arrival time preserved. Client adapter is the only place to know base URL/version.

---

## 8. Implemented scope and status

See `docs/FRONTEND_STATUS.md` (authoritative). Implemented locally: auth/profile, plan lifecycle, dashboard, medicines CRUD with per-dose qty/meal times, schedule with recording/corrections (latest correction shown), inventory/receipt/adjust, patient/members, purchases/details, transfers, notifications/preferences, sync status, audit history, PWA, themes, sync-readiness/DB/cipher, sealed-envelope helpers and CSP/referrer hardening.

**Caveats:** no backend/real sync/cloud auth/verified recovery; security helpers not wired to transport; spec parity to all 26 Design.html states and full SRS behavior not exhaustively proven. Run full gates (`lint`, `test`, `build`, `e2e`) for current verification.

---

## 9. Design system and styling

Semantic design tokens only (no hardcoded hex in components). Theme files in `src/styles/themes/*.css`, mapped in `src/index.css`, controlled by `src/theme.js` (`default`, `ocean`, `sage`, `dark`). Mobile-first; follow `Project_Plan/Design.html`.

---

## 10. PWA implementation

Manifest in `src/pwa/manifest.js` (validated by tests), icons generated by `scripts/generate-icons.mjs`, VitePWA generateSW autoUpdate, precache + runtime caching, meta/referrer/CSP in `index.html`. Use `/pwa-check` and build/tests to validate.

---

## 11. Testing, quality gates, and CI/CD

- **Vitest/jsdom:** DB, repos/domain, screens/components, PWA manifest, theme contract.
- **Playwright:** `e2e/app.spec.js` + helpers — guards, core care flow (per-dose medicine, record/correct), authenticated page rendering incl. care-management/sync/audit/recovery, session persistence.
- **Gates:** `npm run lint && npm test` (pre-push), CI runs lint/test/build and e2e on push/PR.

---

## 12. AI agent workflows and tooling

- `AGENTS.md` mandatory. Kilo commands: `/feature`, `/verify`, `/review`, `/spec`, `/new-theme`, `/pwa-check`. Subagents: `frontend-dev`, `test-writer`, `pwa-auditor`. Agent Manager scripts in `.kilo/`.
- Loop: Spec → Context → Plan → Implement → Verify → Review → Ship.

---

## 13. Security, privacy, and medical-safety guardrails

- No prescribing/diagnosis (BR-15). Manual instructions only.
- Append-only corrections/ledgers; no silent overwrites. Only `given` reduces stock.
- Client checks are UX only; server is authority when backend exists.
- No secrets/credentials in code/logs; minimize sensitive exposure (SR-05/06/12). Plan isolation (SR-07). Offline auth expiry/revocation semantics per SRS.
- Sealed payload/CSP hardening is defense-in-depth, not a substitute for backend enforcement or a guarantee against controlled-client inspection.

---

## 14. Standard change workflows

- **Feature:** SRS/design check → plan → failing tests → implement (layering/tokens/adapters/rules) → verify → review.
- **Bugfix:** reproduce → regression test → fix → gates.
- **Schema/API:** update docs/contracts first when applicable; additive preferred; never rewrite ledger history.
- **Theme:** tokens first, contract test, then screens.

---

## 15. Reference index

| Topic | Location |
| --- | --- |
| Agent rules / overview | `AGENTS.md`, `README.md` |
| Requirements / design | `Project_Plan/Medical Care Coordination App SRS …md`, `Project_Plan/Design.html` |
| Architecture / data / local DB / API | `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/LOCAL_DATABASE.md`, `docs/API_CONTRACT.md` |
| Status / testing / AI infra | `docs/FRONTEND_STATUS.md`, `docs/TESTING.md`, `docs/AI_DEVELOPMENT_INFRASTRUCTURE.md` |
| PWA / CI / workflows | `src/pwa/manifest.js`, `vite.config.js`, `index.html`, `.github/workflows/ci.yml`, `.kilo/` |

_When details conflict, defer to the SRS for requirements, code/tests/CI for behavior, and `docs/FRONTEND_STATUS.md` for implemented scope._
