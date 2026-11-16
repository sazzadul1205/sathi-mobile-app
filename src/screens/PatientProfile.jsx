import { useCallback, useEffect, useState } from "react"
import { getPlanDb, usePlans } from "../store/plan.js"
import { useSession } from "../store/session.js"
import { makeCollection, newId, nowIso } from "../lib/db/index.js"
import { Button, Field, Loading, ScreenHeader, Select, TextArea, TextInput } from "../components/ui.jsx"

export default function PatientProfile() {
  const { currentPlanId, context } = usePlans()
  const { profile } = useSession()
  const [patient, setPatient] = useState(null)
  const [form, setForm] = useState({ name: "", location: "Dhaka", notes: "" })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!currentPlanId) return
    const db = await getPlanDb(currentPlanId)
    const [p] = await makeCollection(db, "patient").getAll()
    setPatient(p)
    if (p) setForm({ name: p.name || "", location: p.location || "Dhaka", notes: p.notes || "" })
  }, [currentPlanId])

  useEffect(() => { load() }, [load])

  async function save(e) {
    e.preventDefault()
    if (!patient) return
    setBusy(true)
    const db = await getPlanDb(currentPlanId)
    const next = { ...patient, ...form, name: form.name.trim(), notes: form.notes.trim(), updatedAt: nowIso() }
    await makeCollection(db, "patient").put(next)
    await makeCollection(db, "auditLog").put({
      id: newId(),
      entityType: "patient",
      entityId: patient.id,
      action: "patient.updated",
      detail: "Patient profile updated",
      recordedBy: profile?.id || "device",
      createdAt: nowIso(),
    })
    setBusy(false)
    await load()
  }

  if (!context || !patient) return <Loading />

  return (
    <div>
      <ScreenHeader title="Patient profile" subtitle={context.role} backTo />
      <form onSubmit={save} className="rounded-lg border border-line bg-card p-4 shadow-1">
        <Field label="Patient name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Current location">
          <Select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
            {["Dhaka", "Cumilla", "Outside these cities"].map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Care notes"><TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <p className="mb-3 text-[11px] leading-relaxed text-muted">Profile changes are traceable in audit history. Only authorised members should edit care details.</p>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </form>
    </div>
  )
}
