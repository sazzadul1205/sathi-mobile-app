// src/screens/MedicineForm.jsx
// Add / edit a medicine (SRS §9). Instructions are entered manually from the
// actual prescription — the app never generates them (FR-16/17, BR-15).
// Edit mode also allows recording a stock receipt (FR-52).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import { useMedicines } from '../store/medicines.js'
import { usePlans } from '../store/plan.js'
import { Button, Field, Loading, ScreenHeader, Select, TextArea, TextInput, Toggle } from '../components/ui.jsx'

const schema = z.object({
  name: z.string().trim().min(1, 'Medicine name is required'),
  strength: z.string().trim(),
  form: z.enum(['Tablet', 'Capsule', 'Liquid', 'Injection', 'Other']),
  stockUnit: z.string().trim().min(1, 'Stock unit is required'),
  doseQuantity: z.coerce.number().positive('Must be at least 1'),
  route: z.enum(['Oral', 'Subcutaneous', 'Topical', 'Inhaled', 'Other']),
  instructions: z.string().trim(),
  times: z.string().trim(),
  lowStockThreshold: z.coerce.number().min(0, 'Cannot be negative'),
  notes: z.string().trim(),
})

export default function MedicineForm() {
  const { medicineId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(medicineId)
  const { status, medicines, save, receive } = useMedicines()
  const { context } = usePlans()
  const [busy, setBusy] = useState(false)
  const [activeOverride, setActiveOverride] = useState(undefined)
  const [error, setError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      strength: '',
      form: 'Tablet',
      stockUnit: 'tablet',
      doseQuantity: 1,
      route: 'Oral',
      instructions: '',
      times: '',
      lowStockThreshold: 10,
      notes: '',
    },
  })

  const existing = isEdit ? medicines.find((m) => m.id === medicineId) : null

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        name: existing.name,
        strength: existing.strength || '',
        form: existing.form || 'Tablet',
        stockUnit: existing.stockUnit || 'tablet',
        doseQuantity: existing.doseQuantity ?? 1,
        route: existing.route || 'Oral',
        instructions: existing.instructions || '',
        times: (existing.times || []).join(', '),
        lowStockThreshold: existing.lowStockThreshold ?? 10,
        notes: existing.notes || '',
      })
    }
  }, [isEdit, existing, reset])

  const active = activeOverride ?? existing?.active ?? true

  if (status === 'loading' || (isEdit && !existing)) return <Loading />

  async function onSubmit(values) {
    setBusy(true)
    setError(null)
    try {
      await save({ ...values, active, id: isEdit ? existing.id : undefined })
      navigate('/plan/meds')
    } catch (err) {
      setError(String(err.message || err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader title={isEdit ? 'Edit medicine' : 'New medicine'} backTo />

        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Medicine name">
            <TextInput placeholder="Metformin" {...register('name')} />
            {errors.name ? <FieldError>{errors.name.message}</FieldError> : null}
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Strength">
              <TextInput placeholder="500 mg" {...register('strength')} />
            </Field>
            <Field label="Form">
              <Select {...register('form')}>
                {['Tablet', 'Capsule', 'Liquid', 'Injection', 'Other'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Stock unit">
            <Select {...register('stockUnit')}>
              {['tablet', 'capsule', 'ml', 'vial', 'ampoule', 'tube', 'bottle'].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          </Field>

          <Field label="Prescribed dose instructions">
            <TextArea
              placeholder="1 tablet after breakfast and 1 tablet after lunch"
              {...register('instructions')}
            />
          </Field>

          <div className="mb-3.5 flex items-start gap-2.5 rounded-md border border-line bg-refused-soft px-3 py-2.5">
            <AlertTriangle className="mt-0.5 size-4 flex-none text-refused" />
            <p className="text-[11px] leading-relaxed text-ink-2">
              <b className="text-ink">Enter from the actual prescription.</b> Sathi does
              not prescribe, diagnose or modify instructions. Copy exactly from the
              verified clinical instruction.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Dose quantity">
              <TextInput type="number" min="1" step="0.5" {...register('doseQuantity')} />
              {errors.doseQuantity ? <FieldError>{errors.doseQuantity.message}</FieldError> : null}
            </Field>
            <Field label="Route">
              <Select {...register('route')}>
                {['Oral', 'Subcutaneous', 'Topical', 'Inhaled', 'Other'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Dose times" hint="comma separated, 24h">
            <TextInput placeholder="08:00, 13:00, 21:00" {...register('times')} />
          </Field>

          <Field label="Low-stock threshold">
            <TextInput type="number" min="0" {...register('lowStockThreshold')} />
          </Field>

          <Field label="General notes" hint="optional">
            <TextArea placeholder="Take with water" {...register('notes')} />
          </Field>

          {isEdit ? (
            <div className="mb-4 flex items-center justify-between rounded-md border border-line bg-card px-3.5 py-3">
              <div className="pr-3">
                <div className="text-[13px] font-semibold">Active</div>
                <div className="text-[11px] leading-relaxed text-muted">
                  Inactive medicines stay in history but won't appear as current
                </div>
              </div>
              <Toggle checked={active} onChange={setActiveOverride} label="Active" />
            </div>
          ) : null}

          {isEdit ? (
            <ReceiveStock
              medicine={existing}
              locations={context?.locations || []}
              onReceive={receive}
            />
          ) : null}

          {error ? <p className="mb-3 text-xs font-semibold text-missed">{error}</p> : null}

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 basis-1/3"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save medicine' : 'Add medicine'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FieldError({ children }) {
  return <p className="mt-1 text-[11px] font-semibold text-missed">{children}</p>
}

function ReceiveStock({ medicine, locations, onReceive }) {
  const [quantity, setQuantity] = useState('30')
  const [locationName, setLocationName] = useState(locations[0]?.name || 'Dhaka')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReceive() {
    const qty = Number(quantity)
    if (!qty || qty <= 0) return
    setBusy(true)
    try {
      await onReceive(medicine.id, qty, locationName)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 rounded-md border border-line bg-app p-3.5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
        Record stock receipt
      </div>
      <div className="flex gap-2">
        <TextInput
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20"
          aria-label="Receipt quantity"
        />
        <Select
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          aria-label="Receipt location"
          className="flex-1"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.name}>
              {location.name}
            </option>
          ))}
        </Select>
        <Button type="button" size="sm" onClick={handleReceive} disabled={busy}>
          {busy ? '…' : done ? 'Added' : 'Add'}
        </Button>
      </div>
      <p className="mt-1.5 text-[10.5px] text-muted">
        Purchases increase stock only when receipt is recorded (BR-06).
      </p>
    </div>
  )
}