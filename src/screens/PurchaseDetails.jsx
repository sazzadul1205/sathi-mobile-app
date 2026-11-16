import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getPlanDb, usePlans } from "../store/plan.js"
import { listPurchases, savePurchase } from "../lib/repo/purchases.js"
import { Card, Loading, ScreenHeader, Select, StatusPill } from "../components/ui.jsx"

export default function PurchaseDetails() {
  const { purchaseId } = useParams()
  const { currentPlanId } = usePlans()
  const [item, setItem] = useState(undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!currentPlanId) return
      const db = await getPlanDb(currentPlanId)
      const all = await listPurchases(db)
      if (!cancelled) setItem(all.find((p) => p.id === purchaseId) || null)
    })()
    return () => { cancelled = true }
  }, [currentPlanId, purchaseId])

  async function setStatus(status) {
    const db = await getPlanDb(currentPlanId)
    await savePurchase(db, { ...item, status }, { planId: currentPlanId, recordedBy: "device" })
    const all = await listPurchases(db)
    setItem(all.find((p) => p.id === purchaseId) || null)
  }

  if (item === undefined) return <Loading />
  if (!item) return <div><ScreenHeader title="Purchase" backTo /><p className="text-sm text-muted">Purchase not found.</p></div>

  return (
    <div>
      <ScreenHeader title="Purchase details" subtitle={item.medicineName} backTo />
      <Card>
        <div className="mb-2 flex items-center justify-between"><div className="text-sm font-bold">{item.medicineName}</div><StatusPill tone={item.status === "received" ? "ok" : "pending"}>{item.status}</StatusPill></div>
        <div className="space-y-1 text-xs text-ink-2"><div>Quantity: <b>{item.quantity}</b></div><div>Estimated cost: <b>{item.estimatedCost || "—"}</b></div><div>Responsible: <b>{item.responsible || "—"}</b></div></div>
        <div className="mt-3"><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">Update status</label>
          <div className="flex gap-2"><Select value={item.status} onChange={(e) => setStatus(e.target.value)}>{["planned","ordered","received","cancelled"].map(s=> <option key={s} value={s}>{s}</option>)}</Select></div></div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">Stock increases only when receipt is recorded with actual quantity. Recording receipt as a status here is local tracking; add stock via Inventory → Stock receipt for ledger movement (BR-06).</p>
      </Card>
    </div>
  )
}
