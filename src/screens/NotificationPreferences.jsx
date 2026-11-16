import { useState } from 'react'
import { ScreenHeader, Toggle } from '../components/ui.jsx'

const PREFS = [
  { id: 'dose', label: 'Upcoming doses', hint: 'Reminders before scheduled dose times' },
  { id: 'outcomes', label: 'Dose outcomes recorded', hint: 'When another caregiver records outcomes' },
  { id: 'lowstock', label: 'Low stock & purchase needs', hint: 'When usable stock falls below threshold' },
  { id: 'transfers', label: 'Transfer updates', hint: 'Preparation and receipt updates' },
  { id: 'membership', label: 'Membership changes', hint: 'Invitations and permission changes' },
]

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(() => Object.fromEntries(PREFS.map((p) => [p.id, true])))
  const [hidePreview, setHidePreview] = useState(true)
  return (
    <div>
      <ScreenHeader title="Notification preferences" subtitle="Per-category controls" backTo />
      <div className="rounded-lg border border-line bg-card p-1">
        {PREFS.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 border-b border-line-2 px-3 py-3 last:border-0">
            <div><div className="text-sm font-semibold">{p.label}</div><div className="text-[11px] text-muted">{p.hint}</div></div>
            <Toggle checked={prefs[p.id]} onChange={(v) => setPrefs((s) => ({ ...s, [p.id]: v }))} label={p.label} />
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-line bg-card px-3 py-3">
        <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Security alerts</div><div className="text-[11px] text-muted">Always on — cannot be disabled</div></div><span className="text-[11px] font-bold text-brand">Always on</span></div>
      </div>
      <div className="mt-3 rounded-lg border border-line bg-card px-3 py-3">
        <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Hide preview on lock screen</div><div className="text-[11px] text-muted">Medicine and patient names hidden in previews</div></div><Toggle checked={hidePreview} onChange={setHidePreview} label="Hide preview" /></div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">Browser/OS restrictions may delay reminders. Preferences are stored locally in standalone mode.</p>
    </div>
  )
}
