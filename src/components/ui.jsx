// src/components/ui.jsx
// Shared UI kit for Sathi screens — built on the design tokens (see README,
// src/styles/themes/). Follows the visual language of Project_Plan/Design.html.

import { NavLink } from 'react-router-dom'
import { CalendarDays, ChevronLeft, Home, Pill, Settings } from 'lucide-react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

export function Button({ variant = 'primary', size, className, ...props }) {
  return (
    <button
      className={cx(
        'flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-40',
        variant === 'primary' && 'bg-brand text-white shadow-1 hover:opacity-90',
        variant === 'secondary' && 'border border-line bg-card text-ink hover:bg-app',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        variant === 'ghost' && 'border border-dashed border-brand bg-transparent text-brand',
        size === 'sm' && 'w-auto px-3 py-2 text-xs',
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        'grid size-10 flex-none place-items-center rounded-xl border border-line bg-card text-ink-2 transition-colors hover:bg-app',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ className, children }) {
  return <div className={cx('rounded-lg border border-line bg-card p-4 shadow-1', className)}>{children}</div>
}

export function ScreenHeader({ title, subtitle, backTo, action }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 pb-4">
      {backTo ? (
        <IconButton label="Go back" onClick={() => window.history.back()} className="size-9 rounded-xl">
          <ChevronLeft className="size-4" />
        </IconButton>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-bold tracking-tight">{title}</h2>
        {subtitle ? <div className="mt-0.5 text-xs text-muted">{subtitle}</div> : null}
      </div>
      {action}
    </div>
  )
}

const PILL_TONES = {
  given: 'bg-given-soft text-given',
  missed: 'bg-missed-soft text-missed',
  refused: 'bg-refused-soft text-refused',
  other: 'bg-other-soft text-other',
  pending: 'bg-pending-soft text-pending',
  transit: 'bg-transit-soft text-transit',
  sync: 'bg-sync-soft text-sync',
  low: 'bg-missed-soft text-missed',
  ok: 'bg-given-soft text-given',
  brand: 'bg-brand-soft text-brand-dk',
}

export function StatusPill({ tone = 'pending', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold',
        PILL_TONES[tone] || PILL_TONES.pending,
      )}
    >
      {children}
    </span>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
        {label}
        {hint ? <span className="ml-1 font-medium normal-case tracking-normal text-muted">({hint})</span> : null}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-md border border-line bg-card px-3.5 py-3 text-sm text-ink outline-none transition-shadow placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/10'

export function TextInput({ className, ...props }) {
  return <input className={cx(inputClass, className)} {...props} />
}

export function TextArea({ className, ...props }) {
  return <textarea className={cx(inputClass, 'min-h-20 resize-none', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx(inputClass, 'appearance-none', className)} {...props}>
      {children}
    </select>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-6 w-11 flex-none rounded-full transition-colors',
        checked ? 'bg-brand' : 'bg-line',
      )}
    >
      <span
        className={cx(
          'absolute top-0.75 left-0.75 size-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4.5',
        )}
      />
    </button>
  )
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="mx-auto mb-3 grid size-13 place-items-center rounded-2xl border border-dashed border-line bg-app text-muted">
        <Pill className="size-6" />
      </div>
      <div className="text-sm font-bold">{title}</div>
      {hint ? <div className="mx-auto mt-1 max-w-40 text-xs leading-relaxed text-muted">{hint}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Loading() {
  return <div className="py-10 text-center text-sm text-muted">Loading…</div>
}

const TABS = [
  { to: '.', label: 'Home', icon: Home, end: true },
  { to: 'schedule', label: 'Schedule', icon: CalendarDays },
  { to: 'meds', label: 'Meds', icon: Pill },
  { to: 'settings', label: 'Settings', icon: Settings },
]

export function TabBar() {
  return (
    <nav className="grid flex-none grid-cols-4 border-t border-line bg-card/95 px-2 pt-2 pb-4 backdrop-blur">
      {TABS.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cx(
              'flex flex-col items-center gap-1 py-1 text-[10px] font-semibold',
              isActive ? 'text-brand' : 'text-muted',
            )
          }
        >
          <tab.icon className="size-5" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function SyncStrip({ pending = 0 }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[11px] text-ink-2">
      <span className="size-2 flex-none rounded-full bg-pending" />
      <span>
        <b className="font-bold text-ink">Local mode</b> — offline-ready
      </span>
      {pending > 0 ? (
        <>
          <span className="h-3 w-px bg-line" />
          <span>
            <b className="font-bold text-ink">{pending}</b> pending sync
          </span>
        </>
      ) : null}
      <span className="ml-auto text-muted">No account needed to use this device</span>
    </div>
  )
}