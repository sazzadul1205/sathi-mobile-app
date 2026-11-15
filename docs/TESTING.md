# Testing Strategy

Every gate is automated; nothing ships on manual checks alone. Tests are the
bridge between the SRS acceptance criteria and the code.

---

## Test layers

| Layer | Location | Scope |
| --- | --- | --- |
| Token-contract | `src/styles/themes.test.js` | every color variant defines the full token contract |
| PWA manifest & assets | `src/pwa/manifest.test.js` | manifest fields + PNG signature/dimensions of every icon |
| Component | `src/**/*.test.jsx` (Vitest + Testing Library, jsdom) | render + interaction smoke tests per screen/feature |
| End-to-end | `e2e/*.spec.js` (Playwright + Chromium) | full care flow, every route renders, routing guards, session persistence |
| Sync engine (planned) | `src/lib/sync/*.test.js` | queue append, dedup by event ID, conflict surfacing |
| API integration (backend repo) | backend test project | permission matrix, stock math, sync endpoint behavior |

## SRS → test mapping

Each SRS §11 acceptance criterion maps to at least one automated test before the
feature is considered done:

| Acceptance criterion | Test (planned location) |
| --- | --- |
| Care plan access | component + API integration |
| Scheduling | component + API integration |
| Dose recording | component + sync tests (offline → queued → sync) |
| Inventory update (`given` vs `missed`) | sync/API tests |
| Stock transfer | sync/API tests |
| Purchase tracking | component + API integration |
| Low-stock alerts | component + API integration |
| Audit history | API integration (audit rows) |
| Offline operation | sync engine tests (jsdom + fake IndexedDB) |
| Sync integrity | sync engine tests (replay, conflicts) |
| Security | API integration (direct endpoint calls) |
| PWA install/offline | manifest tests + build artifacts + manual device pass |

## Running tests

- `npm test` — full Vitest suite once (used by pre-push hook and CI).
- `npm run test:watch` — Vitest watch mode while developing.
- `npm run test:e2e` — Playwright end-to-end suite. Starts its own Vite dev
  server on a dedicated port (`5199`, strict, never reused) and drives Chromium;
  service workers are blocked so runs stay deterministic. Requires
  `npx playwright install chromium` once.
- `npm run test:e2e:ui` — Playwright UI runner for stepping through e2e specs.
- A failing test blocks `git push` and fails CI; there is no merge path around it.

## Writing tests (rules)

- Prefer behavior over implementation: query by role/label, assert outcomes.
- Offline/sync tests must prove: no duplicates on replay, conflicts are flagged
  (not applied), event time is preserved.
- Never assert against `dist/` output; assert against source-level contracts.
- Component tests render through the real token system (no color literals in
  assertions).