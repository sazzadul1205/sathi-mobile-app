// src/lib/db/cipher.js
// Encryption boundary for sensitive local data (SR-05).

export const identityCipher = {
  name: "identity",
  async encrypt(value) {
    return value
  },
  async decrypt(value) {
    return value
  },
}

export async function createAesGcmCipher({ getKey }) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error("WebCrypto (crypto.subtle) is unavailable")

  async function key() {
    const k = await getKey()
    if (!k) throw new Error("device encryption key missing - initialize it first")
    return k
  }

  return {
    name: "aes-gcm-256",
    async encrypt(value) {
      const cryptoKey = await key()
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
      const data = await subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, toBytes(value))
      return { iv, data: new Uint8Array(data) }
    },
    async decrypt(payload) {
      if (!payload || !(payload.iv instanceof Uint8Array) || !(payload.data instanceof Uint8Array)) {
        throw new Error("invalid encrypted payload")
      }
      const cryptoKey = await key()
      const plain = await subtle.decrypt({ name: "AES-GCM", iv: payload.iv }, cryptoKey, payload.data)
      return fromBytes(new Uint8Array(plain))
    },
  }
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (typeof value === "string") return new TextEncoder().encode(value)
  return new TextEncoder().encode(JSON.stringify(value))
}

function fromBytes(bytes) {
  const text = new TextDecoder().decode(bytes)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function isEncryptedPayload(value) {
  return Boolean(value && typeof value === "object" && value.iv instanceof Uint8Array && value.data instanceof Uint8Array)
}
