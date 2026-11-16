import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Notifications from "./Notifications.jsx"
import { activatePlan, resetAppDb, resetStores, seedPlan, signInStore } from "../test/seed.js"

beforeEach(async () => { await resetAppDb(); resetStores() })

describe("Notifications", () => {
  it("renders notifications page", async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session }); activatePlan({ planId, planRecord, context })
    render(<MemoryRouter><Notifications /></MemoryRouter>)
    expect(await screen.findByRole("heading", { name: /Notifications & activity/i })).toBeInTheDocument()
    db.close()
  })
})
