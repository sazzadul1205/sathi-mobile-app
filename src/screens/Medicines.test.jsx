// src/screens/Medicines.test.jsx
// Medicines list: empty state and location-aware stock rows with low-stock flag.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Medicines from './Medicines.jsx'
import { useMedicines } from '../store/medicines.js'
import { usePlans } from '../store/plan.js'
import { findLowStock, stockByMedicine } from '../lib/repo/inventory.js'
import { resetAppDb, resetStores, seedPlan } from '../test/seed.js'

beforeEach(async () => {
  await resetAppDb()
  resetStores()
})

describe('Medicines', () => {
  it('shows the empty state when there are no medicines', () => {
    usePlans.setState({
      ...usePlans.getState(),
      context: { patient: { name: 'Rahim Mia' }, locations: [], role: 'owner' },
    })
    useMedicines.setState({
      status: 'ready',
      medicines: [],
      stock: {},
      lowStock: [],
      error: null,
    })

    render(
      <MemoryRouter>
        <Medicines />
      </MemoryRouter>,
    )

    expect(screen.getByText('No medicines yet')).toBeInTheDocument()
  })

  it('renders medicines with per-location stock and a low-stock flag', async () => {
    const { context, db, medicines } = await seedPlan({
      medicines: [
        { name: 'Metformin', strength: '500 mg', lowStockThreshold: 10 },
        { name: 'Amlodipine', strength: '5 mg', lowStockThreshold: 2 },
      ],
    })

    const stockMap = await stockByMedicine(db)
    const stock = Object.fromEntries(
      [...stockMap].map(([id, entry]) => [
        id,
        { byLocation: Object.fromEntries(entry.byLocation), total: entry.total },
      ]),
    )
    const lowStock = findLowStock(medicines, stockMap).map((m) => m.id)

    usePlans.setState({
      ...usePlans.getState(),
      context,
      status: 'ready',
    })
    useMedicines.setState({ status: 'ready', medicines, stock, lowStock, error: null })

    render(
      <MemoryRouter>
        <Medicines />
      </MemoryRouter>,
    )

    expect(screen.getByText('2 active · 2 low stock')).toBeInTheDocument()
    expect(screen.getByText(/Metformin 500 mg/)).toBeInTheDocument()
    expect(screen.getByText(/Amlodipine 5 mg/)).toBeInTheDocument()
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0)

    db.close()
  })
})