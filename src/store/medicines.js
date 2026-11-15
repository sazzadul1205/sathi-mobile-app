// src/store/medicines.js
// Medicines + derived stock for the active plan. Inventory is always computed
// from the ledger (inventory.js) — never stored as a mutable number.

import { create } from 'zustand'
import { getPlanDb, usePlans } from './plan.js'
import { useSession } from './session.js'
import { listMedicines, saveMedicine as apiSave, setActive as apiSetActive } from '../lib/repo/medicines.js'
import { addMovement, findLowStock, stockByMedicine } from '../lib/repo/inventory.js'
import { makeCollection } from '../lib/db/index.js'

function toPlainObject(stockMap) {
  const result = {}
  for (const [medicineId, entry] of stockMap) {
    result[medicineId] = {
      byLocation: Object.fromEntries(entry.byLocation),
      total: entry.total,
    }
  }
  return result
}

export const useMedicines = create((set, get) => ({
  status: 'loading', // loading | ready
  medicines: [],
  stock: {}, // { [medicineId]: { byLocation, total } }
  lowStock: [],
  error: null,

  async load() {
    const planId = usePlans.getState().currentPlanId
    if (!planId) return
    try {
      const db = await getPlanDb(planId)
      const medicines = await listMedicines(db)
      const stock = toPlainObject(await stockByMedicine(db))
      const stockMap = new Map(
        Object.entries(stock).map(([id, value]) => [
          id,
          { total: value.total, byLocation: new Map(Object.entries(value.byLocation)) },
        ]),
      )
      const lowStock = findLowStock(medicines, stockMap).map((m) => m.id)
      set({ status: 'ready', medicines, stock, lowStock, error: null })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  async save(data) {
    const { currentPlanId: planId } = usePlans.getState()
    const recordedBy = useSession.getState().profile?.id || 'device'
    const db = await getPlanDb(planId)
    const saved = await apiSave(db, data, { planId, recordedBy })
    await get().load()
    return saved
  },

  async receive(medicineId, quantity, locationName) {
    const { currentPlanId: planId } = usePlans.getState()
    const recordedBy = useSession.getState().profile?.id || 'device'
    const db = await getPlanDb(planId)
    const locations = await makeCollection(db, 'locations').getAll()
    const location = locations.find((l) => l.name === locationName) || locations[0]
    await addMovement(
      db,
      {
        medicineId,
        locationId: location.id,
        type: 'receipt',
        quantity: Number(quantity),
        reason: 'stock received',
      },
      { planId, recordedBy },
    )
    await get().load()
  },

  async setActive(medicineId, active) {
    const { currentPlanId: planId } = usePlans.getState()
    const db = await getPlanDb(planId)
    await apiSetActive(db, medicineId, active)
    await get().load()
  },

  clearError() {
    set({ error: null })
  },
}))