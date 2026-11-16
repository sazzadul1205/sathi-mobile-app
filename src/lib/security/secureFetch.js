import { isSealedEnvelope, openPayload, redactError, sealPayload } from "./secureEnvelope.js"

function sanitizeHeaders(headers = {}) {
  const out = {}
  for (const [k, v] of Object.entries(headers)) {
    if (/authorization|cookie|token|key/i.test(k)) continue
    out[k] = v
  }
  return out
}

export async function secureFetch(url, options = {}) {
  const { method = "GET", headers = {}, body, sealRequest = true, expectSealed = true, ...rest } = options
  const init = { ...rest, method, headers: { ...sanitizeHeaders(headers) } }

  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json"
    const payload = sealRequest ? await sealPayload(body) : body
    init.body = JSON.stringify(payload)
  }

  let response
  try {
    response = await fetch(url, init)
  } catch (error) {
    throw new Error(redactError(error), { cause: error })
  }

  const text = await response.text()
  let parsed = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    throw new Error("Secure request failed")
  }

  if (parsed == null) return null
  if (isSealedEnvelope(parsed)) return openPayload(parsed)
  if (expectSealed) {
    // Reject unexpected plaintext responses to avoid exposing raw payload usage.
    throw new Error("Secure response required")
  }
  return parsed
}
