import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'Get started', level: 1 }),
    ).toBeInTheDocument()
  })

  it('increments the counter when clicked', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    fireEvent.click(button)
    expect(
      screen.getByRole('button', { name: /count is 1/i }),
    ).toBeInTheDocument()
  })
})