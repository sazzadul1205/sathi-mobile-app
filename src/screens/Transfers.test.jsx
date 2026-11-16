import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Transfers from "./Transfers.jsx"
import { activatePlan, resetAppDb, resetStores, seedPlan, signInStore } from "../test/seed.js"

beforeEach(async () => { await resetAppDb(); resetStores() })

describe("Transfers", () => {
  it("renders transfers page", async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session }); activatePlan({ planId, planRecord, context })
    render(<MemoryRouter><Transfers /></MemoryRouter>)
    expect(await screen.findByRole("heading", { name: /Transfers/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Create transfer/i })).toBeInTheDocument()
    db.close()
  })
})
