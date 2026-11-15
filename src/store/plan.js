// src/store/plan.js
// Active care-plan context: registry list, per-plan DB connection cache,
// patient/location/role context. Switching plans changes every page's context
// (SRS §4) — there is no "all plans" view.

import { create } from 'zustand'
import { openPlanDb } from '../lib/db/index.js'
import { listPlans, savePlanRecord } from '../lib/repo/app.js'
import { createCarePlan, loadPlanContext, deleteCarePlan } from '../lib/repo/plan.js'

const dbCache = new Map()

export async function getPlanDb(planId) {
  if (!dbCache.has(planId)) {
    dbCache.set(planId, await openPlanDb(planId))
  }
  return dbCache.get(planId)
}

export const usePlans = create((set, get) => ({
  status: 'loading', // loading | ready | empty
  plans: [],
  currentPlanId: null,
  context: null, // { patient, locations, role }
  error: null,

  async loadPlans() {
    try {
      const plans = await listPlans()
      plans.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      set({ plans, status: plans.length ? 'ready' : 'empty', error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  async selectPlan(planId) {
    const context = await loadPlanContext(planId)
    await getPlanDb(planId) // warm the connection cache
    await savePlanRecord({ ...(get().plans.find((p) => p.id === planId) || { id: planId }) })
    set({ currentPlanId: planId, context, error: null })
  },

  async createPlan(data) {
    const planId = await createCarePlan(data)
    await get().loadPlans()
    await get().selectPlan(planId)
    return planId
  },

  async deletePlan(planId) {
    const cached = dbCache.get(planId)
    if (cached) {
      cached.close()
      dbCache.delete(planId)
    }
    await deleteCarePlan(planId)
    if (get().currentPlanId === planId) {
      set({ currentPlanId: null, context: null })
    }
    await get().loadPlans()
  },

  clearError() {
    set({ error: null })
  },
}))