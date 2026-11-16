# Testing Strategy

Every gate is automated where practical. Tests bridge SRS acceptance criteria and implemented local behavior.

---

## Test layers

| Layer | Location | Scope |
| --- | --- | --- |
| Theme contract | `src/styles/themes.test.js` | every color variant defines the full token contract |
| PWA manifest & assets | `src/pwa/manifest.test.js` | manifest fields + PNG signature/dimensions of icons |
| Local DB & crypto boundary | `src/lib/db/db.test.js` | schema/isolation, sync envelope, ledger guards, queue, cipher/device-key behavior |
| Repositories/domain logic | `src/lib/repo/repo.test.js` (+ other repo tests as added) | plan/medicine/schedule/stock rules, append-only behavior, derived totals |
| Component/screen | `src/screens/*.test.jsx`, `src/app/App.test.jsx` | render + interaction behavior against real repos on fake-indexeddb |
| End-to-end | `e2e/*.spec.js` (Playwright + Chromium) | routing guards, core care flow, route rendering, persistence/recovery, key security/sync UI assertions |

## Coverage highlights (current)

- Core: auth/login, plan selection/creation, dashboard, medicines CRUD, schedule recording/correction.
- Added care-management screens: account recovery, patient profile, members, inventory, stock receipt/adjust, purchases/details, transfers, notifications/preferences, sync status, audit history.
- Medicine scheduling: dynamic times with per-dose quantity and meal timing; schedule corrections surface latest outcome.
- Sync/security: sync queue/local envelope behavior, cipher/device-key helpers, sync status messaging (sealed transport intent).

## Running tests

- `npm test` — full Vitest suite once (used by pre-push hook and CI).
- `npm run test:watch` — Vitest watch mode.
- `npm run test:e2e` — Playwright e2e suite (dedicated dev server on port `5199`, strict/no reuse; service workers blocked). Requires `npx playwright install chromium` once.
- `npm run test:e2e:ui` — Playwright UI runner.
- `npm run lint` — ESLint; `npm run build` — production/PWA build verification.

A failing required gate should block push/merge (pre-push hook runs lint+test; CI runs lint/test/build and e2e).

## Writing/updating tests (rules)

- Trace tests to SRS IDs/behavior where applicable; prefer behavior over implementation.
- Prove care/sync invariants: no duplicate replay semantics, append-only corrections, conflicts flagged (not silently applied), event time preserved, `given`-only stock consumption.
- Keep tests aligned with current data shapes/contracts (e.g. per-dose time objects `{ time, quantity, mealRelation }`).
- Render through real providers/repos/theme where relevant; avoid asserting against `dist/`.
- Update e2e selectors/flows when routes, labels, or user interactions change.
