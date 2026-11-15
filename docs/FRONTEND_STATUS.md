# Frontend Status — What Is Implemented

Honest scope statement for the current build. "Standalone offline" is fully
real; the server-connected scope is not, because the backend does not exist yet
(planned as a separate ASP.NET Core service per the SRS).

---

## Implemented and verified (this repo)

| Area | Detail | Verified by |
| --- | --- | --- |
| App shell + routing | Hash router, session guard, plan guard (SRS §4), 4-tab nav | `src/app/App.test.jsx` |
| Local auth | Device profiles (no shared credentials, SRS §3), 24 h offline authorization (FR-73/74) | `src/screens/Login.test.jsx` |
| Care plans | Create plan (patient + default locations + owner + audit, BR-01), selector, delete (wipe = SR-13) | `src/lib/repo/repo.test.js` |
| Dashboard | Plan card, dose summary (given/remaining/missed), upcoming doses, low-stock alerts (BR-18), quick actions | repo + component tests |
| Medicines | CRUD, manual instructions only (BR-15), strengths as separate rows (FR-15), low-stock threshold | repo tests |
| Stock ledger | Receipts / consumption / adjustments as append-only movements; totals derived (BR-05/06, FR-41/42) | repo tests |
| Schedule + dose recording | Time-derived slots, outcomes (given/missed/refused/other), `given` reduces stock (BR-05), corrections append-only with reason (FR-26/27) | repo tests |
| Sync-readiness | Every record carries the envelope (eventId/eventTime/arrivalTime/syncState/serverId/revision); syncQueue store keyed by eventId (FR-79/80) | `src/lib/db/db.test.js` |
| PWA | Manifest, icons, service worker, offline shell, runtime caching | `src/pwa/manifest.test.js`, build |
| Design system | 4 swappable color variants, runtime switching | `src/styles/themes.test.js` |

Gates: `npm run lint` clean · `npm test` 168 passing · `npm run build` succeeds.

## Deliberately not built (yet)

The SRS describes 26 screens and a server backend. This build delivers the core
standalone loop (auth → plans → dashboard → medicines → schedule/dose →
settings). Not implemented, in rough priority order:

1. **Backend + real sync** — there is no API server yet; `syncQueue` accumulates
   events but nothing pushes them. The client contract is fixed in
   `docs/API_CONTRACT.md`; the seam is `src/lib/db/records.js` +
   `syncQueue`. No fake network calls are made — the app is honest about being
   local-only.
2. **Members & permissions UI** — roles/permissions exist in the data model
   (`members` store) but there is no invite/manage screen.
3. **Inventory screen** (per-location breakdown view), **purchases**,
   **transfers**, **notifications**, **audit history**, **account recovery** —
   data model and repo patterns exist; screens do not.
4. **Cloud auth** — local device profiles replace server identity (documented in
   `docs/LOCAL_DATABASE.md` §9 and on the login screen).
5. **Background sync worker** — the service worker precaches but does not yet
   run a sync engine.

Each remaining item follows the same spec-first workflow (`/feature`) and lands
on the same quality gates — nothing above is a prototype; it is the verified
core of the system.

## What "production-ready" means here

- Standalone single-device deployment: yes — installable PWA, offline-complete,
  tested core flows.
- Multi-device shared care with server authority: requires the backend work in
  items 1–2 above. The local model is architected so that work is additive
  (sync envelope, event log, conflict surfacing), not a rewrite.
- Medical safety rules (no prescribing, append-only corrections, server-side
  permission checks) are enforced in the local layer now and move to the server
  when it exists — never dropped.