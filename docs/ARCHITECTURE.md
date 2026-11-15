# Architecture — Sathi Care Coordination PWA

System architecture of the application. For the *development process*
infrastructure (agents, gates, workflows) see `AI_DEVELOPMENT_INFRASTRUCTURE.md`.

---

## 1. System context

```
┌────────────────────┐      HTTPS REST       ┌─────────────────────┐
│  Sathi PWA (React) │ ◄──────────────────► │  Backend API        │
│  - online-first UI │   JSON, versioned     │  (ASP.NET Core,     │
│  - offline capture │   + idempotency keys  │   separate repo)    │
│  - queued sync     │                       │  - auth/identity    │
└─────────┬──────────┘                       │  - permissions      │
          │                                   │  - business rules   │
          ▼                                   │  - audit + sync     │
   IndexedDB (encrypted sensitive fields)     └──────────┬──────────┘
   per care plan, per device                             ▼
                                                   SQL Server
```

The backend is the **authoritative shared record**; the PWA is an offline-capable
client. The frontend must never be the sole authority for permissions, inventory
calculations, or record integrity (SRS §8 warning).

## 2. Frontend layers

```
src/
  app/          App shell: router, providers, nav (5-tab), sync strip, guards
  features/     One folder per SRS domain: auth, plans, patient, members,
                medicines, schedule, doses, inventory, purchases, transfers,
                notifications, settings
  components/   Shared UI kit built on the design tokens (cards, status pills,
                dose rows, forms, outcome grid, …)
  lib/          Adapters and cross-cutting logic:
                  api/      typed REST client (fetch + timeout + auth header)
                  db/       IndexedDB repositories (per plan, encrypted fields)
                  sync/     outbound queue + sync engine + conflict surfacing
                  auth/     session, re-auth for sensitive ops
                  secure/   encryption helpers for local cache
  styles/       Modular color-token system (themes/*.css, see README)
  test/         Vitest setup (jest-dom matchers, RTL cleanup)
```

Dependency rule: `app → features → lib` only. Features never import other
features directly; shared UI lives in `components/`.

## 3. Online data flow

1. User action → feature → `lib/api` client → backend (permission checked
   server-side).
2. Response → update local caches (IndexedDB) + UI state.
3. Audit-relevant actions render from the server response, never optimistic-only.

## 4. Offline data flow

1. **Read:** previously synced, authorized data is served from IndexedDB without
   waiting on the network (NFR-06).
2. **Write:** permitted operations (dose outcomes, supported stock changes,
   transfers) create an **immutable local event**:

   - unique event ID (client-generated UUID)
   - recording user + event time (separate from server arrival time, FR-79)
   - sync status: pending / in-flight / synced / conflict

3. **Queue:** events wait in the outbound queue; UI shows pending count and last
   successful sync (FR-71).
4. **Sync on reconnect:** events are pushed with their IDs; the backend dedupes
   by ID so retries never duplicate (FR-80). The server response is authoritative;
   conflicts (same dose recorded by two caregivers, competing inventory changes)
   are flagged for authorized review, never silently overwritten (FR-81/82).
5. **Revocation:** access changes apply when the device reconnects; the app states
   this honestly (FR-75).

Offline authorization for sensitive operations expires 24 h after the last online
authorization (FR-73/74).

## 5. PWA runtime

- **Strategy:** `generateSW` (vite-plugin-pwa), `registerType: 'autoUpdate'`.
- **Precaching:** all build assets + icons + manifest.
- **Runtime caching:** CacheFirst for images (30 d) and fonts (1 y).
- **Update UX:** new precache manifest = new release; auto-update keeps users on
  the latest shell without prompting.
- **Capabilities:** notifications/reminders work only as far as the browser/OS
  allows; the app says so clearly (NFR-14).

## 6. Backend contract (boundary)

- REST over HTTPS only; JSON, camelCase.
- Permission matrix enforced per endpoint (SR-02) — the same permission set the
  UI mirrors.
- Sync endpoints accept batches of client events with idempotency keys and
  return per-event results (accepted / duplicate / conflict).
- Audit records written server-side for all protected mutations (SR-09/10).
- Versioning: additive within a major version; breaking changes bump the API
  version (see `API_CONTRACT.md`).

## 7. Cross-cutting rules

| Rule | Where enforced |
| --- | --- |
| One care plan = one patient | data model + backend |
| "Given" is the only stock-reducing outcome | backend + client validator |
| Purchases add stock only on receipt | backend |
| Transfers never change totals; carried stock stays in total | backend |
| Low-stock threshold flags + notifies | backend + UI surfaces |
| Corrections are append-only | data model + audit log |
| No prescribing/diagnosis anywhere | UI copy + review rule |