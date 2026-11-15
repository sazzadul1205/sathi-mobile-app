# Local Database Model (IndexedDB)

Design of the standalone offline store. The app runs **fully without a network**
today (local-first), while every record is shaped so a future server backend can
sync without data migration. Companion docs: `DATA_MODEL.md` (entities/relations),
`API_CONTRACT.md` (sync endpoints), `ARCHITECTURE.md` (layering).

---

## 1. Goals & constraints

| Goal | Source |
| --- | --- |
| Standalone offline operation — no backend required | current requirement |
| Server-first long term; sync when the backend exists | SRS §5, `API_CONTRACT.md` |
| Per-plan isolation on the device | SR-07, BR-01 |
| Append-only care records; no silent overwrites | FR-26/41, BR-09/12 |
| Offline events never duplicate on resubmit | FR-80 |
| Event time ≠ arrival time | FR-79 |
| Conflicts flagged, never discarded | FR-81/82 |
| Sensitive data encrypted at rest | SR-05 |
| Offline authorization expires after 24 h | FR-73 |

Technology: **IndexedDB** (per SRS §8 "Offline data"). Implementation:
`src/lib/db/` — zero runtime dependencies, raw IndexedDB wrappers.

## 2. Two-tier database layout

```
IndexedDB origin
├── sathi-app                     device-wide (not plan-scoped)
│     plans[]                     plan registry: id, name, patientName, role,
│                                 updatedAt        (plan-selector cache, SR-07)
│     users[]                     local profile cache (id, name, email)
│                                 NEVER credentials (SR-06)
│     session{ id: 'current' }    current user + offlineAuthExpiresAt (FR-73)
│     meta{ key → value }         schema version, lastSyncCursor per plan
│     keys{ id }                  device CryptoKeys (non-extractable, SR-05)
│
├── sathi-plan-<planId>           one DB per care plan (delete = SR-13 wipe)
│     patient                     singleton profile (BR-01)
│     locations[]                 user-defined locations (SRS §12.6)
│     members[]                   roles + permissions (CarePlanMember)
│     medicines[]
│     schedules[]
│     doseRecords[]               APPEND-ONLY ledger
│     inventory[]                 current stock per medicine+location
│     stockMovements[]            APPEND-ONLY ledger
│     purchases[]
│     transfers[]
│     notifications[]
│     auditLog[]                  APPEND-ONLY (SR-09/10)
│     syncQueue[]                 keyed by eventId — outbound offline events
└── sathi-plan-<otherId> …        siblings never imported into each other
```

**Why one DB per plan:** physical isolation (SR-07) — a bug or an index scan
cannot leak rows across plans, and plan removal/revocation is a single
`deleteDatabase` (SR-13) that cannot touch siblings.

## 3. Store catalog (plan DB)

| Store | keyPath | Indexes | Notes |
| --- | --- | --- | --- |
| `patient` | `id` | — | one row per plan; care notes stored **encrypted** |
| `locations` | `id` | `name` | |
| `members` | `id` | `userId`, `role` | |
| `medicines` | `id` | `name`, `active`, `updatedAt` | different strengths = separate rows (FR-15) |
| `schedules` | `id` | `medicineId`, `startAt` | derived from manual prescription (BR-04) |
| `doseRecords` | `id` | `medicineId`, `scheduledFor`, `outcome`, `syncState`, unique `eventId` | append-only; corrections are new rows referencing the original (FR-26) |
| `inventory` | `id` | `medicineId`, `locationId` | derived view; the ledger is authoritative |
| `stockMovements` | `id` | `medicineId`, `locationId`, `createdAt`, `syncState`, unique `eventId` | append-only ledger (FR-41/42) |
| `purchases` | `id` | `medicineId`, `status`, `syncState` | stock increases only on receipt (BR-06) |
| `transfers` | `id` | `medicineId`, `status`, `syncState` | never consumption (FR-59) |
| `notifications` | `id` | `createdAt`, `read` | |
| `auditLog` | `id` | `entityType`, `entityId`, `createdAt` | append-only; never client-modifiable |
| `syncQueue` | `eventId` | `syncState`, `createdAt` | mirrors `SyncRecord`; dedup key |

App-DB stores: `plans(id)`, `users(id + email)`, `session(id)`, `meta(key)`,
`keys(id)` — see `src/lib/db/schema.js` (single declarative source, validated by
`src/lib/db/db.test.js`).

## 4. Sync-readiness contract (every plan-scoped record)

```ts
type Envelope = {
  id: string            // local UUID, primary key
  eventId: string       // immutable idempotency key; server dedupes by this (FR-80)
  planId: string        // denormalized guard against cross-plan reads/writes
  recordedBy: string    // account attribution (SR-09/10)
  createdAt: string     // local creation clock
  updatedAt: string     // local mutation clock
  eventTime: string     // when it actually happened (client) — never overwritten
  arrivalTime: string | null  // server receipt time (FR-79); null until synced
  syncState: 'pending' | 'synced' | 'conflict'
  serverId: string | null     // server PK after acceptance
  revision: number            // optimistic-concurrency counter
}
```

- **Standalone today:** `syncState` stays `pending`; nothing ever blocks on the
  network. `syncQueue` accumulates offline events.
- **With backend later:** the client pushes `syncQueue` batches keyed by
  `eventId`; the server returns `accepted | duplicate | conflict` per event
  (`API_CONTRACT.md` §Sync contract). `markSynced` records `serverId` +
  `arrivalTime`; `markConflict` stores the conflict payload verbatim on the
  record for authorized review. No local record is ever rewritten by a sync
  result — only sync metadata changes.

## 5. Ledger immutability (enforced in code)

`LEDGER_STORES = ['doseRecords', 'stockMovements', 'auditLog']`:

- Writes go through `createRecord()` (always a **new** `eventId`).
- `assertAppendable()` rejects a second write of an existing `eventId`.
- Only `markSynced` / `markConflict` may mutate a ledger row — sync metadata
  only; clinical content is never touched.
- Corrections (FR-26/27) are new rows referencing the original `id` — the
  original stays intact.

## 6. Encryption boundary (SR-05)

`src/lib/db/cipher.js` defines one interface, two implementations:

- `identityCipher` — pass-through, for development and tests.
- `createAesGcmCipher({ getKey })` — AES-GCM-256 via WebCrypto; ciphertext
  stored as `{ iv, data }` (structured-clone safe). The key is a non-extractable
  `CryptoKey` in the app-DB `keys` store, generated on first run.

Repositories encrypt **sensitive fields only** (patient care notes, dose notes)
before `put`; everything else stays queryable in plaintext. Encrypting whole
rows would break the indexes in §3, so the field-level boundary is deliberate.

## 7. Threat model (honest scope)

| Protected against | Not protected against |
| --- | --- |
| Casual inspection of device storage / shared-browser profile | An attacker with full device + browser control (devtools, malware) |
| Copying the IndexedDB files without the app's key | Rooted device / OS-level backup extraction with key |
| Accidental plaintext writes (cipher boundary is the only write path for sensitive fields) | Server-side breaches (backend responsibility, SR-04) |

Local encryption is defense-in-depth; server-side rules remain the authority
once sync exists.

## 8. Migrations & versioning

- `SCHEMA_VERSION` + `MIGRATIONS` registry in `schema.js`; the upgrade handler
  applies every migration newer than the on-disk version.
- v1 (current) creates all stores/indexes above.
- Future versions are **additive**: new stores or new indexes. Existing data is
  never rewritten by a migration; backfills happen through the sync/audit path,
  not by mutating history.
- `meta['schemaVersion']` records the applied version for diagnostics.

## 9. Offline authorization (FR-73/74)

`session.current.offlineAuthExpiresAt = lastOnlineAuth + 24 h`. The sync/auth
adapter checks it before any sensitive offline write; expiry forces reconnect +
re-auth. The UI states revocation is not immediate offline (FR-75) — honest UX,
mirrored server-side when online.

## 10. Mapping to the project documentation

| Local store | DATA_MODEL entity | SRS |
| --- | --- | --- |
| `patient` | Patient | FR-10/11 |
| `locations` | InventoryLocation | FR-36, §12.6 |
| `members` | CarePlanMember | FR-03/04 |
| `medicines`, `schedules` | Medicine, MedicationSchedule | FR-13–20 |
| `doseRecords` | DoseRecord | FR-22–28 |
| `inventory` + `stockMovements` | Inventory, StockMovement | FR-35–46 |
| `purchases` | PurchaseRecord | FR-47–55 |
| `transfers` | TransferRecord | FR-56–62 |
| `notifications` | Notification | FR-63–67 |
| `auditLog` | AuditLog | SR-09/10 |
| `syncQueue` | SyncRecord | FR-77–83 |
| `plans`, `users`, `session`, `meta`, `keys` | (device-local, no server entity) | SR-05/06/07, FR-71/73 |

## 11. Source map

```
src/lib/db/
  schema.js    store/index definitions + MIGRATIONS (declarative, testable)
  client.js    open/upgrade/delete connections, transactions, collections
  records.js   sync envelope, markSynced/markConflict, ledger guards
  cipher.js    encryption boundary (identity | AES-GCM-256)
  db.test.js   schema, isolation, envelope, ledger, queue, cipher tests
```