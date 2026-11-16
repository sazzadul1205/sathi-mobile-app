import { useEffect, useState } from "react"
import { getPlanDb, usePlans } from "../store/plan.js"
import { makeCollection } from "../lib/db/index.js"
import { Button, Card, Loading, ScreenHeader, StatusPill } from "../components/ui.jsx"

export default function SyncStatus() {
  const { currentPlanId } = usePlans()
  const [queue, setQueue] = useState(null)

  async function load() {
    if (!currentPlanId) return
    const db = await getPlanDb(currentPlanId)
    setQueue(await makeCollection(db, "syncQueue").getAll())
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!currentPlanId) return
      const db = await getPlanDb(currentPlanId)
      const data = await makeCollection(db, "syncQueue").getAll()
      if (!cancelled) setQueue(data)
    })()
    return () => { cancelled = true }
  }, [currentPlanId])

  if (!queue) return <Loading />
  const pending = queue.filter((q) => q.syncState === "pending").length
  const conflicts = queue.filter((q) => q.syncState === "conflict").length

  return (
    <div>
      <ScreenHeader title="Offline sync status" subtitle={`Pending ${pending} · conflicts ${conflicts}`} backTo />
      <Card className="mb-3">
        <div className="flex items-center justify-between"><div className="text-sm font-bold">Standalone local mode</div><StatusPill tone="pending">No server</StatusPill></div>
        <p className="mt-2 text-xs leading-relaxed text-muted">This device stores care events locally in IndexedDB. When a backend is connected, queued events sync with idempotent event IDs; conflicts are flagged for review and never applied silently (FR-80/81/82).</p>
      </Card>
      <div className="space-y-2">
        {queue.slice(0, 30).map((q, i) => (
          <div key={q.eventId || i} className="flex items-center justify-between rounded-lg border border-line bg-card px-3.5 py-2.5 text-xs">
            <div className="min-w-0"><div className="font-semibold">{q.type || "event"}</div><div className="truncate text-muted">{q.eventId || "—"}</div></div>
            <StatusPill tone={q.syncState === "synced" ? "ok" : q.syncState === "conflict" ? "missed" : "pending"}>{q.syncState || "pending"}</StatusPill>
          </div>
        ))}
        {queue.length === 0 ? <p className="text-xs text-muted">No queued sync events yet. Offline actions will appear here as pending until synced.</p> : null}
      </div>
      <div className="mt-3"><Button type="button" variant="secondary" onClick={load}>Refresh</Button></div>
    </div>
  )
}
