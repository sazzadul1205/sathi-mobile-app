// src/screens/Login.test.jsx
// Login screen (standalone device profiles): renders the create-profile form
// and creates a session end-to-end against fake-indexeddb.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Login from './Login.jsx'
import { useSession } from '../store/session.js'
import { createProfile, resetAppDbCache } from '../lib/repo/app.js'

beforeEach(async () => {
  // Each test file gets an isolated fake-indexeddb instance; only the profile
  // creation test writes, so a cache reset is enough to avoid bleed-over.
  resetAppDbCache()
  useSession.setState({ status: 'signed-out', profile: null, session: null, error: null })
})

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

describe('Login', () => {
  it('renders the welcome screen', () => {
    renderLogin()
    expect(screen.getByText('Welcome to Sathi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new device profile/i })).toBeInTheDocument()
  })

  it('creates a device profile and signs in (standalone auth)', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /new device profile/i }))
    fireEvent.change(screen.getByPlaceholderText('Rafiq Ahmed'), {
      target: { value: 'Rafiq Ahmed' },
    })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'rafiq@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create profile/i }))

    await waitFor(() => {
      expect(useSession.getState().status).toBe('signed-in')
    })
    expect(useSession.getState().profile?.email).toBe('rafiq@example.com')
  })

  it('continues with an existing device profile', async () => {
    await createProfile({ name: 'Nadia Karim', email: 'nadia@example.com' })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/select" element={<div>select page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /Nadia Karim/ }))

    expect(await screen.findByText('select page')).toBeInTheDocument()
    await waitFor(() => expect(useSession.getState().status).toBe('signed-in'))
    expect(useSession.getState().profile?.email).toBe('nadia@example.com')
  })
})