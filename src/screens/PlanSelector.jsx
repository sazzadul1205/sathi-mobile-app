// src/screens/PlanSelector.jsx
// Care-plan selector (SRS §4): only authorized plans; switching changes every
// page's context. One plan = one patient (BR-01).

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Heart, LogOut, Plus } from 'lucide-react'
import { usePlans } from '../store/plan.js'
import { useSession } from '../store/session.js'
import { Button, Loading, ScreenHeader } from '../components/ui.jsx'

export default function PlanSelector() {
  const navigate = useNavigate()
  const { status, plans, loadPlans, selectPlan } = usePlans()
  const { profile, signOut } = useSession()

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  async function handleSelect(planId) {
    await selectPlan(planId)
    navigate('/plan', { replace: true })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (status === 'loading') return <Loading />

  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader
          title="Select a plan"
          subtitle={`Signed in as ${profile?.name || '…'}`}
          action={
            <button
              type="button"
              aria-label="Profile"
              onClick={handleSignOut}
              className="grid size-10 place-items-center rounded-xl border border-line bg-card text-ink-2"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          }
        />

        {status === 'empty' ? (
          <div className="rounded-lg border border-dashed border-line bg-app px-4 py-6 text-center text-xs leading-relaxed text-muted">
            No care plans yet. Create one to start coordinating care.
          </div>
        ) : (
          <div className="space-y-2.5">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => handleSelect(plan.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-3.5 text-left shadow-1 transition-colors hover:bg-app"
              >
                <span className="grid size-11 flex-none place-items-center rounded-xl bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-sm font-extrabold text-white">
                  {initials(plan.patientName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{plan.patientName}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Heart className="size-3 text-brand" />
                    {plan.name} · {plan.role}
                  </span>
                </span>
                <ChevronRight className="size-4 flex-none text-muted" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Button type="button" onClick={() => navigate('/plans/new')}>
            <Plus className="size-4" /> Create a new care plan
          </Button>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          Each plan represents exactly one patient. You may belong to multiple
          plans with a different role in each.
        </p>
      </div>
    </div>
  )
}

function initials(name) {
  return String(name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}