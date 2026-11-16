import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import StockReceipt from "./StockReceipt.jsx"
import { activatePlan, resetAppDb, resetStores, seedPlan, signInStore } from "../test/seed.js"

beforeEach(async () => { await resetAppDb(); resetStores() })

describe("StockReceipt", () => {
  it("renders stock receipt form", async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan({ medicines: [{ name: "Metformin", strength: "500 mg" }] })
    signInStore({ profile, session }); activatePlan({ planId, planRecord, context })
    render(<MemoryRouter><StockReceipt /></MemoryRouter>)
    expect(await screen.findByRole("heading", { name: /Stock receipt/i })).toBeInTheDocument()
    db.close()
  })
})
