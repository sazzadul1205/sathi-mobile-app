import "fake-indexeddb/auto"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import AccountRecovery from "./AccountRecovery.jsx"

describe("AccountRecovery", () => {
  it("renders recovery guidance and form", () => {
    render(<MemoryRouter><AccountRecovery /></MemoryRouter>)
    expect(screen.getByRole("heading", { name: /Recover account/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Send recovery link/i })).toBeInTheDocument()
  })
})
