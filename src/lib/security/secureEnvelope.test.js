import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { isSealedEnvelope, openPayload, redactError, sealPayload } from "../security/secureEnvelope.js"
import { secureFetch } from "../security/secureFetch.js"
import { resetAppDbCache } from "../repo/app.js"

beforeEach(async () => {
  await resetAppDbCache()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("secure envelope", () => {
  it("seals and opens payloads via device cipher", async () => {
    const sealed = await sealPayload({ hello: "world", n: 2 })
    expect(isSealedEnvelope(sealed)).toBe(true)
    expect(sealed.__sealed).toBe(true)
    expect(typeof sealed.iv).toBe("string")
    expect(typeof sealed.data).toBe("string")
    await expect(openPayload(sealed)).resolves.toEqual({ hello: "world", n: 2 })
  })

  it("passes through non-sealed values", async () => {
    await expect(openPayload({ plain: true })).resolves.toEqual({ plain: true })
  })

  it("redacts sensitive error text", () => {
    expect(redactError(new Error("decrypt failed: token leak"))).toBe("Secure request failed")
    expect(redactError(new Error("network down"))).toBe("network down")
  })
})

describe("secureFetch", () => {
  it("seals request body and unseals sealed response", async () => {
    const responsePayload = await sealPayload({ ok: true })
    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body)
      expect(isSealedEnvelope(body)).toBe(true)
      expect(init.headers["Content-Type"]).toBe("application/json")
      return new Response(JSON.stringify(responsePayload), { status: 200, headers: { "Content-Type": "application/json" } })
    })
    vi.stubGlobal("fetch", fetchMock)
    const result = await secureFetch("/api/test", { method: "POST", body: { a: 1 } })
    expect(result).toEqual({ ok: true })
  })

  it("rejects unexpected plaintext response by default", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })))
    await expect(secureFetch("/api/test")).rejects.toThrow(/Secure response required/)
  })

  it("allows plaintext response when explicitly permitted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })))
    await expect(secureFetch("/api/test", { expectSealed: false })).resolves.toEqual({ ok: true })
  })
})
