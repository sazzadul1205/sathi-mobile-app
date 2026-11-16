// src/lib/repo/repo.test.js
// End-to-end repository behavior on fake-indexeddb: plans, medicines, stock
// ledger math, dose outcomes, corrections (SRS FR/BR rules).
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createProfile, resetAppDbCache } from './app.js'
import { createCarePlan } from './plan.js'
import { listMedicines, saveMedicine } from './medicines.js'
import { addMovement, findLowStock, stockByMedicine } from './inventory.js'
import {
  correctDose,
  listDoseHistory,
  listSlots,
  recordOutcome,
} from './schedule.js'
import { openPlanDb } from '../db/index.js'

let db
let patient
let profile
let planId

beforeEach(async () => {
  // Fresh app DB per test (fake-indexeddb persists across tests in a file).
  resetAppDbCache()
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('sathi-app')
    request.onsuccess = resolve
    request.onerror = () => reject(request.error)
  })
  profile = await createProfile({ name: 'Rafiq Ahmed', email: 'rafiq@example.com' })
  planId = await createCarePlan({
    name: 'Abbu care',
    patientName: 'Rahim Mia',
    notes: 'Hypertension, diabetes',
    ownerProfileId: profile.id,
  })
  db = await openPlanDb(planId)
  const { makeCollection } = await import('../db/index.js')
  const [p] = await makeCollection(db, 'patient').getAll()
  patient = p
})

describe('care plan bootstrap', () => {
  it('creates patient, default locations, and owner membership', async () => {
    const { makeCollection } = await import('../db/index.js')
    expect(patient.name).toBe('Rahim Mia')
    expect(patient.location).toBe('Dhaka')
    const locations = await makeCollection(db, 'locations').getAll()
    expect(locations.map((l) => l.name)).toEqual(
      expect.arrayContaining(['Dhaka', 'Cumilla', 'Patient-carried']),
    )
    const members = await makeCollection(db, 'members').getAll()
    expect(members[0].role).toBe('owner')
    const audit = await makeCollection(db, 'auditLog').getAll()
    expect(audit[0].action).toBe('plan.created')
  })
})

describe('medicines', () => {
  it('creates and lists active medicines with parsed times', async () => {
    const medicine = await saveMedicine(
      db,
      { name: 'Metformin 500 mg', times: '8:00 AM, 1:00 PM, 9:00 PM', lowStockThreshold: 6 },
      { planId, recordedBy: profile.id },
    )
    expect(medicine.times).toEqual([
      { time: '08:00', quantity: 1, mealRelation: '' },
      { time: '13:00', quantity: 1, mealRelation: '' },
      { time: '21:00', quantity: 1, mealRelation: '' },
    ])
    expect(medicine.syncState).toBe('pending')
    const active = await listMedicines(db)
    expect(active).toHaveLength(1)
  })

  it('updates in place and keeps the same identity', async () => {
    const created = await saveMedicine(db, { name: 'Amlodipine 5 mg' }, { planId, recordedBy: profile.id })
    const updated = await saveMedicine(db, { id: created.id, name: 'Amlodipine 5 mg', strength: '5 mg' }, { planId, recordedBy: profile.id })
    expect(updated.id).toBe(created.id)
    expect(updated.strength).toBe('5 mg')
    expect(updated.eventId).toBe(created.eventId)
  })
})

describe('stock ledger', () => {
  it('computes totals from movements (receipt +, consumption −)', async () => {
    const medicine = await saveMedicine(db, { name: 'Metformin 500 mg', doseQuantity: 1 }, { planId, recordedBy: profile.id })
    const { makeCollection } = await import('../db/index.js')
    const locations = await makeCollection(db, 'locations').getAll()
    const dhaka = locations.find((l) => l.name === 'Dhaka')

    await addMovement(db, { medicineId: medicine.id, locationId: dhaka.id, type: 'receipt', quantity: 30, reason: 'initial stock' }, { planId, recordedBy: profile.id })
    await addMovement(db, { medicineId: medicine.id, locationId: dhaka.id, type: 'consumption', quantity: -4 }, { planId, recordedBy: profile.id })

    const stock = await stockByMedicine(db)
    expect(stock.get(medicine.id).total).toBe(26)
    expect(stock.get(medicine.id).byLocation.get(dhaka.id)).toBe(26)
  })

  it('flags low stock at/below the threshold (BR-18)', async () => {
    const low = await saveMedicine(db, { name: 'Atorvastatin 10 mg', lowStockThreshold: 6 }, { planId, recordedBy: profile.id })
    const ok = await saveMedicine(db, { name: 'Insulin', lowStockThreshold: 2 }, { planId, recordedBy: profile.id })
    const { makeCollection } = await import('../db/index.js')
    const locations = await makeCollection(db, 'locations').getAll()
    const dhaka = locations.find((l) => l.name === 'Dhaka')
    await addMovement(db, { medicineId: low.id, locationId: dhaka.id, type: 'receipt', quantity: 6 }, { planId, recordedBy: profile.id })
    await addMovement(db, { medicineId: ok.id, locationId: dhaka.id, type: 'receipt', quantity: 30 }, { planId, recordedBy: profile.id })

    const stock = await stockByMedicine(db)
    const lowStock = findLowStock([low, ok], stock)
    expect(lowStock.map((m) => m.id)).toEqual([low.id])
  })
})

describe('dose recording', () => {
  it('derives slots from medicine times and records given (stock −)', async () => {
    const medicine = await saveMedicine(db, { name: 'Metformin 500 mg', times: '08:00, 13:00', doseQuantity: 1 }, { planId, recordedBy: profile.id })
    const slots = await listSlots(db, { medicines: [medicine], patient })
    expect(slots).toHaveLength(2)
    expect(slots[0].time).toBe('08:00')

    await recordOutcome(db, { slot: slots[0], outcome: 'given', recordedBy: profile.id, planId })

    const stock = await stockByMedicine(db)
    expect(stock.get(medicine.id).total).toBe(-1)

    await expect(
      recordOutcome(db, { slot: slots[0], outcome: 'missed', recordedBy: profile.id, planId }),
    ).rejects.toThrow(/already recorded/)
  })

  it('does not move stock for missed (BR-05)', async () => {
    const medicine = await saveMedicine(db, { name: 'Insulin', times: '21:00' }, { planId, recordedBy: profile.id })
    const slots = await listSlots(db, { medicines: [medicine], patient })
    await recordOutcome(db, { slot: slots[0], outcome: 'missed', recordedBy: profile.id, planId })
    const stock = await stockByMedicine(db)
    expect(stock.has(medicine.id)).toBe(false)
  })

  it('appends corrections without touching the original (FR-26/27)', async () => {
    const medicine = await saveMedicine(db, { name: 'Amlodipine 5 mg', times: '08:00' }, { planId, recordedBy: profile.id })
    const slots = await listSlots(db, { medicines: [medicine], patient })
    const original = await recordOutcome(db, { slot: slots[0], outcome: 'missed', recordedBy: profile.id, planId })

    const correction = await correctDose(db, { slot: slots[0], outcome: 'given', reason: 'found later — actually taken', recordedBy: profile.id, planId })

    expect(correction.kind).toBe('correction')
    expect(correction.correctsId).toBe(original.id)
    expect(correction.outcome).toBe('given')
    const history = await listDoseHistory(db)
    const forSlot = history.filter((r) => r.slotId === slots[0].id)
    expect(forSlot).toHaveLength(2)
    const stock = await stockByMedicine(db)
    expect(stock.get(medicine.id).total).toBe(-1)
  })

  it('requires a reason for corrections', async () => {
    const medicine = await saveMedicine(db, { name: 'Insulin', times: '21:00' }, { planId, recordedBy: profile.id })
    const slots = await listSlots(db, { medicines: [medicine], patient })
    await recordOutcome(db, { slot: slots[0], outcome: 'refused', recordedBy: profile.id, planId })
    await expect(
      correctDose(db, { slot: slots[0], outcome: 'given', reason: '', recordedBy: profile.id, planId }),
    ).rejects.toThrow(/reason/)
  })
})