// src/lib/db/cipher.js
// Encryption boundary for sensitive local data (SR-05).
//
// Repositories encrypt sensitive fields (patient care notes, dose notes, ...)
// BEFORE they hit IndexedDB. Two implementations share one interface:
//
//   identityCipher — development/testing; passes values through unchanged.
//   createAesGcmCipher — production; AES-GCM-256 with a device key stored in
//     the app DB "keys" store (non-extractable CryptoKey). Protects data at
//     rest on shared/offline devices; it does not defend against an attacker
//     with full device + browser control (documented tradeoff, see
//     docs/LOCAL_DATABASE.md §Threat model).
//
// Ciphertext shape: { iv: Uint8Array, data: Uint8Array } — structured-clone
// safe for IndexedDB storage.

export const identityCipher = {
  name: 'identity',
  async encrypt(value) {
    return value
  },
  async decrypt(value) {
    return value
  },
}

export async function createAesGcmCipher({ getKey }) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('WebCrypto (crypto.subtle) is unavailable')

  async function key() {
    const k = await getKey()
    if (!k) throw new Error('device encryption key missing — initialize it first')
    return k
  }

  return {
    name: 'aes-gcm-256',
    async encrypt(value) {
      const cryptoKey = await key()
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const data = await subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, toBytes(value))
      return { iv, data: new Uint8Array(data) }
    },
    async decrypt(payload) {
      const cryptoKey = await key()
      const plain = await subtle.decrypt({ name: 'AES-GCM', iv: payload.iv }, cryptoKey, payload.data)
      return fromBytes(new Uint8Array(plain))
    },
  }
}

function toBytes(value) {
  if (typeof value === 'string') return new TextEncoder().encode(value)
  if (value instanceof Uint8Array) return value
  if (value && typeof value === 'object') return new TextEncoder().encode(JSON.stringify(value))
  return new TextEncoder().encode(String(value))
}

function fromBytes(bytes) {
  try {
    return new TextDecoder().decode(bytes)
  } catch {
    return bytes
  }
}