// src/screens/Medicines.jsx
// Medicines list (SRS §8): location-aware stock totals, patient-carried supply
// included (BR-08), low stock surfaced. Different strengths are separate rows
// (FR-15).

import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMedicines } from '../store/medicines.js'
import { usePlans } from '../store/plan.js'
import { EmptyState, IconButton, Loading, StatusPill } from '../components/ui.jsx'

export default function Medicines() {
  const { status, medicines, stock, lowStock } = useMedicines()
  const { context } = usePlans()

  if (status === 'loading') return <Loading />

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-2 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Medicines</h2>
          <div className="mt-0.5 text-xs text-muted">
            {medicines.length} active
            {lowStock.length ? ` · ${lowStock.length} low stock` : ''}
          </div>
        </div>
        <Link to="/plan/meds/new" aria-label="Add medicine">
          <IconButton label="Add medicine" className="border-brand bg-brand text-white hover:opacity-90">
            <Plus className="size-4" />
          </IconButton>
        </Link>
      </div>

      {medicines.length ? (
        medicines.map((medicine) => {
          const medicineStock = stock[medicine.id]
          const locations = context?.locations || []
          return (
            <Link
              key={medicine.id}
              to={`/plan/meds/${medicine.id}`}
              className="mb-2.5 block rounded-lg border border-line bg-card p-3.5 shadow-1 transition-colors hover:bg-app"
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">
                    {medicine.name} {medicine.strength}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {medicine.form} · {medicine.route}
                    {medicine.times?.length ? ` · ${medicine.times.join(', ')}` : ''}
                  </div>
                </div>
                {lowStock.includes(medicine.id) ? (
                  <StatusPill tone="low">Low</StatusPill>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-app p-2">
                {locations.slice(0, 2).map((location) => (
                  <div key={location.id} className="text-center">
                    <div className="text-sm font-bold tabular-nums">
                      {medicineStock?.byLocation?.[location.id] ?? 0}
                    </div>
                    <div className="text-[9.5px] font-semibold uppercase tracking-wider text-muted">
                      {location.name}
                    </div>
                  </div>
                ))}
                <div className="rounded-md bg-card px-1 py-1 text-center">
                  <div className="text-sm font-bold tabular-nums">
                    {medicineStock?.total ?? 0}
                  </div>
                  <div className="text-[9.5px] font-semibold uppercase tracking-wider text-muted">
                    Total
                  </div>
                </div>
              </div>
            </Link>
          )
        })
      ) : (
        <EmptyState
          title="No medicines yet"
          hint="Add the patient's medicines exactly as prescribed — Sathi never generates instructions."
          action={
            <Link to="/plan/meds/new">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-xs font-bold text-white">
                <Plus className="size-3.5" /> Add medicine
              </span>
            </Link>
          }
        />
      )}

      <p className="mt-3 rounded-md border border-dashed border-line bg-app px-3.5 py-2.5 text-[11px] leading-relaxed text-muted">
        Different strengths are separate records. The app never modifies prescribed
        instructions automatically.
      </p>
    </div>
  )
}