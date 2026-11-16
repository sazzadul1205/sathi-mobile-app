import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { exportBackup, readBackupFile, restoreBackup } from "./backup.js"
import { createProfile, resetAppDbCache, listPlans } from "./app.js"
import { createCarePlan } from "./plan.js"
import { saveMedicine, listMedicines } from "./medicines.js"
import { openPlanDb } from "../db/index.js"

beforeEach(async () => {
  await resetAppDbCache()
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("sathi-app")
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
})

describe("backup & restore", () => {
  it("exports and restores app + plan data", async () => {
    const profile = await createProfile({ name: "Rafiq", email: "rafiq-backup@example.com" })
    const planId = await createCarePlan({ name: "Abbu care", patientName: "Rahim", ownerProfileId: profile.id })
    const db = await openPlanDb(planId)
    await saveMedicine(db, { name: "Metformin 500 mg", times: "08:00", doseQuantity: 1 }, { planId, recordedBy: profile.id })
    db.close()

    const backup = await exportBackup()
    expect(backup.format).toBe("sathi-backup")
    expect(backup.app.users.length).toBeGreaterThan(0)
    expect(backup.planDbs[planId]).toBeTruthy()
    expect(backup.planDbs[planId].medicines.length).toBe(1)

    // wipe and restore
    await resetAppDbCache()
    await new Promise((r) => { const req = indexedDB.deleteDatabase("sathi-app"); req.onsuccess = req.onerror = req.onblocked = () => r() })
    await restoreBackup(backup)

    const plans = await listPlans()
    expect(plans.some((p) => p.id === planId)).toBe(true)
    const restoredDb = await openPlanDb(planId)
    const meds = await listMedicines(restoredDb)
    expect(meds[0]?.name).toBe("Metformin 500 mg")
    restoredDb.close()
  })

  it("validates backup file shape", async () => {
    const file = new File([JSON.stringify({ format: "nope" })], "bad.json", { type: "application/json" })
    await expect(readBackupFile(file)).rejects.toThrow(/Not a Sathi backup file/)
  })
})
