import { useEffect, useState } from 'react'
import { useMembers } from '../store/members.js'
import { usePlans } from '../store/plan.js'
import { Button, Card, Field, Loading, ScreenHeader, Select, TextInput } from '../components/ui.jsx'

export default function Members() {
  const { status, members, load, add, remove } = useMembers()
  const { context } = usePlans()
  const [form, setForm] = useState({ name: '', role: 'caregiver' })
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    await add({ name: form.name, role: form.role, permissions: [] })
    setForm({ name: '', role: 'caregiver' })
    setBusy(false)
  }

  if (status === 'loading' || status === 'idle') return <Loading />

  return (
    <div>
      <ScreenHeader title="Members & permissions" subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`} backTo />
      <Card className="mb-3">
        <p className="text-xs leading-relaxed text-muted">Roles are templates; actual access is granted permissions per care plan. Membership changes are auditable. This device view manages local plan members.</p>
      </Card>
      <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-line bg-card p-4 shadow-1">
        <Field label="Member name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="owner">Owner</option>
            <option value="administrator">Administrator</option>
            <option value="family">Family member</option>
            <option value="caregiver">Caregiver</option>
          </Select>
        </Field>
        <Button type="submit" disabled={busy || !form.name.trim()}>{busy ? 'Adding…' : 'Add member'}</Button>
      </form>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card p-3.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{m.name || m.userId || 'Member'}</div>
              <div className="text-xs text-muted capitalize">{m.role}{context?.role === m.role ? ' · current context' : ''}</div>
            </div>
            {m.role !== 'owner' ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => remove(m.id)}>Remove</Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
