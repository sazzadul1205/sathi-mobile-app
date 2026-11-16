import { openAppDb, makeCollection, newId, nowIso } from "../db/index.js"

const META_KEY = "medicineTemplates"

async function readTemplates() {
  try {
    const db = await openAppDb()
    const meta = await makeCollection(db, "meta").get(META_KEY)
    db.close()
    return Array.isArray(meta?.value) ? meta.value : []
  } catch {
    return []
  }
}

async function writeTemplates(templates) {
  const db = await openAppDb()
  await makeCollection(db, "meta").put({ key: META_KEY, value: templates, updatedAt: nowIso() })
  db.close()
  return templates
}

export async function listMedicineTemplates() {
  return readTemplates()
}

export async function saveMedicineTemplate({ name, medicines }) {
  const trimmed = String(name || "").trim()
  if (!trimmed) throw new Error("Template name is required")
  const items = (Array.isArray(medicines) ? medicines : []).map((m) => ({
    name: String(m.name || "").trim(),
    strength: String(m.strength || "").trim(),
    form: m.form || "Tablet",
    stockUnit: m.stockUnit || "tablet",
    doseQuantity: Number(m.doseQuantity) || 1,
    route: m.route || "Oral",
    instructions: String(m.instructions || "").trim(),
    times: Array.isArray(m.times) ? m.times : [],
    lowStockThreshold: Number(m.lowStockThreshold) || 10,
    notes: String(m.notes || "").trim(),
  })).filter((m) => m.name)
  if (!items.length) throw new Error("Template must include at least one medicine")
  const templates = await readTemplates()
  const next = [{ id: newId(), name: trimmed, medicines: items, createdAt: nowIso() }, ...templates.filter((t) => t.name !== trimmed)]
  return writeTemplates(next)
}

export async function deleteMedicineTemplate(id) {
  const templates = await readTemplates()
  return writeTemplates(templates.filter((t) => t.id !== id))
}
