import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { listMedicineTemplates, saveMedicineTemplate, deleteMedicineTemplate } from "./medicineTemplates.js"
import { resetAppDbCache } from "./app.js"

beforeEach(async () => {
  await resetAppDbCache()
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("sathi-app")
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe("medicine templates", () => {
  it("saves, lists, and deletes templates", async () => {
    await saveMedicineTemplate({
      name: "Daily",
      medicines: [
        { name: "Metformin", strength: "500 mg", times: [{ time: "08:00", quantity: 1, mealRelation: "after" }], doseQuantity: 1, stockUnit: "tablet" },
      ],
    })
    const list = await listMedicineTemplates()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe("Daily")
    expect(list[0].medicines[0].name).toBe("Metformin")
    await deleteMedicineTemplate(list[0].id)
    expect(await listMedicineTemplates()).toHaveLength(0)
  })

  it("replaces template with same name and validates input", async () => {
    await saveMedicineTemplate({ name: "Daily", medicines: [{ name: "A", strength: "1", times: [] }] })
    await saveMedicineTemplate({ name: "Daily", medicines: [{ name: "B", strength: "2", times: [] }] })
    const list = await listMedicineTemplates()
    expect(list).toHaveLength(1)
    expect(list[0].medicines[0].name).toBe("B")
    await expect(saveMedicineTemplate({ name: "", medicines: [{ name: "A" }] })).rejects.toThrow(/name/i)
    await expect(saveMedicineTemplate({ name: "X", medicines: [] })).rejects.toThrow(/at least one/i)
  })
})
