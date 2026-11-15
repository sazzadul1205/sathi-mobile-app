// src/lib/repo/medicines.js
// Medicine CRUD over a plan database. Medicines are mutable records (not a
// ledger): update bumps updatedAt; deactivation hides from active lists but
// keeps history (FR-19). Every write carries the sync envelope.

import { makeCollection, createRecord, nowIso } from '../db/index.js'

export async function listMedicines(db, { includeInactive = false } = {}) {
  const all = await makeCollection(db, 'medicines').getAll()
  return includeInactive ? all : all.filter((m) => m.active)
}

export async function getMedicine(db, id) {
  return makeCollection(db, 'medicines').get(id)
}

export async function saveMedicine(db, data, { planId, recordedBy }) {
  const medicines = makeCollection(db, 'medicines')
  const existing = data.id ? await medicines.get(data.id) : null
  const now = nowIso()

  if (existing) {
    const updated = {
      ...existing,
      ...data,
      ...(data.times !== undefined ? { times: parseTimes(data.times) } : {}),
      updatedAt: now,
    }
    await medicines.put(updated)
    return updated
  }

  const record = createRecord(
    {
      name: data.name.trim(),
      strength: (data.strength || '').trim(),
      form: data.form || 'Tablet',
      stockUnit: data.stockUnit || 'tablet',
      doseQuantity: Number(data.doseQuantity) || 1,
      route: data.route || 'Oral',
      instructions: (data.instructions || '').trim(),
      times: parseTimes(data.times),
      lowStockThreshold: Number(data.lowStockThreshold) || 10,
      notes: (data.notes || '').trim(),
      active: data.active !== false,
    },
    { planId, recordedBy },
  )
  await medicines.put(record)
  return record
}

export async function setActive(db, id, active) {
  const medicines = makeCollection(db, 'medicines')
  const existing = await medicines.get(id)
  if (!existing) throw new Error('medicine not found')
  const updated = { ...existing, active, updatedAt: nowIso() }
  await medicines.put(updated)
  return updated
}

// Accepts "08:00, 13:00, 21:00" or "8:00 AM" — normalizes to 24h HH:MM.
export function parseTimes(input) {
  return String(input || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
      if (!match) return part
      let hours = Number(match[1])
      const minutes = match[2] || '00'
      const meridiem = match[3] ? match[3].toUpperCase() : null
      if (meridiem === 'PM' && hours < 12) hours += 12
      if (meridiem === 'AM' && hours === 12) hours = 0
      return `${String(hours).padStart(2, '0')}:${minutes}`
    })
}