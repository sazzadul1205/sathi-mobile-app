import { makeCollection, createRecord, newId, nowIso } from '../db/index.js'

export async function listNotifications(db) {
  const items = await makeCollection(db, 'notifications').getAll()
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function addNotification(db, data, { planId, recordedBy }) {
  const record = createRecord(
    {
      title: (data.title || '').trim(),
      body: (data.body || '').trim(),
      category: data.category || 'general',
      read: false,
    },
    { planId, recordedBy },
  )
  await makeCollection(db, 'notifications').put(record)
  return record
}

export async function markNotificationRead(db, id, read = true) {
  const store = makeCollection(db, 'notifications')
  const existing = await store.get(id)
  if (!existing) return null
  const next = { ...existing, read, updatedAt: nowIso() }
  await store.put(next)
  return next
}

export async function seedDefaultNotifications(db, { planId, recordedBy }) {
  const existing = await listNotifications(db)
  if (existing.length) return existing
  const defaults = [
    { title: 'Low stock alert', body: 'Review medicines that are below threshold.', category: 'stock' },
    { title: 'Sync status', body: 'Offline changes stay pending until synced.', category: 'sync' },
    { title: 'Care reminder', body: 'Record dose outcomes from the Schedule tab.', category: 'dose' },
  ]
  const out = []
  for (const item of defaults) out.push(await addNotification(db, item, { planId, recordedBy }))
  return out
}
