import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import MedicineForm from "./MedicineForm.jsx"
import { useMedicines } from "../store/medicines.js"
import { listMedicines } from "../lib/repo/medicines.js"
import { activatePlan, resetAppDb, resetStores, seedPlan, signInStore } from "../test/seed.js"

beforeEach(async () => {
  await resetAppDb()
  resetStores()
})

function renderForm(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/plan/meds/new" element={<MedicineForm />} />
        <Route path="/plan/meds/:medicineId" element={<MedicineForm />} />
        <Route path="/plan/meds" element={<div>medicines page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("MedicineForm (create)", () => {
  it("adds a medicine with per-time quantity and meal timing", async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session })
    activatePlan({ planId, planRecord, context })
    useMedicines.setState({ status: "ready", medicines: [], stock: {}, lowStock: [], error: null })

    renderForm("/plan/meds/new")

    expect(await screen.findByRole("heading", { name: "New medicine" })).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText("Metformin"), { target: { value: "Metformin" } })
    fireEvent.change(screen.getByPlaceholderText("500 mg"), { target: { value: "500 mg" } })

    fireEvent.change(screen.getByLabelText("Dose time 1"), { target: { value: "08:00" } })
    fireEvent.change(screen.getByLabelText("Dose quantity 1"), { target: { value: "2" } })
    fireEvent.change(screen.getByLabelText("Meal timing 1"), { target: { value: "after" } })

    fireEvent.click(screen.getByRole("button", { name: "Add dose time" }))
    fireEvent.change(screen.getByLabelText("Dose time 2"), { target: { value: "21:00" } })
    fireEvent.change(screen.getByLabelText("Dose quantity 2"), { target: { value: "1" } })
    fireEvent.change(screen.getByLabelText("Meal timing 2"), { target: { value: "before" } })

    fireEvent.click(screen.getByRole("button", { name: "Add medicine" }))

    expect(await screen.findByText("medicines page")).toBeInTheDocument()
    await waitFor(async () => {
      const stored = await listMedicines(db)
      const med = stored.find((m) => m.name === "Metformin")
      expect(med).toBeTruthy()
      expect(med.times).toEqual([
        { time: "08:00", quantity: 2, mealRelation: "after" },
        { time: "21:00", quantity: 1, mealRelation: "before" },
      ])
    })

    db.close()
  })
})

describe("MedicineForm (edit)", () => {
  it("prefills and saves per-time dose details", async () => {
    const { profile, session, planId, planRecord, context, db, medicines } = await seedPlan({
      medicines: [{ name: "Metformin", strength: "500 mg", times: "08:00, 21:00", doseQuantity: 1, stockUnit: "tablet" }],
    })
    const medicine = medicines[0]
    signInStore({ profile, session })
    activatePlan({ planId, planRecord, context })
    useMedicines.setState({ status: "ready", medicines, stock: {}, lowStock: [], error: null })

    renderForm(`/plan/meds/${medicine.id}`)

    expect(await screen.findByRole("heading", { name: "Edit medicine" })).toBeInTheDocument()
    expect(screen.getByLabelText("Dose time 1")).toHaveValue("08:00")

    fireEvent.change(screen.getByLabelText("Dose quantity 1"), { target: { value: "2" } })
    fireEvent.change(screen.getByLabelText("Meal timing 1"), { target: { value: "after" } })
    fireEvent.click(screen.getByRole("button", { name: "Save medicine" }))

    await waitFor(async () => {
      const stored = await listMedicines(db)
      const updated = stored.find((m) => m.id === medicine.id)
      expect(updated?.times[0]).toEqual({ time: "08:00", quantity: 2, mealRelation: "after" })
    })

    db.close()
  })
})
