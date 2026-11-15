# AGENTS.md — Sathi Care Coordination PWA

Project rules for AI coding agents. Read this first, then the docs it points to.

## Project identity

Sathi is a shared care-coordination PWA: family members and caregivers coordinate
an elderly patient's medication, inventory, purchases, and transport. Online-first
with approved offline recording and queued sync.

- **Frontend (this repo):** React 19 + Vite 8 + Tailwind CSS 4 + `vite-plugin-pwa`.
- **Backend (separate repo, planned):** ASP.NET Core Web API + SQL Server, REST
  over HTTPS. The server is the authoritative record — this frontend never is the
  sole authority for permissions, stock math, or shared-record integrity.

## Source of truth

- **Requirements:** `Project_Plan/Medical Care Coordination App SRS …md` — every
  feature traces to an FR/BR/SR/NFR ID. If it is not in the SRS, it is not built.
- **Visual reference:** `Project_Plan/Design.html` (26 approved screens).
- **Architecture:** `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`,
  `docs/LOCAL_DATABASE.md` (offline IndexedDB model),
  `docs/FRONTEND_STATUS.md` (implemented vs. pending scope — read before
  claiming a feature exists), `docs/API_CONTRACT.md`, `docs/TESTING.md`,
  `docs/AI_DEVELOPMENT_INFRASTRUCTURE.md`.
- `dist/` and `Project_Plan/` are generated/read-only — never edit them by hand.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (PWA service worker active) |
| `npm run build` | Production build incl. service worker + manifest |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint (must be clean) |
| `npm test` | Vitest unit + component tests (must pass) |
| `npm run test:e2e` | Playwright end-to-end tests (Chromium) |
| `npm run generate:icons` | Regenerate the PWA icon set |

Verification is mandatory before finishing any change: `npm run lint && npm test`
(the pre-push hook enforces this too) plus `npm run build` for anything touching
build config, tokens, or the manifest. Run `npm run test:e2e` for changes that
affect routing, screens, or user flows.

## Architecture conventions

- **Server-authoritative.** Permission checks, stock math, and record integrity
  live on the backend. Client-side checks are UX mirrors only.
- **Adapters in `src/lib/`.** Feature code never calls `fetch`/IndexedDB directly;
  it goes through the API client (online), the local DB layer (`src/lib/db/` —
  standalone offline, sync-ready), or the repository (offline).
- **Append-only records.** Dose outcomes, stock movements, and corrections are
  never silently overwritten; corrections reference the original (SRS FR-26/41).
- **Sync identity.** Every offline change carries a unique event ID, recording
  user, and event time; resubmitting never duplicates (FR-78/80).
- **Offline authorization.** Sensitive offline operations expire 24 h after the
  last online authorization (FR-73).

## Styling rules

- Use the semantic design tokens only (`bg-brand`, `text-ink`, `text-muted`,
  status colors, …) — never hardcode hex values in components. The token system
  is documented in the README and `src/styles/themes/`; add variants as new
  theme files, never by editing `src/index.css` mappings.
- Mobile-first; follow `Design.html` layouts and spacing.

## Security rules

- No credentials, tokens, or keys in source, storage, or logs (SR-06).
- No sensitive patient details in notification previews or URLs (SR-12).
- Never claim the app prescribes, diagnoses, or advises dose changes (BR-15).
- Unknown or revoked authorization must never grant access (SR-15).

## Workflows

Feature work, bugfixes, schema changes, and design changes follow the workflows
in `docs/AI_DEVELOPMENT_INFRASTRUCTURE.md` §5. TL;DR: spec → tests first →
implement → verify → review → ship. Tests gate every push; CI gates every merge.