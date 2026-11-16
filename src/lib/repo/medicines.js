import { makeCollection, createRecord, nowIso } from "../db/index.js"

export async function listMedicines(db, { includeInactive = false } = {}) {
  const all = await makeCollection(db, "medicines").getAll()
  return includeInactive ? all : all.filter((m) => m.active)
}

export async function getMedicine(db, id) {
  return makeCollection(db, "medicines").get(id)
}

export async function saveMedicine(db, data, { planId, recordedBy }) {
  const medicines = makeCollection(db, "medicines")
  const existing = data.id ? await medicines.get(data.id) : null
  const now = nowIso()
  const defaultQty = Number(data.doseQuantity ?? existing?.doseQuantity) || 1

  if (existing) {
    const updated = {
      ...existing,
      ...data,
      ...(data.times !== undefined ? { times: normalizeDoseTimes(data.times, defaultQty) } : {}),
      doseQuantity: defaultQty,
      updatedAt: now,
    }
    await medicines.put(updated)
    return updated
  }

  const record = createRecord(
    {
      name: data.name.trim(),
      strength: (data.strength || "").trim(),
      form: data.form || "Tablet",
      stockUnit: data.stockUnit || "tablet",
      doseQuantity: defaultQty,
      route: data.route || "Oral",
      instructions: (data.instructions || "").trim(),
      times: normalizeDoseTimes(data.times, defaultQty),
      lowStockThreshold: Number(data.lowStockThreshold) || 10,
      notes: (data.notes || "").trim(),
      active: data.active !== false,
    },
    { planId, recordedBy },
  )
  await medicines.put(record)
  return record
}

export async function setActive(db, id, active) {
  const medicines = makeCollection(db, "medicines")
  const existing = await medicines.get(id)
  if (!existing) throw new Error("medicine not found")
  const updated = { ...existing, active, updatedAt: nowIso() }
  await medicines.put(updated)
  return updated
}

const MEAL_RELATIONS = new Set(["before", "after", "with", ""])

export function normalizeTimeValue(part) {
  const raw = String(part || "").trim()
  if (!raw) return ""
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
  if (!match) return raw
  let hours = Number(match[1])
  const minutes = match[2] || "00"
  const meridiem = match[3] ? match[3].toUpperCase() : null
  if (meridiem === "PM" && hours < 12) hours += 12
  if (meridiem === "AM" && hours === 12) hours = 0
  return `${String(hours).padStart(2, "0")}:${minutes}`
}

export function normalizeDoseTimes(input, defaultQty = 1) {
  const list = Array.isArray(input) ? input : String(input || "").split(",")
  const fallbackQty = Number(defaultQty) > 0 ? Number(defaultQty) : 1
  const seen = new Set()
  const result = []

  for (const item of list) {
    let time = ""
    let quantity = fallbackQty
    let mealRelation = ""

    if (typeof item === "string") {
      time = normalizeTimeValue(item)
    } else if (item && typeof item === "object") {
      time = normalizeTimeValue(item.time)
      if (item.quantity !== undefined && item.quantity !== "") {
        const q = Number(item.quantity)
        if (q > 0) quantity = q
      }
      const rel = String(item.mealRelation || "").toLowerCase()
      mealRelation = MEAL_RELATIONS.has(rel) ? rel : ""
    }

    if (!time || seen.has(time)) continue
    seen.add(time)
    result.push({ time, quantity, mealRelation })
  }

  return result.sort((a, b) => (a.time > b.time ? 1 : -1))
}

// Backward-compatible: returns ["HH:MM", ...] for callers/tests expecting strings.
export function parseTimes(input, defaultQty = 1) {
  return normalizeDoseTimes(input, defaultQty).map((t) => t.time)
}
