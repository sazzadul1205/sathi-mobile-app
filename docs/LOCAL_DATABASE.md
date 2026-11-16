# Local Database Model (IndexedDB)

Design of the standalone offline store. The app runs local-first today; records are shaped so a future server backend can sync without redesign. See `DATA_MODEL.md`, `API_CONTRACT.md`, `ARCHITECTURE.md`, `FRONTEND_STATUS.md`.

---

## 1. Goals & constraints

- Standalone offline operation; sync-ready for future backend.
- Per-plan isolation (SR-07/BR-01); append-only care ledgers; no silent overwrites.
- Idempotent events (`eventId`, FR-80), event vs arrival time (FR-79), conflicts surfaced not discarded (FR-81/82).
- Sensitive data protection at rest/in-app boundaries where implemented (SR-05); offline auth expiry (FR-73).

## 2. Database layout

- **`sathi-app` (device-wide):** `plans`, `users` (no credentials), `session` (`current`, offline auth expiry), `meta`, `keys`.
- **`sathi-plan-<planId>` (per plan):** `patient`, `locations`, `members`, `medicines`, `schedules`, `doseRecords`, `inventory`, `stockMovements`, `purchases`, `transfers`, `notifications`, `auditLog`, `syncQueue`.

One DB per plan enables isolation and full local wipe on plan removal/revocation.

## 3. Stores and ledgers

Plan stores follow the SRS/data-model entities (see `schema.js` for key paths/indexes). **Ledger stores:** `doseRecords`, `stockMovements`, `auditLog` are append-oriented; `assertAppendable`/record helpers guard immutable event identity. Corrections are new rows referencing originals.

**Medicine/schedule data:** medicine `times` are normalized per-dose objects `{ time, quantity, mealRelation }` (legacy string/time forms supported in parsing). Dose slots/records persist per-dose `doseQuantity` and `mealRelation`; schedule display reflects the latest correction outcome.

## 4. Sync-readiness envelope

Plan-scoped records/events carry fields such as `id`, `eventId`, `planId`, `recordedBy`, `createdAt`, `updatedAt`, `eventTime`, `arrivalTime`, `syncState`, `serverId`, `revision` (see `src/lib/db/records.js`). `syncQueue` is keyed by `eventId`. Today records may remain pending locally; future sync pushes batches and applies authoritative server results/conflicts.

## 5. Encryption and secure transport helpers

- `src/lib/db/cipher.js`: `identityCipher` and AES-GCM-256 cipher (WebCrypto) for encrypt/decrypt of values/payloads.
- `src/lib/db/deviceKey.js`: non-extractable device key stored in app DB `keys` (`device-encryption-key`) when available; device cipher factory.
- `src/lib/security/secureEnvelope.js`: sealed envelope format `{ __sealed: true, v: 1, alg, iv, data }` (base64) with `sealPayload`/`openPayload`/`isSealedEnvelope`/`redactError`.
- `src/lib/security/secureFetch.js`: seals request bodies, sanitizes sensitive headers, enforces/redacts sealed responses by default, returns decrypted payloads in-app.

**Limits:** not yet wired into repositories/sync network flows; without backend cooperation this does not provide end-to-end wire secrecy. Browser runtime/DevTools on a controlled client can still observe data.

## 6. Threat model (honest)

| Helps against | Does not fully protect against |
| --- | --- |
| Casual storage inspection/shared-profile access, accidental plaintext handling in covered paths | Fully compromised device/browser, DevTools/runtime inspection, malware/root access, server-side breaches |
| Local data isolation by plan DB and app-level envelope handling | Lack of backend authz/encryption if/when networked |

## 7. Migrations & versioning

`SCHEMA_VERSION` and migrations live in `src/lib/db/schema.js` (additive evolution preferred). Do not rewrite ledger history via migrations.

## 8. Source map

```
src/lib/db/
  schema.js      stores/indexes/migrations
  client.js      open/upgrade/delete, transactions/collections
  records.js     envelope, sync metadata helpers, ledger guards
  cipher.js      encryption boundary
  deviceKey.js   device key + cipher access
src/lib/security/
  secureEnvelope.js
  secureFetch.js
```

Tests: `src/lib/db/db.test.js`, `src/lib/repo/repo.test.js`, and security-focused tests (as present).
