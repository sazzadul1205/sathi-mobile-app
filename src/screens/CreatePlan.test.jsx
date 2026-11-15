// src/screens/CreatePlan.test.jsx
// Create-care-plan form: required-field validation and successful creation.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CreatePlan from './CreatePlan.jsx'
import { usePlans } from '../store/plan.js'
import { useSession } from '../store/session.js'
import { resetAppDb, resetStores, seedPlan, signInStore } from '../test/seed.js'

beforeEach(async () => {
  await resetAppDb()
  resetStores()
})

function renderCreatePlan() {
  return render(
    <MemoryRouter initialEntries={['/plans/new']}>
      <Routes>
        <Route path="/plans/new" element={<CreatePlan />} />
        <Route path="/plan" element={<div>plan page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CreatePlan', () => {
  it('rejects an empty patient name', async () => {
    useSession.setState({
      status: 'signed-in',
      profile: { id: 'p1', name: 'Rafiq Ahmed', email: 'rafiq@example.com' },
      session: {},
      error: null,
    })
    const { container } = renderCreatePlan()

    // The input is `required`, so a real click is blocked by native validation.
    // Submit the form directly to exercise the explicit guard.
    fireEvent.submit(container.querySelector('form'))
    expect(await screen.findByText('Patient name is required')).toBeInTheDocument()
    expect(usePlans.getState().currentPlanId).toBeNull()
  })

  it('creates a plan and selects it', async () => {
    const { profile, session } = await seedPlan()
    signInStore({ profile, session })
    renderCreatePlan()

    fireEvent.change(screen.getByPlaceholderText('Full name'), {
      target: { value: 'Rahim Mia' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }))

    await waitFor(() => expect(usePlans.getState().currentPlanId).toBeTruthy())
    expect(await screen.findByText('plan page')).toBeInTheDocument()
    expect(usePlans.getState().plans.some((p) => p.patientName === 'Rahim Mia')).toBe(true)
  })
})