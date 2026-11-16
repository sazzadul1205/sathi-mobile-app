import { makeCollection, newId, nowIso, createRecord } from '../db/index.js'

export async function listMembers(db) {
  const items = await makeCollection(db, 'members').getAll()
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function addMember(db, { userId, name, role, permissions }, { planId, recordedBy }) {
  const member = createRecord(
    {
      userId: userId || newId(),
      name: (name || '').trim() || 'Member',
      role: role || 'caregiver',
      permissions: permissions || [],
    },
    { planId, recordedBy },
  )
  await makeCollection(db, 'members').put(member)
  return member
}

export async function updateMember(db, id, patch) {
  const store = makeCollection(db, 'members')
  const existing = await store.get(id)
  if (!existing) throw new Error('member not found')
  const next = { ...existing, ...patch, updatedAt: nowIso() }
  await store.put(next)
  return next
}

export async function removeMember(db, id) {
  await makeCollection(db, 'members').delete(id)
}
