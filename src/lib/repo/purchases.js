import { makeCollection, createRecord, newId, nowIso } from '../db/index.js'

export async function listPurchases(db) {
  const items = await makeCollection(db, 'purchases').getAll()
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function savePurchase(db, data, { planId, recordedBy }) {
  const store = makeCollection(db, 'purchases')
  if (data.id) {
    const existing = await store.get(data.id)
    if (!existing) throw new Error('purchase not found')
    const next = { ...existing, ...data, quantity: Number(data.quantity ?? existing.quantity ?? 0), updatedAt: nowIso() }
    await store.put(next)
    return next
  }
  const record = createRecord(
    {
      medicineName: (data.medicineName || '').trim(),
      quantity: Number(data.quantity) || 0,
      estimatedCost: data.estimatedCost || '',
      responsible: data.responsible || recordedBy,
      status: data.status || 'planned',
      notes: (data.notes || '').trim(),
      locationId: data.locationId || null,
    },
    { planId, recordedBy },
  )
  await store.put(record)
  return record
}
