// src/lib/repo/app.js
// App-database repositories: device profiles, session, plan registry.
// Standalone mode: the local DB is the system of record. When the backend
// exists, the sync layer (lib/sync) bridges these records to the server.

import { openAppDb, makeCollection, nowIso, newId } from '../db/index.js'

const DAY_MS = 24 * 60 * 60 * 1000 // FR-73: offline authorization expires after 24 h

let appDbPromise = null
let appDbConnection = null
function appDb() {
  if (!appDbPromise) {
    appDbPromise = openAppDb().then((db) => {
      appDbConnection = db
      return db
    })
  }
  return appDbPromise
}

// Closes the cached connection so the app DB can be deleted/reset (tests).
export async function resetAppDbCache() {
  if (appDbConnection) {
    appDbConnection.close()
    appDbConnection = null
  }
  appDbPromise = null
}

export async function listProfiles() {
  return makeCollection(await appDb(), 'users').getAll()
}

export async function createProfile({ name, email }) {
  const users = makeCollection(await appDb(), 'users')
  const normalizedEmail = email.trim().toLowerCase()
  const existing = (await users.getByIndex('email', normalizedEmail))[0]
  if (existing) throw new Error('A device profile with this email already exists')
  const profile = {
    id: newId(),
    name: name.trim(),
    email: normalizedEmail,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  await users.put(profile)
  return profile
}

export async function getSession() {
  return makeCollection(await appDb(), 'session').get('current')
}

export async function signIn(profileId) {
  const session = {
    id: 'current',
    profileId,
    signedInAt: nowIso(),
    offlineAuthExpiresAt: new Date(Date.now() + DAY_MS).toISOString(),
  }
  await makeCollection(await appDb(), 'session').put(session)
  return session
}

export async function signOut() {
  await makeCollection(await appDb(), 'session').delete('current')
}

export async function listPlans() {
  return makeCollection(await appDb(), 'plans').getAll()
}

export async function getPlanRecord(planId) {
  return makeCollection(await appDb(), 'plans').get(planId)
}

export async function savePlanRecord(record) {
  const plans = makeCollection(await appDb(), 'plans')
  const next = { ...record, updatedAt: nowIso() }
  await plans.put(next)
  return next
}

export async function deletePlanRecord(planId) {
  await makeCollection(await appDb(), 'plans').delete(planId)
}