# API Contract (initial)

The backend (ASP.NET Core Web API, separate repo) exposes a versioned REST API
over HTTPS. This document fixes the client-facing conventions; endpoint details
are finalized with the backend and mirrored from the SRS API Documentation.

---

## Conventions

- **Transport:** HTTPS only (SR-03). Base path `/api/v1`.
- **Format:** JSON, camelCase. Dates ISO-8601 UTC; clients render local time.
- **Auth:** Bearer token per user session; re-authentication for sensitive
  operations (SR-11).
- **Errors:** RFC 7807 `application/problem+json` with `code`, `message`,
  `details`. Failed logins never reveal whether an account exists (SRS login
  screen rule).
- **Permissions:** every protected endpoint enforces the caller's plan-scoped
  permissions server-side (SR-02/08); the UI permission set is a mirror, never
  the authority.
- **Isolation:** plan context comes from the URL (`/plans/{planId}/…`); cross-plan
  access is denied (SR-07).

## Endpoint groups

| Group | Endpoints (shape) | Permission |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/recover`, `POST /auth/reset` | public (rate-limited) |
| Plans | `GET/POST /plans`, `GET/PATCH /plans/{id}` | owner/admin per action |
| Members | `GET/POST /plans/{id}/members`, `PATCH/DELETE /plans/{id}/members/{userId}`, `POST /plans/{id}/ownership-recovery` | owner; recovery is a verified process (FR-06) |
| Patient | `GET/PATCH /plans/{id}/patient` | view/edit per permissions |
| Medicines | `GET/POST /plans/{id}/medicines`, `PATCH …/{medId}`, deactivate | edit per permissions; every change audited |
| Schedules | `GET/POST/PATCH /plans/{id}/medicines/{medId}/schedule` | edit per permissions |
| Dose records | `GET /plans/{id}/doses?date=…`, `POST /plans/{id}/doses/{doseId}/outcomes`, `POST …/corrections` | caregivers record outcomes; corrections append-only |
| Inventory | `GET /plans/{id}/inventory` (per location + total), `POST …/movements` (receipt/adjustment/discard) | edit per permissions; adjustments need reason |
| Purchases | `GET/POST /plans/{id}/purchases`, `PATCH …/{purchaseId}` (status) | edit per permissions |
| Transfers | `GET/POST /plans/{id}/transfers`, `PATCH …/{transferId}` (status) | edit per permissions |
| Notifications | `GET /plans/{id}/notifications`, `PATCH /notifications/{id}/read` | per-recipient |
| Sync | `POST /plans/{id}/sync/events` (batch push), `GET /plans/{id}/sync/changes?since=…` (pull) | member with offline authorization |
| Audit | `GET /plans/{id}/audit?entity=…` | owner/admin |

## Sync contract (client-visible behavior)

1. **Push:** the client batches queued offline events; each carries
   `eventId` (UUID), `type`, `payload`, `recordedBy`, `eventTime`. The server
   dedupes by `eventId` — a resubmitted batch returns the same result as the
   first (FR-80). Response is per-event: `accepted | duplicate | conflict`.
2. **Conflict:** `conflict` returns the conflicting server state and a
   `conflictId`; the client surfaces it for authorized review and never applies
   it silently (FR-81/82).
3. **Pull:** the client fetches changes since its last sync cursor; the server
   response is authoritative (FR-83).
4. **Arrival time ≠ event time:** both are stored and returned (FR-79).

## Versioning

- Additive changes (new optional fields, new endpoints) stay within `/api/v1`.
- Breaking changes bump to `/api/v2`; clients pin the version they support.
- The client API adapter (`src/lib/api/`) is the only place that knows the base
  version — features never hardcode URLs.