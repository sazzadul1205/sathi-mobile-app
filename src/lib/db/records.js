// src/lib/db/records.js
// Sync-readiness envelope + ledger guards for every local record.
//
// Every plan-scoped record carries the envelope that makes future server sync
// a drop-in (see docs/LOCAL_DATABASE.md §Sync-readiness contract):
//   id          local UUID (primary key)
//   eventId     immutable idempotency key — the server dedupes by this (FR-80)
//   planId      denormalized guard against cross-plan reads/writes
//   recordedBy  user id (account attribution, SR-09/10)
//   createdAt   local creation clock
//   updatedAt   local mutation clock
//   eventTime   when the event actually happened (client) — never overwritten
//   arrivalTime when it reached the server (server-set; null until synced, FR-79)
//   syncState   'pending' | 'synced' | 'conflict'
//   serverId    server primary key after acceptance (null until synced)
//   revision    optimistic-concurrency counter for future server updates

import { LEDGER_STORES } from './schema.js'

export const SYNC_STATES = ['pending', 'synced', 'conflict']

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // RFC 4122 v4 fallback (older/insecure contexts).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function nowIso() {
  return new Date().toISOString()
}

// Wrap domain data in the sync envelope. Returns a NEW record; callers put it
// into the appropriate store via client.js makeCollection.
export function createRecord(data, { planId, recordedBy, eventTime } = {}) {
  const timestamp = nowIso()
  return {
    ...data,
    id: data.id || newId(),
    eventId: newId(),
    planId,
    recordedBy: recordedBy || null,
    createdAt: timestamp,
    updatedAt: timestamp,
    eventTime: eventTime || timestamp,
    arrivalTime: null,
    syncState: 'pending',
    serverId: null,
    revision: 0,
  }
}

// Mark a record as accepted by the server. Only sync metadata changes —
// clinical/content fields are untouched (they were already server-accepted).
export function markSynced(record, { serverId = null, arrivalTime = nowIso() } = {}) {
  return { ...record, syncState: 'synced', serverId, arrivalTime, updatedAt: nowIso() }
}

// Mark a record as conflicted. The conflict payload is preserved verbatim for
// authorized review — conflicts are never resolved silently (FR-81/82).
export function markConflict(record, conflict) {
  return {
    ...record,
    syncState: 'conflict',
    conflict,
    updatedAt: nowIso(),
  }
}

export function isLedgerStore(storeName) {
  return LEDGER_STORES.includes(storeName)
}

// Guard for ledger stores (doseRecords, stockMovements, auditLog): content is
// immutable, so writing a record whose eventId already exists is a violation.
export function assertAppendable(storeName, record, existing) {
  if (isLedgerStore(storeName) && existing && existing.eventId === record.eventId) {
    throw new Error(
      `ledger store "${storeName}" is append-only — eventId ${record.eventId} already exists`,
    )
  }
}