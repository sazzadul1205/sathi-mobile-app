# API Contract (initial)

Client-facing conventions for the planned backend (ASP.NET Core Web API, separate repo). Finalize and mirror with backend/SRS API documentation.

---

## Conventions

- **Transport:** HTTPS only. Base path `/api/v1`.
- **Format:** JSON, camelCase. Dates ISO-8601 UTC.
- **Auth:** bearer token per user session; re-auth for sensitive operations. Failed auth must not reveal account existence.
- **Errors:** RFC 7807 `application/problem+json`.
- **Authorization:** server-enforced per plan/operation (client checks are UX only). Plan-scoped URLs (`/plans/{planId}/...`).
- **Isolation:** no cross-plan data access.

## Endpoint groups (planned)

Auth, Plans, Members, Patient, Medicines, Schedules, Dose records, Inventory/stock movements, Purchases, Transfers, Notifications, Sync, Audit. Exact request/response schemas to be aligned with implementation.

## Sync contract

1. **Push:** client batches queued events with `eventId`, `type`, `payload`, `recordedBy`, `eventTime`. Server dedupes by `eventId` (retries safe). Per-event result: `accepted | duplicate | conflict`.
2. **Conflict:** return conflicting server state/conflict identifier; client surfaces for authorized review, never applies silently.
3. **Pull:** changes since cursor; server response authoritative.
4. **Timing:** preserve `eventTime` and server `arrivalTime`.

## Security/sealed transport (recommended alignment)

- Client includes device-key sealed envelope helpers (`src/lib/security/*`) intended for in-app unsealing and redacted handling. For real confidentiality/integrity in transit, backend must support compatible end-to-end sealing (or equivalent) over HTTPS and enforce authentication/authorization.
- Do not rely on client-only measures for secrecy; controlled clients/browsers can inspect runtime and network tooling.

## Versioning

- Additive changes within `/api/v1`; breaking changes require a new major version. Keep base version/URL knowledge in a single client adapter.
