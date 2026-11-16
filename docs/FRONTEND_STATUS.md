# Frontend Status — What Is Implemented

Honest scope statement for the current build. "Standalone offline" is real (local-first IndexedDB, PWA shell). Server-connected/shared-authority scope is **not** complete because the backend does not exist yet (planned as a separate ASP.NET Core service per SRS).

**Verification snapshot:** `npm run lint` clean, `npm test` passing (Vitest), and Playwright e2e passing (`5` tests covering guards, core care flow, and authenticated page rendering). Re-run `npm run build`, `npm test`, and `npm run test:e2e` before release/push as the authoritative gate.

---

## Implemented (local-first, this repo)

| Area | Detail | Verified by |
| --- | --- | --- |
| App shell + routing | Hash router, session/plan guards, tab shell, routes for core and care-management screens | `src/app/App.test.jsx`, `e2e/app.spec.js` |
| Local auth/profile | Device profiles (no shared credentials), sign in/out, 24h offline authorization model, recovery screen (local guidance) | `src/screens/Login.test.jsx`, `src/screens/AccountRecovery.test.jsx`, e2e |
| Care plans | Create/select/delete plan, bootstrap patient/default locations/owner context, local wipe semantics | `src/lib/repo/repo.test.js`, plan screens/tests |
| Dashboard | Plan/patient context, dose summary/upcoming doses, low-stock alerts, quick actions | screen/repo tests, e2e |
| Medicines | CRUD, manual instructions only, separate strengths, low-stock threshold, dynamic dose times with per-dose quantity and meal timing (before/after/with/unspecified) | `src/lib/repo/repo.test.js`, `src/screens/MedicineForm.test.jsx`, `src/screens/Medicines.test.jsx`, e2e |
| Schedule + dose recording | Derived slots from medicine times (per-dose qty/meal), outcomes given/missed/refused/other, `given` reduces stock, corrections append-only with reason and latest correction reflected in slot display | `src/lib/repo/repo.test.js`, `src/screens/Schedule.test.jsx`, e2e |
| Inventory & stock | Append-only movement ledger and derived totals; inventory view, stock receipt, stock adjust/dispose screens | `src/lib/repo/repo.test.js`, `src/screens/Inventory.test.jsx`, `src/screens/StockReceipt.test.jsx`, `src/screens/StockAdjust.test.jsx`, e2e |
| Care operations (local tracking) | Patient profile, members, purchases (+details/status), transfers, notifications, notification preferences, sync status, audit history screens/repos | screen/repo tests (including `Purchases`, `Transfers`, `Members`, `Notifications`, `PatientProfile`, `MoreScreens`, etc.), e2e |
| Local DB & sync-readiness | Plan/app IndexedDB schema, sync envelope fields, `syncQueue`, append-only ledger guards, cipher boundary and device key helpers | `src/lib/db/db.test.js` |
| Security hardening (app-level) | CSP/referrer meta, device AES-GCM key storage, sealed payload envelope and `secureFetch` helpers (in-app unseal/redaction); sync status communicates sealed transport intent | `src/lib/db/db.test.js`, `src/screens/MoreScreens.test.jsx`, e2e sync copy check |
| PWA | Manifest, icons, service worker, offline shell, runtime caching | `src/pwa/manifest.test.js`, build |
| Design system | Semantic token-based themes (default/ocean/sage/dark), runtime switching | `src/styles/themes.test.js` |

## Partial / caveats

- **Backend + real sync:** no API server or sync engine; `syncQueue` is local-only. `secureFetch`/sealed-envelope utilities exist but are not yet wired to live backend calls.
- **Security limits:** app-level encryption/sealing protects local boundaries and intended transport contract, but browser DevTools/runtime can still expose data on a controlled client; true wire secrecy requires HTTPS and server-side end-to-end sealing/decryption.
- **Spec parity not fully proven:** UI parity against all 26 `Project_Plan/Design.html` screens/states and full SRS behavioral coverage (permissions/invites enforcement, verified server recovery, notification delivery/scheduling, complete audit semantics, and ledger-correct purchase/transfer state transitions in every case) is not exhaustively verified.
- **CSP/connectivity:** `connect-src 'self'` and current CSP in `index.html` must be updated when integrating external API origins.

## Not implemented (yet)

1. **Backend service + authenticated API + sync push/pull/conflict resolution** (authoritative permissions, stock, audit, identity).
2. **Cloud auth and verified recovery/ownership flows** (current auth is local device profiles).
3. **Full members/permissions/invitation management** with server-enforced authorization.
4. **Background sync worker** and production sync orchestration.
5. **Exhaustive SRS/design-state parity** and any behavior requiring server authority or platform capabilities beyond current local implementation.

## Notes

- Medical-safety rules in scope of the local implementation (manual instructions, append-only corrections, `given` drives consumption, no prescribing) are preserved; server-authoritative enforcement moves to backend when it exists.
- This document reflects current repo behavior; defer to code/tests/CI for exact verification status.
