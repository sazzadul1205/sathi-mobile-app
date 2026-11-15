// src/app/App.test.jsx
// Routing smoke test: a signed-out user lands on the login screen through the
// real router tree (hash router + guards + session bootstrap).
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App.jsx'
import { useSession } from '../store/session.js'
import { usePlans } from '../store/plan.js'
import { resetAppDbCache } from '../lib/repo/app.js'

beforeEach(() => {
  resetAppDbCache()
  useSession.setState({ status: 'signed-out', profile: null, session: null, error: null })
  usePlans.setState({ status: 'loading', plans: [], currentPlanId: null, context: null })
})

describe('App routing', () => {
  it('routes a signed-out user to the login screen', async () => {
    render(<App />)
    await waitFor(
      () => {
        expect(screen.getByText('Welcome to Sathi')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })
})