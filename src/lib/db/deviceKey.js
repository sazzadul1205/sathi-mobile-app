import { openAppDb, makeCollection } from "../db/client.js"
import { createAesGcmCipher, identityCipher } from "./cipher.js"

const DEVICE_KEY_ID = "device-encryption-key"

export async function getOrCreateDeviceKey() {
  const db = await openAppDb()
  const keys = makeCollection(db, "keys")
  const existing = await keys.get(DEVICE_KEY_ID)
  if (existing?.key) return existing.key

  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null

  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
  await keys.put({ id: DEVICE_KEY_ID, key, createdAt: new Date().toISOString(), alg: "A256GCM" })
  return key
}

export async function getDeviceCipher() {
  const key = await getOrCreateDeviceKey()
  if (!key) return identityCipher
  return createAesGcmCipher({ getKey: async () => key })
}
