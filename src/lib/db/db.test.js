// src/lib/db/db.test.js
// Local-first IndexedDB model: schema, connection layer, sync envelope,
// ledger guards, cipher boundary.
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  APP_DB_NAME,
  APP_STORES,
  PLAN_STORES,
  createAesGcmCipher,
  createRecord,
  deletePlanDb,
  identityCipher,
  isLedgerStore,
  makeCollection,
  markConflict,
  markSynced,
  newId,
  openAppDb,
  openPlanDb,
  planDbName,
  assertAppendable,
} from './index.js'

const openDbs = []
afterEach(async () => {
  while (openDbs.length) openDbs.pop().close()
})

async function openTracked() {
  const db = await openAppDb()
  openDbs.push(db)
  return db
}

describe('app database', () => {
  it('opens with every device-wide store', async () => {
    const db = await openTracked()
    expect(db.name).toBe(APP_DB_NAME)
    expect([...db.objectStoreNames].sort()).toEqual(Object.keys(APP_STORES).sort())
  })

  it('creates declared indexes', async () => {
    const db = await openTracked()
    const tx = db.transaction('users')
    const store = tx.objectStore('users')
    expect([...store.indexNames]).toContain('email')
  })
})

describe('plan database', () => {
  it('names per-plan databases deterministically', () => {
    expect(planDbName('plan-1')).toBe('sathi-plan-plan-1')
    expect(() => planDbName()).toThrow()
  })

  it('opens with every plan-scoped store from the data model', async () => {
    const db = await openPlanDb('plan-1')
    openDbs.push(db)
    expect(db.name).toBe('sathi-plan-plan-1')
    expect([...db.objectStoreNames].sort()).toEqual(Object.keys(PLAN_STORES).sort())
  })

  it('isolates plans in separate databases', async () => {
    const a = await openPlanDb('plan-a')
    const b = await openPlanDb('plan-b')
    openDbs.push(a, b)
    const colA = makeCollection(a, 'medicines')
    const colB = makeCollection(b, 'medicines')
    const record = createRecord({ name: 'Metformin 500 mg' }, { planId: 'plan-a' })
    await colA.put(record)
    expect(await colB.count()).toBe(0)
    expect((await colA.get(record.id)).name).toBe('Metformin 500 mg')
  })

  it('deletePlanDb wipes one plan and leaves others intact', async () => {
    const keep = await openPlanDb('keep')
    openDbs.push(keep)
    const gone = await openPlanDb('gone')
    await makeCollection(gone, 'medicines').put(
      createRecord({ name: 'Amlodipine 5 mg' }, { planId: 'gone' }),
    )
    gone.close()

    await deletePlanDb('gone')

    expect(await makeCollection(keep, 'medicines').count()).toBe(0)
    await expect(openPlanDb('gone')).resolves.toBeTruthy()
    const reopened = await openPlanDb('gone')
    openDbs.push(reopened)
    expect(await makeCollection(reopened, 'medicines').count()).toBe(0)
  })
})

describe('sync envelope', () => {
  it('creates records with the full sync-readiness envelope', () => {
    const record = createRecord(
      { medicineId: 'm1', outcome: 'given', dose: 1 },
      { planId: 'plan-1', recordedBy: 'user-1', eventTime: '2026-11-15T09:00:00.000Z' },
    )
    expect(record.id).toBeTruthy()
    expect(record.eventId).toBeTruthy()
    expect(record.planId).toBe('plan-1')
    expect(record.recordedBy).toBe('user-1')
    expect(record.eventTime).toBe('2026-11-15T09:00:00.000Z')
    expect(record.arrivalTime).toBeNull()
    expect(record.syncState).toBe('pending')
    expect(record.serverId).toBeNull()
    expect(record.revision).toBe(0)
    expect(record.medicineId).toBe('m1')
  })

  it('generates unique eventIds per record (idempotency keys)', () => {
    const a = createRecord({ outcome: 'given' })
    const b = createRecord({ outcome: 'given' })
    expect(a.eventId).not.toBe(b.eventId)
    expect(newId()).not.toBe(newId())
  })

  it('markSynced only changes sync metadata', () => {
    const record = createRecord({ outcome: 'given' }, { eventTime: '2026-11-15T08:00:00.000Z' })
    const synced = markSynced(record, { serverId: 'srv-1', arrivalTime: '2026-11-15T08:05:00.000Z' })
    expect(synced.syncState).toBe('synced')
    expect(synced.serverId).toBe('srv-1')
    expect(synced.arrivalTime).toBe('2026-11-15T08:05:00.000Z')
    expect(synced.outcome).toBe('given')
    expect(synced.eventTime).toBe('2026-11-15T08:00:00.000Z')
  })

  it('markConflict preserves the conflict for review', () => {
    const record = createRecord({ outcome: 'given' })
    const conflict = { against: 'dose-9', reason: 'duplicate outcome' }
    const conflicted = markConflict(record, conflict)
    expect(conflicted.syncState).toBe('conflict')
    expect(conflicted.conflict).toEqual(conflict)
    expect(conflicted.outcome).toBe('given')
  })
})

describe('ledger guards', () => {
  it('classifies ledger stores', () => {
    expect(isLedgerStore('doseRecords')).toBe(true)
    expect(isLedgerStore('stockMovements')).toBe(true)
    expect(isLedgerStore('auditLog')).toBe(true)
    expect(isLedgerStore('medicines')).toBe(false)
  })

  it('rejects a second write of the same eventId into a ledger store', () => {
    const record = createRecord({ outcome: 'given' })
    expect(() => assertAppendable('doseRecords', record, null)).not.toThrow()
    expect(() => assertAppendable('doseRecords', record, record)).toThrow(/append-only/)
    expect(() => assertAppendable('medicines', record, record)).not.toThrow()
  })

  it('appends dose records with unique eventIds and reads them back by index', async () => {
    const db = await openPlanDb('ledger')
    openDbs.push(db)
    const col = makeCollection(db, 'doseRecords')
    await col.put(createRecord({ outcome: 'given', medicineId: 'm1' }))
    await col.put(createRecord({ outcome: 'missed', medicineId: 'm2' }))
    const given = await col.getByIndex('outcome', 'given')
    expect(given).toHaveLength(1)
    expect(given[0].medicineId).toBe('m1')
  })
})

describe('sync queue', () => {
  it('keys entries by eventId for server-side dedup (FR-80)', async () => {
    const db = await openPlanDb('queue')
    openDbs.push(db)
    const col = makeCollection(db, 'syncQueue')
    const event = createRecord({ type: 'dose.outcome', payload: { outcome: 'given' } })
    await col.put(event)
    const fetched = await col.get(event.eventId)
    expect(fetched.payload.outcome).toBe('given')
    expect(await col.count()).toBe(1)
  })
})

describe('cipher boundary', () => {
  it('identity cipher round-trips (development/testing)', async () => {
    const payload = { note: 'Penicillin allergy' }
    const encrypted = await identityCipher.encrypt(payload)
    expect(await identityCipher.decrypt(encrypted)).toEqual(payload)
  })

  it.skipIf(!globalThis.crypto?.subtle)('AES-GCM cipher round-trips in production', async () => {
    const subtle = globalThis.crypto.subtle
    const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
    const cipher = await createAesGcmCipher({ getKey: async () => key })
    const payload = 'Takes Metformin 2x daily. Allergic to penicillin.'
    const encrypted = await cipher.encrypt(payload)
    expect(encrypted).not.toBe(payload)
    expect(encrypted.iv).toBeInstanceOf(Uint8Array)
    expect(await cipher.decrypt(encrypted)).toBe(payload)
  })
})