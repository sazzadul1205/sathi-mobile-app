// src/test/seed.js
// Shared fixtures for component tests. Uses the real repository layer against
// fake-indexeddb so screens render with genuine data (no store mocking).
import 'fake-indexeddb/auto'
import { createProfile, resetAppDbCache } from '../lib/repo/app.js'
import { createCarePlan, loadPlanContext } from '../lib/repo/plan.js'
import { saveMedicine } from '../lib/repo/medicines.js'
import { openPlanDb } from '../lib/db/index.js'
import { useSession } from '../store/session.js'
import { usePlans } from '../store/plan.js'
import { useMedicines } from '../store/medicines.js'

let seq = 0

export function resetStores() {
  useSession.setState({ status: 'signed-out', profile: null, session: null, error: null })
  usePlans.setState({
    status: 'loading',
    plans: [],
    currentPlanId: null,
    context: null,
    error: null,
  })
  useMedicines.setState({
    status: 'loading',
    medicines: [],
    stock: {},
    lowStock: [],
    error: null,
  })
}

export async function resetAppDb() {
  resetAppDbCache()
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('sathi-app')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

export function makeSession(profile) {
  const now = Date.now()
  return {
    id: 'current',
    profileId: profile.id,
    signedInAt: new Date(now - 60_000).toISOString(),
    offlineAuthExpiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// Creates a real profile + plan (+ optional medicines) on fake-indexeddb.
// The returned plan database stays open for direct assertions.
export async function seedPlan({
  patientName = 'Rahim Mia',
  medicines = [],
  location = 'Dhaka',
} = {}) {
  const profile = await createProfile({
    name: 'Rafiq Ahmed',
    email: `rafiq-${seq++}-${Date.now()}@example.com`,
  })
  const planId = await createCarePlan({
    name: 'Abbu care',
    patientName,
    notes: 'Hypertension, diabetes',
    location,
    ownerProfileId: profile.id,
  })
  const db = await openPlanDb(planId)
  const saved = []
  for (const medicine of medicines) {
    saved.push(await saveMedicine(db, medicine, { planId, recordedBy: profile.id }))
  }
  const context = await loadPlanContext(planId)
  const planRecord = { id: planId, name: 'Abbu care', patientName, role: 'owner' }
  return {
    profile,
    session: makeSession(profile),
    planId,
    planRecord,
    context,
    db,
    medicines: saved,
  }
}

export function signInStore({ profile, session }) {
  useSession.setState({ status: 'signed-in', profile, session, error: null })
}

export function activatePlan({ planId, planRecord, context }) {
  usePlans.setState({
    status: 'ready',
    plans: [planRecord],
    currentPlanId: planId,
    context,
    error: null,
  })
}