// src/screens/Settings.test.jsx
// Settings: profile + plan summary, theme switching, sign out, and deleting the
// active plan (which wipes its local database).
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Settings from './Settings.jsx'
import { usePlans } from '../store/plan.js'
import { useSession } from '../store/session.js'
import { resetAppDb, resetStores, seedPlan, signInStore } from '../test/seed.js'

beforeEach(async () => {
  await resetAppDb()
  resetStores()
})

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/plan/settings']}>
      <Routes>
        <Route path="/plan/settings" element={<Settings />} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/select" element={<div>select page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Settings', () => {
  it('renders the profile, current plan and theme selector', async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session })
    usePlans.setState({
      status: 'ready',
      plans: [planRecord],
      currentPlanId: planId,
      context,
      error: null,
    })

    renderSettings()

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getAllByText('Rafiq Ahmed').length).toBeGreaterThan(0)
    expect(screen.getByText(/@example\.com/)).toBeInTheDocument()
    expect(screen.getByText('Rahim Mia')).toBeInTheDocument()
    expect(screen.getByLabelText('Theme')).toBeInTheDocument()

    db.close()
  })

  it('switches the active theme', async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session })
    usePlans.setState({
      status: 'ready',
      plans: [planRecord],
      currentPlanId: planId,
      context,
      error: null,
    })

    renderSettings()

    const select = await screen.findByLabelText('Theme')
    fireEvent.change(select, { target: { value: 'ocean' } })

    expect(document.documentElement.dataset.theme).toBe('ocean')
    expect(localStorage.getItem('sathi-theme')).toBe('ocean')

    db.close()
  })

  it('signs out and returns to login', async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session })
    usePlans.setState({
      status: 'ready',
      plans: [planRecord],
      currentPlanId: planId,
      context,
      error: null,
    })

    renderSettings()

    fireEvent.click(await screen.findByRole('button', { name: /sign out/i }))

    expect(await screen.findByText('login page')).toBeInTheDocument()
    await waitFor(() => expect(useSession.getState().status).toBe('signed-out'))

    db.close()
  })

  it('deletes the active plan', async () => {
    const { profile, session, planId, planRecord, context, db } = await seedPlan()
    signInStore({ profile, session })
    usePlans.setState({
      status: 'ready',
      plans: [planRecord],
      currentPlanId: planId,
      context,
      error: null,
    })

    renderSettings()
    db.close()

    fireEvent.click(await screen.findByRole('button', { name: 'Delete this plan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }))

    expect(await screen.findByText('select page')).toBeInTheDocument()
    await waitFor(() => expect(usePlans.getState().currentPlanId).toBeNull())
  })
})