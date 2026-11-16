# Architecture — Sathi Care Coordination PWA

System architecture for the frontend PWA. For development-process infrastructure see `AI_DEVELOPMENT_INFRASTRUCTURE.md`. For implemented scope and caveats see `FRONTEND_STATUS.md`.

---

## 1. System context

- **Frontend (this repo):** React + Vite PWA, local-first (IndexedDB), offline-capable UI, sync-ready record envelope/queue.
- **Backend (planned, separate):** ASP.NET Core Web API + SQL Server (auth, permissions, business rules, audit, sync/conflict authority).
- **Contract:** versioned REST JSON (`/api/v1`) with idempotent sync events (see `API_CONTRACT.md`).

The backend is intended to be the authoritative shared record; the client must not be the sole authority for permissions, inventory integrity, or shared-record state.

## 2. Frontend layers (current)

```
src/
  app/          Router, session/plan guards, shell/navigation
  screens/      Route-level screens (auth, plans, dashboard, meds, schedule,
                patient, members, inventory/receipt/adjust, purchases, transfers,
                notifications, preferences, sync, audit, settings)
  components/   Shared UI kit (semantic design tokens only)
  store/        Zustand stores (session, plan context, medicines, members)
  lib/
    db/         IndexedDB schema/client/records/cipher/deviceKey
    repo/       Domain repositories (app/plan/medicines/schedule/inventory/
                members/purchases/transfers/notifications)
    security/   Sealed payload envelope + secureFetch helpers
  pwa/          Manifest source of truth
  styles/       Token themes + Tailwind mapping
  test/         Vitest setup/helpers
e2e/            Playwright specs/helpers
```

Intended dependency direction: `app → screens/features → lib`; shared UI in `components/`. Feature code should use `lib` adapters rather than ad-hoc network/storage access.

## 3. Local-first data flow (current)

1. **Read:** serve authorized/local data from IndexedDB.
2. **Write:** create/update records via repositories with sync-ready envelope fields (`eventId`, `eventTime`, `syncState`, etc.). Care-critical ledgers (`doseRecords`, `stockMovements`, `auditLog`) are append-oriented with guarded semantics.
3. **Queue:** outbound events accumulate in `syncQueue` (no backend push yet).
4. **Sync (future):** batch push keyed by `eventId`, server dedupe/authority, conflict surfacing for review. Offline auth expiry/revocation semantics per SRS.
5. **UI:** reflects local authoritative state (e.g. latest correction shown for a dose slot) and pending/sync indicators where implemented.

## 4. PWA runtime

- `vite-plugin-pwa` (`generateSW`, `registerType: 'autoUpdate'`), precache shell/assets/icons/manifest, navigate fallback `/index.html`.
- Runtime caching: CacheFirst for images/fonts.
- `index.html` includes PWA/meta tags, referrer policy, and CSP. E2E runs block service workers for determinism.

## 5. Security boundary (current)

- **At-rest/app boundary:** plan-scoped local storage, device key + AES-GCM cipher helpers, sealed envelope utilities, redacted secure fetch behavior.
- **Not complete:** helpers not wired into live backend transport; no server-side sealing/authz; browser/DevTools on a controlled client can still observe runtime/network data. CSP/connect-src must be adjusted for real API origins.

## 6. Cross-cutting rules

| Rule | Enforcement (current intent) |
| --- | --- |
| Manual instructions only; no prescribing/diagnosis | UI/repo conventions, review rules |
| `given` is the only stock-reducing dose outcome | schedule/inventory repo logic + tests |
| Corrections append-only with reason; latest correction reflected in display | schedule repo/screen logic + tests |
| Append-only ledgers / no silent overwrite of care history | DB guards/records model |
| Tokens only for styling (no hardcoded hex in components) | design system + theme contract tests |
| Server enforces permissions/stock/shared integrity (when present) | future backend; client is UX mirror only |
