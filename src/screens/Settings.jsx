import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ClipboardList, LogOut, MapPin, Palette, RefreshCw, ShieldCheck, ShoppingCart, Trash2, Truck, Users, Wallet, WifiOff } from 'lucide-react'
import { useSession } from '../store/session.js'
import { usePlans } from '../store/plan.js'
import { availableThemes, getStoredTheme, setTheme } from '../theme.js'
import { Button, Field, ScreenHeader, Select } from '../components/ui.jsx'

export default function Settings() {
  const navigate = useNavigate()
  const { profile, session, signOut } = useSession()
  const { plans, currentPlanId, deletePlan } = usePlans()
  const [theme, setThemeState] = useState(getStoredTheme() || 'teal')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const currentPlan = plans.find((plan) => plan.id === currentPlanId)

  function handleThemeChange(name) {
    setThemeState(name)
    setTheme(name)
  }

  async function handleSignOut() {
    setBusy(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleDeletePlan() {
    setBusy(true)
    setError(null)
    try {
      await deletePlan(currentPlanId)
      navigate('/select', { replace: true })
    } catch (err) {
      setError(String(err.message || err))
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  const links = [
    { to: '/plan/patient', label: 'Patient profile', icon: MapPin },
    { to: '/plan/members', label: 'Members & permissions', icon: Users },
    { to: '/plan/inventory', label: 'Inventory', icon: ClipboardList },
    { to: '/plan/purchases', label: 'Purchases', icon: ShoppingCart },
    { to: '/plan/transfers', label: 'Transfers', icon: Truck },
    { to: '/plan/notifications', label: 'Notifications & activity', icon: Bell },
    { to: '/plan/notification-preferences', label: 'Notification preferences', icon: Bell },
    { to: '/plan/sync', label: 'Offline sync status', icon: RefreshCw },
    { to: '/plan/audit', label: 'Audit history', icon: ShieldCheck },
  ]

  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader title="Settings" subtitle={profile?.name} />

        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Profile</h3>
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-line bg-card p-3.5">
          <span className="grid size-11 flex-none place-items-center rounded-xl bg-brand text-sm font-extrabold text-white">
            {initials(profile?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{profile?.name}</div>
            <div className="truncate text-xs text-muted">{profile?.email}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut} disabled={busy}>
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </div>

        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><Palette className="size-3.5" /> Appearance</h3>
        <Field label="Theme">
          <Select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
            {availableThemes.map((name) => (
              <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>
            ))}
          </Select>
        </Field>

        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Care plan pages</h3>
        <div className="mb-4 space-y-2">
          {links.map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-lg border border-line bg-card px-3.5 py-3 text-sm font-semibold text-ink hover:bg-app">
              <item.icon className="size-4 text-brand" />
              <span className="flex-1">{item.label}</span>
              <span className="text-muted">›</span>
            </Link>
          ))}
        </div>

        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><ShieldCheck className="size-3.5" /> Offline authorization</h3>
        <div className="mb-4 rounded-lg border border-line bg-card p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold">Signed in since</span><span className="text-muted">{session ? new Date(session.signedInAt).toLocaleString() : '—'}</span></div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="font-semibold">Sensitive actions expire</span><span className="text-muted">{session ? new Date(session.offlineAuthExpiresAt).toLocaleString() : '—'}</span></div>
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted"><WifiOff className="mt-0.5 size-3.5 flex-none" />Recording doses and stock changes needs fresh authorization every 24 h while offline. Reconnecting renews it.</p>
        </div>

        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">This plan</h3>
        <div className="mb-4 rounded-lg border border-line bg-card p-3.5">
          <div className="text-sm font-bold">{currentPlan?.patientName}</div>
          <div className="mt-0.5 text-xs text-muted">{currentPlan?.name} · role: {currentPlan?.role}</div>
        </div>

        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-missed"><Trash2 className="size-3.5" /> Danger zone</h3>
        {error ? <p className="mb-2 text-xs font-semibold text-missed">{error}</p> : null}
        {confirmDelete ? (
          <div className="rounded-lg border border-missed bg-missed-soft p-3.5">
            <p className="mb-2.5 text-xs leading-relaxed text-ink-2"><b className="text-ink">Delete this plan and all its local data?</b> This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleDeletePlan} disabled={busy}>{busy ? 'Deleting…' : 'Delete plan'}</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete this plan</Button>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">Sathi — care coordination. Runs standalone on this device; connects to servers when available.</p>
      </div>
    </div>
  )
}

function initials(name) {
  return String(name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}
