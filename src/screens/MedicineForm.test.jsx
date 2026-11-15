// src/screens/MedicineForm.test.jsx
// Medicine add/edit form: validation, creation, and editing persisted to the
// plan database (react-hook-form + zod).
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MedicineForm from './MedicineForm.jsx'
import { useMedicines } from '../store/medicines.js'
import { listMedicines } from '../lib/repo/medicines.js'
import {
  activatePlan,
  resetAppDb,
  resetStores,
  seedPlan,
  signInStore,
} from '../test/seed.js'

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

describe('MedicineForm (create)', () => {
  it('adds a medicine to the active plan', async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session })
    activatePlan({ planId, planRecord, context })
    useMedicines.setState({ status: 'ready', medicines: [], stock: {}, lowStock: [], error: null })

    renderForm('/plan/meds/new')

    expect(await screen.findByRole('heading', { name: 'New medicine' })).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Metformin'), {
      target: { value: 'Metformin' },
    })
    fireEvent.change(screen.getByPlaceholderText('500 mg'), {
      target: { value: '500 mg' },
    })
    fireEvent.change(screen.getByPlaceholderText('08:00, 13:00, 21:00'), {
      target: { value: '08:00, 21:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add medicine' }))

    expect(await screen.findByText('medicines page')).toBeInTheDocument()
    await waitFor(async () => {
      const stored = await listMedicines(db)
      expect(stored.map((m) => m.name)).toContain('Metformin')
    })

    db.close()
  })

  it('shows a validation error when the name is missing', async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session })
    activatePlan({ planId, planRecord, context })
    useMedicines.setState({ status: 'ready', medicines: [], stock: {}, lowStock: [], error: null })

    renderForm('/plan/meds/new')

    fireEvent.click(await screen.findByRole('button', { name: 'Add medicine' }))
    expect(await screen.findByText('Medicine name is required')).toBeInTheDocument()

    db.close()
  })
})

describe('MedicineForm (edit)', () => {
  it('prefills and saves changes to an existing medicine', async () => {
    const { profile, session, planId, planRecord, context, db, medicines } = await seedPlan({
      medicines: [
        {
          name: 'Metformin',
          strength: '500 mg',
          times: '08:00, 21:00',
          doseQuantity: 1,
          stockUnit: 'tablet',
        },
      ],
    })
    const medicine = medicines[0]
    signInStore({ profile, session })
    activatePlan({ planId, planRecord, context })
    useMedicines.setState({
      status: 'ready',
      medicines,
      stock: {},
      lowStock: [],
      error: null,
    })

    renderForm(`/plan/meds/${medicine.id}`)

    expect(await screen.findByRole('heading', { name: 'Edit medicine' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Metformin')).toHaveValue('Metformin')
    expect(screen.getByPlaceholderText('500 mg')).toHaveValue('500 mg')

    fireEvent.change(screen.getByPlaceholderText('Metformin'), {
      target: { value: 'Metformin XR' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save medicine' }))

    await waitFor(async () => {
      const stored = await listMedicines(db)
      expect(stored.find((m) => m.id === medicine.id)?.name).toBe('Metformin XR')
    })

    db.close()
  })
})