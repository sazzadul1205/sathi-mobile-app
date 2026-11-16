// src/lib/repo/schedule.js
// Schedule + dose recording (FR-20..28). Doses are derived from each active
// medicine's administration times — a scheduled dose is NOT proof it was taken
// (BR-11); recording is a separate, append-only action.
//
// Slot identity: `${medicineId}:${date}:${HH:MM}` — recording the same slot
// twice is a conflict, not a second outcome; corrections append a new record
// that references the original (FR-26/27).

import { makeCollection, createRecord, newId, nowIso } from '../db/index.js'
import { addMovement } from './inventory.js'

export const OUTCOMES = ['given', 'missed', 'refused', 'other']

function dateKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function slotId(medicineId, date, time) {
  return `${medicineId}:${dateKey(date)}:${time}`
}

// Today's (or given date's) dose slots for every active medicine with times.
export async function listSlots(db, { medicines, patient, date = new Date() } = {}) {
  const records = await makeCollection(db, 'doseRecords').getAll()
  const slots = []
  for (const medicine of medicines) {
    for (const entry of medicine.times || []) {
      const t = typeof entry === 'string'
        ? { time: entry, quantity: medicine.doseQuantity, mealRelation: '' }
        : {
            time: entry?.time,
            quantity: Number(entry?.quantity) > 0 ? Number(entry.quantity) : medicine.doseQuantity,
            mealRelation: entry?.mealRelation || '',
          }
      if (!t.time) continue
      const id = slotId(medicine.id, date, t.time)
      const slotRecords = records.filter((r) => r.slotId === id)
      const initial = slotRecords.find((r) => r.kind !== 'correction') || null
      const corrections = slotRecords
        .filter((r) => r.kind === 'correction')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      const effective = corrections[0] || initial
      const qty = effective?.doseQuantity ?? initial?.doseQuantity ?? t.quantity ?? medicine.doseQuantity ?? 1
      const mealRelation = effective?.mealRelation ?? initial?.mealRelation ?? t.mealRelation ?? ''
      slots.push({
        id,
        medicineId: medicine.id,
        medicineName: medicine.name,
        strength: medicine.strength,
        doseQuantity: qty,
        stockUnit: medicine.stockUnit,
        time: t.time,
        scheduledFor: `${dateKey(date)}T${t.time}:00`,
        instructions: medicine.instructions,
        mealRelation,
        patientLocation: patient?.location || null,
        outcome: effective?.outcome || null,
        record: initial || null,
      })
    }
  }
  return slots.sort((a, b) => (a.time > b.time ? 1 : -1))
}

export async function getDoseRecord(db, slot) {
  const records = await makeCollection(db, 'doseRecords').getAll()
  return records.find((r) => r.slotId === slot.id && r.kind !== 'correction') || null
}

// Record an outcome for a slot. 'given' is the ONLY outcome that reduces stock
// (BR-05) — it writes a consumption movement at the patient's current location.
export async function recordOutcome(db, { slot, outcome, recordedBy, notes, planId }) {
  if (!OUTCOMES.includes(outcome)) throw new Error(`invalid outcome: ${outcome}`)
  const existing = await getDoseRecord(db, slot)
  if (existing) throw new Error(`dose already recorded (${existing.outcome}) — use a correction`)

  const record = createRecord(
    {
      slotId: slot.id,
      medicineId: slot.medicineId,
      scheduledFor: slot.scheduledFor || slot.id,
      outcome,
      doseQuantity: slot.doseQuantity,
      stockUnit: slot.stockUnit,
      mealRelation: slot.mealRelation || '',
      notes: (notes || '').trim(),
      kind: 'initial',
      correctsId: null,
      reason: null,
    },
    { planId, recordedBy, eventTime: new Date().toISOString() },
  )
  await makeCollection(db, 'doseRecords').put(record)

  if (outcome === 'given' && slot.patientLocation) {
    const location = await findLocationIdByName(db, slot.patientLocation)
    await addMovement(
      db,
      {
        medicineId: slot.medicineId,
        locationId: location,
        type: 'consumption',
        quantity: -slot.doseQuantity,
        reason: `dose given ${slot.time}`,
        refId: record.id,
      },
      { planId, recordedBy },
    )
  }
  return record
}

// Append a correction: new row, original untouched (FR-26/27). If the
// correction is 'given' (e.g. missed â†’ given), stock moves then.
export async function correctDose(db, { slot, outcome, reason, recordedBy, notes, planId }) {
  const existing = await getDoseRecord(db, slot)
  if (!existing) throw new Error('nothing to correct — record the dose first')
  if (!reason || !reason.trim()) throw new Error('a correction requires a reason')

  const correction = createRecord(
    {
      slotId: slot.id,
      medicineId: slot.medicineId,
      scheduledFor: slot.scheduledFor || slot.id,
      outcome,
      doseQuantity: slot.doseQuantity,
      stockUnit: slot.stockUnit,
      mealRelation: slot.mealRelation || existing.mealRelation || '',
      notes: (notes || '').trim(),
      kind: 'correction',
      correctsId: existing.id,
      reason: reason.trim(),
    },
    { planId, recordedBy, eventTime: new Date().toISOString() },
  )
  await makeCollection(db, 'doseRecords').put(correction)

  if (outcome === 'given' && existing.outcome !== 'given' && slot.patientLocation) {
    const location = await findLocationIdByName(db, slot.patientLocation)
    await addMovement(
      db,
      {
        medicineId: slot.medicineId,
        locationId: location,
        type: 'consumption',
        quantity: -slot.doseQuantity,
        reason: `correction: dose given ${slot.time}`,
        refId: correction.id,
      },
      { planId, recordedBy },
    )
  }
  return correction
}

export async function listDoseHistory(db, { limit = 20 } = {}) {
  const records = await makeCollection(db, 'doseRecords').getAll()
  return records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit)
}

export async function listAudit(db, { entityType, limit = 20 } = {}) {
  const records = await makeCollection(db, 'auditLog').getAll()
  const filtered = entityType ? records.filter((r) => r.entityType === entityType) : records
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit)
}

export async function writeAudit(db, { entityType, entityId, action, detail, recordedBy }) {
  const record = {
    id: newId(),
    entityType,
    entityId,
    action,
    detail: detail || '',
    recordedBy,
    createdAt: nowIso(),
  }
  await makeCollection(db, 'auditLog').put(record)
  return record
}

async function findLocationIdByName(db, name) {
  const locations = await makeCollection(db, 'locations').getAll()
  const match = locations.find((l) => l.name === name)
  return match?.id || locations[0]?.id || null
}