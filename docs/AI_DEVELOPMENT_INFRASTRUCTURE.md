# AI Development Infrastructure — Sathi Care Coordination PWA

> High-level architectural overview. No implementation code in this document.
> Derived from the SRS (`Project_Plan/Medical Care Coordination App SRS …md`) and the
> approved UI design (`Project_Plan/Design.html`).

---

## 1. Purpose & Scope

This document defines how the Sathi project is structured so that AI coding agents
(and humans) can work safely, consistently, and verifiably: every change is
traceable to the SRS, verified by automated gates, and cannot silently break
clinical or data-integrity rules.

The infrastructure covers the full loop:

```
Spec → Context → Plan → Implement → Verify → Review → Ship
```

---

## 2. System Context

Sathi is a multi-tenant (multi-care-plan), offline-capable PWA with a server that
is the authoritative shared record. The SRS mandates a hard split:

- **Frontend (this repo)** — React + Vite PWA. Responsible for presentation,
  offline capture, queued sync, and UX-level guards. **Never** the sole authority
  for permissions, stock math, or shared-record integrity (SRS §8 warning).
- **Backend (separate service)** — ASP.NET Core Web API over HTTPS, SQL Server,
  ASP.NET Core Identity. Enforces permissions, business rules, audit, and sync
  conflict resolution.
- **Shared contract** — the REST API surface documented in the SRS API
  Documentation (Notion) and mirrored by typed API clients on both sides.

---

## 3. Architecture Principles

Derived directly from the SRS:

| Principle | Consequence for the infrastructure |
| --- | --- |
| Server-authoritative | Backend is the single source of truth; the frontend never invents permissions, stock balances, or outcomes. |
| Offline-first | The PWA must record care events offline and sync without duplicates; infrastructure needs an offline queue, sync state, and conflict surfacing. |
| Audit everything | Every change to schedules, doses, inventory, purchases, transfers, members, and permissions is traceable to user + time. |
| No silent overwrites | Corrections are append-only; conflicts are flagged, never discarded. |
| Privacy by design | Sensitive data minimization, encrypted local cache, safe notification previews. |
| Spec-driven | Every feature traces back to SRS FR/BR/SR/NFR IDs; acceptance criteria are encoded as automated tests. |

---

## 4. Infrastructure Layers

### L1 — Spec & Planning Layer (source of truth)

- `Project_Plan/` holds the SRS and the approved 26-screen design. These are the
  **only** places requirements are defined.
- From the SRS, structured artifacts are derived during development:
  - **API contract** — endpoint list, request/response shapes, permission matrix
    (mirrors the SRS API Documentation).
  - **Data model** — entities and relationships (SRS §9) with append-only audit
    tables.
  - **Test catalog** — each acceptance criterion (SRS §11) maps to at least one
    automated test.
- Rule: if it is not in the SRS/design, it is not built. If the SRS is wrong, the
  SRS is updated first, then the code.

### L2 — Context & Agent Layer

- `AGENTS.md` (repo root) — project rules every agent must follow: architecture
  conventions, verify commands, security constraints.
- `.kilo/` — Kilo configuration: custom agents and commands encode the standard
  workflows (feature, fix, review, spec-check).
- Skills (e.g., review-team) provide multi-perspective review passes.
- Context packages per domain (medicines, schedule/dose, inventory, purchases,
  transfers, notifications, offline/sync, security) keep each agent task focused
  on one slice of the SRS.

### L3 — Implementation Layer (frontend repo)

Recommended top-level layout:

```
src/
  app/            routes, providers, app shell (nav, appbar, sync strip)
  features/       one folder per SRS domain (medicines, schedule, inventory, ...)
  components/     shared UI kit built on the design tokens
  lib/            api client, db (IndexedDB), sync engine, auth, secure storage
  styles/         modular design-token system (see L5)
  test/           test setup
Project_Plan/     SRS + design (read-only reference)
docs/             this document and derived architecture docs
scripts/          codegen and asset scripts
.github/          CI pipeline
```

Cross-cutting rules:

- Domain features never talk to the network directly; they use `lib/` adapters
  (API client online, IndexedDB repository offline).
- UI components are presentational; business rules live in the backend or in
  shared client validators that mirror backend rules (never replace them).

### L4 — Quality Gates Layer

Every change passes a fixed gauntlet, locally and on CI:

| Gate | Tool | Blocking |
| --- | --- | --- |
| Lint | ESLint | yes — pre-push + CI |
| Unit/integration tests | Vitest + Testing Library | yes — pre-push + CI |
| PWA manifest & asset validation | tests assert icons/manifest correctness | yes — pre-push + CI |
| Production build (SW + manifest generated) | Vite + vite-plugin-pwa | yes — CI |
| Dependency audit | `npm audit` (0 vulnerabilities required) | yes — CI |
| Bundle sanity | build artifact upload | CI |

Enforcement points:

1. **Pre-push git hook** (`simple-git-hooks`) — tests must pass before anything
   leaves the machine.
2. **GitHub Actions CI** (`.github/workflows/ci.yml`) — the same gates on every
   push and PR; CI is the merge authority.

### L5 — Design System Layer

- The approved design in `Design.html` is decomposed into a **modular token
  system** (`src/styles/`): primitive theme files (color variants) are mapped to
  semantic Tailwind tokens at build time and switchable at runtime via a
  `data-theme` attribute.
- One file per color variant (`teal` default, plus `ocean`, `sage`, `dark`);
  adding a variant = adding one token file that satisfies the token contract.
- A unit test enforces that every theme file defines the complete token contract,
  so no variant can ship half-styled.
- Design changes are made in tokens first, screens second; `Design.html` remains
  the visual reference.

### L6 — Data Integrity & Sync Layer

- **Local store**: IndexedDB, encrypted for sensitive fields (SR-05), scoped per
  care plan (SR-07).
- **Outbound queue**: every offline change is an immutable event (unique ID,
  recording user, event time, sync status). Retries never duplicate (FR-80).
- **Inbound sync**: server response is authoritative; conflicts (same dose from
  two caregivers, competing inventory changes) are flagged for review, never
  silently overwritten (FR-81/82).
- **Audit**: every mutation carries who/when/why; corrections are append-only
  (FR-26/41, SR-09/10).
- **Offline authorization**: sensitive offline operations expire 24 h after the
  last online authorization (FR-73) — enforced client-side, mirrored server-side.

### L7 — Security & Compliance Layer

- Authentication via the backend identity provider; no credentials in local
  storage or logs (SR-06).
- Server-side permission checks for every protected operation (SR-02); UI hiding
  is cosmetic only.
- Encryption in transit (HTTPS) and at rest (server), plus encrypted local cache.
- Push/notification previews hide patient details (SR-12).
- Remote cache clear when access is revoked and the device is online (SR-13).

### L8 — Release & Operations Layer

- CI produces the `dist/` artifact (PWA bundle with service worker + manifest).
- Deployment target for the frontend is static hosting over HTTPS; the service
  worker is versioned by the precache manifest — releases are effectively the new
  precache set.
- Backend deploys independently but is versioned against the shared API
  contract; breaking contract changes require coordinated version bumps.

---

## 5. Standard Workflows

### Feature development

1. **Spec check** — locate FR/BR IDs in the SRS; extend the test catalog first
   (acceptance criteria → failing tests).
2. **Plan** — split into frontend/backend tasks; confirm API contract impact.
3. **Implement** — backend rules first (server authority), then UI.
4. **Verify** — lint + tests + build pass locally; commit.
5. **Review** — correctness, security, architecture, and spec-conformance review
   passes (review-team skill or equivalent).
6. **Ship** — push (pre-push hook gates), CI green, merge.

### Bugfix

Reproduce → regression test that fails → fix → full gate run. Never fix without
the failing test.

### Schema / API change

Update the data model + API contract docs first, then backend, then client
adapters, then UI. Additive-only within a version; breaking changes get a new
contract version.

### Design / theme change

Edit tokens (or add a variant file) → token-contract test guards completeness →
screens unchanged → update `Design.html` if the visual reference changed.

---

## 6. Guardrails (hard rules)

1. The app never prescribes, diagnoses, or recommends dose changes (BR-15).
2. "Given" is the only outcome that reduces stock; purchases increase stock only
   on receipt (BR-05/06).
3. Transfers never change totals; carried stock stays in the total (BR-07/08).
4. Nothing is silently overwritten — corrections and conflicts are first-class
   records (BR-09/12).
5. Server checks every protected operation (SR-02).
6. Tests gate every push; CI gates every merge.
7. Zero known vulnerabilities at merge time.

---

## 7. Extension Points

- **Backend service** — new repo (ASP.NET Core) against the shared contract.
- **New color variant** — one theme file + token contract test (see L5).
- **New device capability** (e.g., local notifications) — feature-flagged by
  capability detection, with honest UX fallback (NFR-14).
- **Future enhancements** (SRS §13) — enter the same spec → plan → verify loop;
  they do not bypass the gates.