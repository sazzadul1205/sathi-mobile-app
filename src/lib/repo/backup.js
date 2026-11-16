import {
  APP_DB_NAME,
  APP_STORES,
  PLAN_STORES,
  openAppDb,
  openPlanDb,
  deletePlanDb,
  makeCollection,
} from "../db/index.js"
import { listPlans, resetAppDbCache } from "./app.js"

const BACKUP_FORMAT = "sathi-backup"
const BACKUP_VERSION = 1

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function exportStore(db, storeName) {
  return makeCollection(db, storeName).getAll()
}

export async function exportBackup() {
  const appDb = await openAppDb()
  try {
    const app = {}
    for (const storeName of Object.keys(APP_STORES)) {
      // keys store may contain non-exportable CryptoKey objects; skip for portability
      if (storeName === "keys") {
        app[storeName] = []
        continue
      }
      app[storeName] = await exportStore(appDb, storeName)
    }

    const plans = app.plans || (await listPlans())
    const planDbs = {}
    for (const plan of plans) {
      const planId = plan.id
      if (!planId) continue
      try {
        const db = await openPlanDb(planId)
        try {
          const stores = {}
          for (const storeName of Object.keys(PLAN_STORES)) {
            stores[storeName] = await exportStore(db, storeName)
          }
          planDbs[planId] = stores
        } finally {
          db.close()
        }
      } catch {
        // skip unreadable/missing plan DBs
      }
    }

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appDbName: APP_DB_NAME,
      app,
      planDbs,
    }
  } finally {
    try {
      appDb.close()
    } catch {
      // ignore
    }
  }
}

export async function downloadBackup() {
  const data = await exportBackup()
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  downloadJson(`sathi-backup-${stamp}.json`, data)
  return data
}

function validateBackup(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid backup file")
  if (data.format !== BACKUP_FORMAT) throw new Error("Not a Sathi backup file")
  if (!Number.isInteger(data.version) || data.version < 1 || data.version > BACKUP_VERSION) {
    throw new Error("Unsupported backup version")
  }
  if (!data.app || typeof data.app !== "object") throw new Error("Backup missing app data")
  if (!data.planDbs || typeof data.planDbs !== "object") throw new Error("Backup missing plan data")
  return data
}

export async function readBackupFile(file) {
  const text = await file.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("Backup file is not valid JSON")
  }
  return validateBackup(parsed)
}

export async function restoreBackup(data, { closePlanDbs } = {}) {
  const backup = validateBackup(data)

  // Close known open plan DB connections if caller provides a hook.
  if (typeof closePlanDbs === "function") {
    await closePlanDbs()
  }

  // Delete existing plan DBs found in app registry and in backup.
  const existingPlans = await listPlans().catch(() => [])
  const planIds = new Set([
    ...existingPlans.map((p) => p.id).filter(Boolean),
    ...Object.keys(backup.planDbs || {}),
  ])
  for (const planId of planIds) {
    try {
      await deletePlanDb(planId)
    } catch {
      // ignore missing DBs
    }
  }

  // Restore app DB stores
  await resetAppDbCache()
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(APP_DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })

  const appDb = await openAppDb()
  for (const storeName of Object.keys(APP_STORES)) {
    if (storeName === "keys") continue // do not restore device-bound keys
    const records = Array.isArray(backup.app?.[storeName]) ? backup.app[storeName] : []
    if (!records.length) continue
    for (const record of records) {
      await makeCollection(appDb, storeName).put(record)
    }
  }
  appDb.close()

  // Restore plan DBs
  for (const [planId, stores] of Object.entries(backup.planDbs || {})) {
    try {
      const db = await openPlanDb(planId)
      for (const storeName of Object.keys(PLAN_STORES)) {
        const records = Array.isArray(stores?.[storeName]) ? stores[storeName] : []
        if (!records.length) continue
        for (const record of records) {
          await makeCollection(db, storeName).put(record)
        }
      }
      db.close()
    } catch {
      // continue restoring other plans
    }
  }

  await resetAppDbCache()
  return { restoredPlans: Object.keys(backup.planDbs || {}).length }
}
