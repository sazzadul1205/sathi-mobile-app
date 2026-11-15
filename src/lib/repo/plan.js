// src/lib/repo/plan.js
// Care-plan lifecycle: create (bootstraps the per-plan database with patient,
// default locations, owner membership, and an audit entry), read, and delete
// (wipes the plan database — SR-13 cache clear / plan removal).

import { deletePlanDb, makeCollection, newId, nowIso, openPlanDb } from '../db/index.js'
import { deletePlanRecord, savePlanRecord } from './app.js'

export const DEFAULT_LOCATIONS = ['Dhaka', 'Cumilla', 'Patient-carried']

export async function createCarePlan({ name, patientName, notes, location, ownerProfileId }) {
  const planId = newId()
  const db = await openPlanDb(planId)

  const timestamp = nowIso()
  const patientLocation = LOCATION_OPTIONS_SAFE(location) || DEFAULT_LOCATIONS[0]
  await makeCollection(db, 'patient').put({
    id: 'patient',
    name: patientName.trim(),
    dateOfBirth: null,
    location: patientLocation,
    notes: (notes || '').trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  for (const locationName of DEFAULT_LOCATIONS) {
    await makeCollection(db, 'locations').put({
      id: newId(),
      name: locationName,
      createdAt: timestamp,
    })
  }

  await makeCollection(db, 'members').put({
    id: newId(),
    userId: ownerProfileId,
    role: 'owner',
    permissions: ['*'],
    createdAt: timestamp,
  })

  await makeCollection(db, 'auditLog').put({
    id: newId(),
    entityType: 'plan',
    entityId: planId,
    action: 'plan.created',
    detail: `Plan created with patient "${patientName.trim()}"`,
    recordedBy: ownerProfileId,
    createdAt: timestamp,
  })

  db.close()

  await savePlanRecord({
    id: planId,
    name: (name || `${patientName.trim()}'s care`).trim(),
    patientName: patientName.trim(),
    role: 'owner',
  })

  return planId
}

function LOCATION_OPTIONS_SAFE(location) {
  const value = String(location || '').trim()
  return ['Dhaka', 'Cumilla', 'Outside these cities'].includes(value) ? value : null
}

export async function loadPlanContext(planId) {
  const db = await openPlanDb(planId)
  try {
    const [patient] = await makeCollection(db, 'patient').getAll()
    const members = await makeCollection(db, 'members').getAll()
    const locations = await makeCollection(db, 'locations').getAll()
    const current = members.find((m) => m.role) || members[0]
    return {
      patient,
      locations,
      role: current?.role || 'member',
    }
  } finally {
    db.close()
  }
}

export async function deleteCarePlan(planId) {
  await deletePlanRecord(planId)
  await deletePlanDb(planId)
}