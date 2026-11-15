// src/lib/repo/inventory.js
// Inventory is DERIVED from the append-only stockMovement ledger — never
// mutated in place (BR-05/06, FR-41/42). Movement types and their effect:
//   receipt      quantity > 0  (stock in; purchase receipt, FR-52)
//   consumption  quantity < 0  (dose given, FR-39)
//   adjustment   signed        (reasoned, FR-40)
//   transfer_out quantity < 0  (source end, FR-60)
//   transfer_in  quantity > 0  (destination end, FR-60)

import { makeCollection, createRecord } from '../db/index.js'

export const MOVEMENT_TYPES = ['receipt', 'consumption', 'adjustment', 'transfer_out', 'transfer_in']

export async function listMovements(db, { medicineId } = {}) {
  const movements = await makeCollection(db, 'stockMovements').getAll()
  const filtered = medicineId ? movements.filter((m) => m.medicineId === medicineId) : movements
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function addMovement(db, movement, { planId, recordedBy }) {
  const record = createRecord(
    {
      medicineId: movement.medicineId,
      locationId: movement.locationId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason || '',
      refId: movement.refId || null,
    },
    { planId, recordedBy },
  )
  await makeCollection(db, 'stockMovements').put(record)
  return record
}

// Computes stock per medicine: { byLocation: { [locationId]: qty }, total }.
export async function stockByMedicine(db) {
  const movements = await listMovements(db)
  const result = new Map()
  for (const movement of movements) {
    if (!result.has(movement.medicineId)) {
      result.set(movement.medicineId, { byLocation: new Map(), total: 0 })
    }
    const entry = result.get(movement.medicineId)
    entry.byLocation.set(movement.locationId, (entry.byLocation.get(movement.locationId) || 0) + movement.quantity)
    entry.total += movement.quantity
  }
  return result
}

// Medicines at/below their threshold (BR-18): total across all locations,
// including carried stock (BR-08).
export function findLowStock(medicines, stockMap) {
  return medicines.filter((medicine) => {
    const total = stockMap.get(medicine.id)?.total ?? 0
    return total <= medicine.lowStockThreshold
  })
}