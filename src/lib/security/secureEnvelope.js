import { getDeviceCipher } from "../db/deviceKey.js"
import { isEncryptedPayload } from "../db/cipher.js"

function bytesToBase64(bytes) {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function isSealedEnvelope(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.__sealed === true &&
      value.v === 1 &&
      typeof value.alg === "string" &&
      typeof value.iv === "string" &&
      typeof value.data === "string",
  )
}

function toTransportPayload(payload) {
  if (isEncryptedPayload(payload)) {
    return { iv: bytesToBase64(payload.iv), data: bytesToBase64(payload.data) }
  }
  if (payload && typeof payload === "object" && payload.iv instanceof ArrayBuffer && payload.data instanceof ArrayBuffer) {
    return { iv: bytesToBase64(new Uint8Array(payload.iv)), data: bytesToBase64(new Uint8Array(payload.data)) }
  }
  throw new Error("unsupported encrypted payload shape")
}

function fromTransportPayload(envelope) {
  return { iv: base64ToBytes(envelope.iv), data: base64ToBytes(envelope.data) }
}

export async function sealPayload(data) {
  const cipher = await getDeviceCipher()
  const encrypted = await cipher.encrypt(data)
  const packed = toTransportPayload(encrypted)
  return { __sealed: true, v: 1, alg: cipher.name || "aes-gcm-256", iv: packed.iv, data: packed.data }
}

export async function openPayload(value) {
  if (!isSealedEnvelope(value)) return value
  const cipher = await getDeviceCipher()
  try {
    return await cipher.decrypt(fromTransportPayload(value))
  } catch {
    throw new Error("unable to decrypt payload")
  }
}

export function redactError(error) {
  const message = String(error?.message || error || "request failed")
  if (/decrypt|payload|cipher|key|token|secret|authorization/i.test(message)) return "Secure request failed"
  return message
}
