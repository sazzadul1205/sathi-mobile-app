import { useCallback, useEffect, useState } from 'react'
import { getPlanDb, usePlans } from '../store/plan.js'
import { useMedicines } from '../store/medicines.js'
import { listMovements } from '../lib/repo/inventory.js'
import { Card, Loading, ScreenHeader, StatusPill } from '../components/ui.jsx'

export default function Inventory() {
  const { context, currentPlanId } = usePlans()
  const { status, medicines, stock, load } = useMedicines()
  const [movements, setMovements] = useState([])

  const refresh = useCallback(async () => {
    if (!currentPlanId) return
    await load()
    const db = await getPlanDb(currentPlanId)
    setMovements(await listMovements(db))
  }, [currentPlanId, load])

  useEffect(() => { refresh() }, [refresh])

  if (!context || status === 'loading') return <Loading />

  return (
    <div>
      <ScreenHeader title="Inventory" subtitle="Stock by location and movement history" backTo />
      {medicines.length === 0 ? <p className="text-sm text-muted">No medicines yet.</p> : null}
      {medicines.map((m) => {
        const s = stock[m.id] || { byLocation: {}, total: 0 }
        return (
          <Card key={m.id} className="mb-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{m.name} {m.strength}</div>
                <div className="text-xs text-muted">Total usable: {s.total} {m.stockUnit}s</div>
              </div>
              <StatusPill tone={s.total <= m.lowStockThreshold ? 'low' : 'ok'}>{s.total <= m.lowStockThreshold ? 'Low' : 'OK'}</StatusPill>
            </div>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-app p-2">
              {(context.locations || []).map((loc) => (
                <div key={loc.id} className="text-center">
                  <div className="text-sm font-bold tabular-nums">{s.byLocation?.[loc.id] ?? 0}</div>
                  <div className="text-[9.5px] font-semibold uppercase tracking-wider text-muted">{loc.name}</div>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
      <h3 className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">Recent movements</h3>
      <div className="space-y-2">
        {movements.slice(0, 20).map((mv) => (
          <div key={mv.id} className="flex items-center justify-between rounded-lg border border-line bg-card px-3.5 py-2.5 text-xs">
            <div className="min-w-0">
              <div className="font-semibold capitalize">{mv.type.replace('_', ' ')}</div>
              <div className="truncate text-muted">{mv.reason || '—'}</div>
            </div>
            <div className={`font-bold tabular-nums ${mv.quantity < 0 ? 'text-missed' : 'text-given'}`}>{mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity}</div>
          </div>
        ))}
        {movements.length === 0 ? <p className="text-xs text-muted">No stock movements recorded yet.</p> : null}
      </div>
      <p className="mt-3 rounded-md border border-dashed border-line bg-app px-3.5 py-2.5 text-[11px] leading-relaxed text-muted">Totals are derived from the append-only movement ledger. Transfers change location split, not total.</p>
    </div>
  )
}
