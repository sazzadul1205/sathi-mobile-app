import { makeCollection, createRecord, nowIso } from '../db/index.js'

export async function listTransfers(db) {
  const items = await makeCollection(db, 'transfers').getAll()
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function saveTransfer(db, data, { planId, recordedBy }) {
  const store = makeCollection(db, 'transfers')
  if (data.id) {
    const existing = await store.get(data.id)
    if (!existing) throw new Error('transfer not found')
    const next = { ...existing, ...data, quantity: Number(data.quantity ?? existing.quantity ?? 0), updatedAt: nowIso() }
    await store.put(next)
    return next
  }
  const record = createRecord(
    {
      medicineName: (data.medicineName || '').trim(),
      quantity: Number(data.quantity) || 0,
      sourceName: data.sourceName || '',
      destinationName: data.destinationName || '',
      responsible: data.responsible || recordedBy,
      status: data.status || 'preparing',
      notes: (data.notes || '').trim(),
    },
    { planId, recordedBy },
  )
  await store.put(record)
  return record
}
