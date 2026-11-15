// src/lib/db/schema.js
// Declarative IndexedDB schema for the local-first store.
//
// Two-tier layout (SR-07 plan isolation):
//   - App DB  "sathi-app"      — device-wide data: plan registry, local users,
//                                session (incl. offline-auth expiry), meta, device keys.
//   - Plan DB "sathi-plan-<id>" — one database per care plan: every plan-scoped
//                                entity from docs/DATA_MODEL.md.
//
// Migrations: bump SCHEMA_VERSION and append an entry to MIGRATIONS. The
// upgrade handler applies every migration newer than the on-disk version.
// See docs/LOCAL_DATABASE.md.

export const APP_DB_NAME = 'sathi-app'
export const PLAN_DB_PREFIX = 'sathi-plan-'
export const SCHEMA_VERSION = 1

// Store definitions: keyPath + secondary indexes (name -> { keyPath, unique }).
export const APP_STORES = {
  // Plan registry for the plan-selector screen (identity + role cache only).
  plans: {
    keyPath: 'id',
    indexes: { role: { keyPath: 'role' }, updatedAt: { keyPath: 'updatedAt' } },
  },
  // Local profile cache. NEVER credentials (SR-06).
  users: {
    keyPath: 'id',
    indexes: { email: { keyPath: 'email', unique: false } },
  },
  // Singleton session record (key 'current'): offline auth expiry per FR-73.
  session: {
    keyPath: 'id',
    indexes: {},
  },
  // Device metadata: last sync cursor per plan, schema version, flags.
  meta: {
    keyPath: 'key',
    indexes: {},
  },
  // Device crypto keys (CryptoKey objects, structured-clone safe). SR-05.
  keys: {
    keyPath: 'id',
    indexes: {},
  },
}

export const PLAN_STORES = {
  // One patient profile per plan (BR-01).
  patient: {
    keyPath: 'id',
    indexes: {},
  },
  // User-defined storage/carrying locations (SRS §12.6).
  locations: {
    keyPath: 'id',
    indexes: { name: { keyPath: 'name' } },
  },
  // Plan members with roles/permissions (CarePlanMember).
  members: {
    keyPath: 'id',
    indexes: { userId: { keyPath: 'userId' }, role: { keyPath: 'role' } },
  },
  medicines: {
    keyPath: 'id',
    indexes: {
      name: { keyPath: 'name' },
      active: { keyPath: 'active' },
      updatedAt: { keyPath: 'updatedAt' },
    },
  },
  // MedicationSchedule per medicine.
  schedules: {
    keyPath: 'id',
    indexes: { medicineId: { keyPath: 'medicineId' }, startAt: { keyPath: 'startAt' } },
  },
  // DoseRecord — APPEND-ONLY ledger. Corrections are new rows referencing
  // the original (FR-26/27). Only 'given' reduces stock (BR-05).
  doseRecords: {
    keyPath: 'id',
    indexes: {
      medicineId: { keyPath: 'medicineId' },
      scheduledFor: { keyPath: 'scheduledFor' },
      outcome: { keyPath: 'outcome' },
      syncState: { keyPath: 'syncState' },
      eventId: { keyPath: 'eventId', unique: true },
    },
  },
  // Current stock per medicine+location; total is derived from the ledger.
  inventory: {
    keyPath: 'id',
    indexes: { medicineId: { keyPath: 'medicineId' }, locationId: { keyPath: 'locationId' } },
  },
  // StockMovement — APPEND-ONLY ledger (receipts, consumption, adjustments,
  // transfers). Earlier values are never silently replaced (FR-42).
  stockMovements: {
    keyPath: 'id',
    indexes: {
      medicineId: { keyPath: 'medicineId' },
      locationId: { keyPath: 'locationId' },
      createdAt: { keyPath: 'createdAt' },
      syncState: { keyPath: 'syncState' },
      eventId: { keyPath: 'eventId', unique: true },
    },
  },
  purchases: {
    keyPath: 'id',
    indexes: {
      medicineId: { keyPath: 'medicineId' },
      status: { keyPath: 'status' },
      syncState: { keyPath: 'syncState' },
    },
  },
  transfers: {
    keyPath: 'id',
    indexes: {
      medicineId: { keyPath: 'medicineId' },
      status: { keyPath: 'status' },
      syncState: { keyPath: 'syncState' },
    },
  },
  notifications: {
    keyPath: 'id',
    indexes: { createdAt: { keyPath: 'createdAt' }, read: { keyPath: 'read' } },
  },
  // AuditLog — APPEND-ONLY, never client-modifiable (SR-09/10).
  auditLog: {
    keyPath: 'id',
    indexes: {
      entityType: { keyPath: 'entityType' },
      entityId: { keyPath: 'entityId' },
      createdAt: { keyPath: 'createdAt' },
    },
  },
  // SyncQueue (SyncRecord) — the outbound offline event queue. Append-only;
  // entries leave the queue only via markSynced/markConflict on their record.
  syncQueue: {
    keyPath: 'eventId',
    indexes: { syncState: { keyPath: 'syncState' }, createdAt: { keyPath: 'createdAt' } },
  },
}

// Stores whose content is immutable once written (only sync metadata may
// change, via records.js markSynced/markConflict). Enforced in client.js.
export const LEDGER_STORES = ['doseRecords', 'stockMovements', 'auditLog']

// Every plan-scoped synced entity carries the sync envelope (records.js).
export const SYNC_ENVELOPE_STORES = Object.keys(PLAN_STORES)

export function planDbName(planId) {
  if (!planId) throw new Error('planDbName requires a planId')
  return `${PLAN_DB_PREFIX}${planId}`
}

// Migration registry. Each entry creates its stores if missing; future
// migrations (v2+) add new stores or indexes and never rewrite existing data.
export const MIGRATIONS = [
  { version: 1, app: APP_STORES, plan: PLAN_STORES },
]

function applyStores(db, stores) {
  for (const [storeName, def] of Object.entries(stores)) {
    if (!db.objectStoreNames.contains(storeName)) {
      const os = db.createObjectStore(storeName, { keyPath: def.keyPath })
      for (const [idxName, idx] of Object.entries(def.indexes)) {
        os.createIndex(idxName, idx.keyPath, { unique: Boolean(idx.unique) })
      }
    }
  }
}

// Upgrade handler shared by app and plan databases.
export function upgradeDatabase(db, oldVersion, storesByVersion) {
  for (const migration of MIGRATIONS) {
    if (migration.version <= oldVersion) continue
    applyStores(db, storesByVersion(migration))
  }
}

export const upgradeAppDatabase = (db, oldVersion) =>
  upgradeDatabase(db, oldVersion, (m) => m.app)

export const upgradePlanDatabase = (db, oldVersion) =>
  upgradeDatabase(db, oldVersion, (m) => m.plan)