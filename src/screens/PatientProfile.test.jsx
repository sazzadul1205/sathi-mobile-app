import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import PatientProfile from "./PatientProfile.jsx"
import { activatePlan, resetAppDb, resetStores, seedPlan, signInStore } from "../test/seed.js"

beforeEach(async () => { await resetAppDb(); resetStores() })

describe("PatientProfile", () => {
  it("renders and allows saving patient details", async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session }); activatePlan({ planId, planRecord, context })
    render(<MemoryRouter><PatientProfile /></MemoryRouter>)
    expect(await screen.findByRole("heading", { name: /Patient profile/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue("Rahim Mia")).toBeInTheDocument()
    db.close()
  })
})
