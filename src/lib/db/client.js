// src/lib/db/client.js
// Connection layer for the local-first IndexedDB store.
// App DB: device-wide data. Plan DBs: one per care plan (SR-07 isolation).
// No dependency on the network — the app works fully offline (standalone mode).

import { APP_DB_NAME, PLAN_DB_PREFIX, SCHEMA_VERSION, upgradeAppDatabase, upgradePlanDatabase } from './schema.js'

export function openAppDb() {
  return openDatabase(APP_DB_NAME, SCHEMA_VERSION, upgradeAppDatabase)
}

export function openPlanDb(planId) {
  return openDatabase(planDbNameOf(planId), SCHEMA_VERSION, upgradePlanDatabase)
}

export function planDbNameOf(planId) {
  if (!planId) throw new Error('planDbNameOf requires a planId')
  return `${PLAN_DB_PREFIX}${planId}`
}

// Close a plan database and wipe all of its data (plan removal / access
// revocation with device online — SR-13). Other plans are untouched.
export async function deletePlanDb(planId) {
  const name = planDbNameOf(planId)
  const db = await openPlanDb(planId)
  db.close()
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function openDatabase(name, version, upgrade) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onupgradeneeded = () => upgrade(request.result, request.oldVersion)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Run `fn(store)` inside a transaction on one store; resolves with fn's result.
export function withStore(db, storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    let result
    let error = null
    try {
      const maybePromise = fn(store)
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(
          (value) => { result = value },
          (err) => { error = err; tx.abort() },
        )
      } else {
        result = maybePromise
      }
    } catch (err) {
      error = err
      tx.abort()
    }
    tx.oncomplete = () => (error ? reject(error) : resolve(result))
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || error || new Error('transaction aborted'))
  })
}

export function makeCollection(db, storeName) {
  return {
    get: (key) => withStore(db, storeName, 'readonly', (s) => req(s.get(key))),
    getAll: () => withStore(db, storeName, 'readonly', (s) => req(s.getAll())),
    getByIndex: (indexName, key) =>
      withStore(db, storeName, 'readonly', (s) => req(s.index(indexName).getAll(key))),
    put: (value) => withStore(db, storeName, 'readwrite', (s) => req(s.put(value))),
    delete: (key) => withStore(db, storeName, 'readwrite', (s) => req(s.delete(key))),
    count: () => withStore(db, storeName, 'readonly', (s) => req(s.count())),
  }
}

function req(idbRequest) {
  return new Promise((resolve, reject) => {
    idbRequest.onsuccess = () => resolve(idbRequest.result)
    idbRequest.onerror = () => reject(idbRequest.error)
  })
}