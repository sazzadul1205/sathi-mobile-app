import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertTriangle, Clock, Plus, Trash2 } from "lucide-react"
import { useMedicines } from "../store/medicines.js"
import { usePlans } from "../store/plan.js"
import { Button, Field, Loading, ScreenHeader, Select, TextArea, TextInput, Toggle } from "../components/ui.jsx"

const schema = z.object({
  name: z.string().trim().min(1, "Medicine name is required"),
  strength: z.string().trim(),
  form: z.enum(["Tablet", "Capsule", "Liquid", "Injection", "Other"]),
  stockUnit: z.string().trim().min(1, "Stock unit is required"),
  route: z.enum(["Oral", "Subcutaneous", "Topical", "Inhaled", "Other"]),
  instructions: z.string().trim(),
  lowStockThreshold: z.coerce.number().min(0, "Cannot be negative"),
  notes: z.string().trim(),
})

function defaultSlot(stockUnit = "tablet") {
  return { time: "", quantity: 1, mealRelation: "", unit: stockUnit }
}

export default function MedicineForm() {
  const { medicineId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(medicineId)
  const { status, medicines, save, receive } = useMedicines()
  const { context } = usePlans()
  const [busy, setBusy] = useState(false)
  const [activeOverride, setActiveOverride] = useState(undefined)
  const [error, setError] = useState(null)
  const [doseTimes, setDoseTimes] = useState([defaultSlot()])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      strength: "",
      form: "Tablet",
      stockUnit: "tablet",
      route: "Oral",
      instructions: "",
      lowStockThreshold: 10,
      notes: "",
    },
  })

  const stockUnit = watch("stockUnit") || "tablet"
  const existing = isEdit ? medicines.find((m) => m.id === medicineId) : null

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        name: existing.name,
        strength: existing.strength || "",
        form: existing.form || "Tablet",
        stockUnit: existing.stockUnit || "tablet",
        route: existing.route || "Oral",
        instructions: existing.instructions || "",
        lowStockThreshold: existing.lowStockThreshold ?? 10,
        notes: existing.notes || "",
      })
      const times = (existing.times || []).map((t) =>
        typeof t === "string"
          ? { time: t, quantity: existing.doseQuantity ?? 1, mealRelation: "" }
          : {
              time: t?.time || "",
              quantity: Number(t?.quantity) > 0 ? Number(t.quantity) : (existing.doseQuantity ?? 1),
              mealRelation: t?.mealRelation || "",
            },
      )
      setDoseTimes(times.length ? times.sort((a, b) => (a.time > b.time ? 1 : -1)) : [defaultSlot(existing.stockUnit || "tablet")])
    }
  }, [isEdit, existing, reset])

  const active = activeOverride ?? existing?.active ?? true

  if (status === "loading" || (isEdit && !existing)) return <Loading />

  function updateSlot(index, patch) {
    setDoseTimes((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addTime() {
    setDoseTimes((prev) => [...prev, defaultSlot(stockUnit)])
  }

  function removeTime(index) {
    setDoseTimes((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length ? next : [defaultSlot(stockUnit)]
    })
  }

  async function onSubmit(values) {
    setBusy(true)
    setError(null)
    try {
      const times = doseTimes
        .filter((t) => t.time)
        .map((t) => ({
          time: t.time,
          quantity: Number(t.quantity) > 0 ? Number(t.quantity) : 1,
          mealRelation: t.mealRelation || "",
        }))
      if (!times.length) {
        setError("Add at least one dose time.")
        setBusy(false)
        return
      }
      const doseQuantity = times[0]?.quantity || 1
      await save({ ...values, doseQuantity, times, active, id: isEdit ? existing.id : undefined })
      navigate("/plan/meds")
    } catch (err) {
      setError(String(err.message || err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader title={isEdit ? "Edit medicine" : "New medicine"} backTo />

        <form onSubmit={handleSubmit(onSubmit)}>
          <Field label="Medicine name">
            <TextInput placeholder="Metformin" {...register("name")} />
            {errors.name ? <FieldError>{errors.name.message}</FieldError> : null}
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Strength">
              <TextInput placeholder="500 mg" {...register("strength")} />
            </Field>
            <Field label="Form">
              <Select {...register("form")}>
                {["Tablet", "Capsule", "Liquid", "Injection", "Other"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Stock unit">
            <Select {...register("stockUnit")}>
              {["tablet", "capsule", "ml", "vial", "ampoule", "tube", "bottle"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          </Field>

          <Field label="Prescribed dose instructions">
            <TextArea
              placeholder="e.g. Morning 2 tablets after breakfast, night 1 tablet before sleep"
              {...register("instructions")}
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

          <Field label="Route">
            <Select {...register("route")}>
              {["Oral", "Subcutaneous", "Topical", "Inhaled", "Other"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          </Field>

          <div className="mb-3.5 block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              <Clock className="size-3.5" /> Dose schedule
              <span className="font-medium normal-case tracking-normal text-muted">(time, amount, before/after eating)</span>
            </span>
            <div className="space-y-2.5">
              {doseTimes.map((slot, index) => (
                <div key={index} className="rounded-md border border-line bg-card p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Dose {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeTime(index)}
                      aria-label={`Remove dose ${index + 1}`}
                      className="grid size-8 place-items-center rounded-md border border-line bg-app text-muted transition-colors hover:text-missed disabled:opacity-40"
                      disabled={doseTimes.length === 1}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Time">
                      <TextInput
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateSlot(index, { time: e.target.value })}
                        aria-label={`Dose time ${index + 1}`}
                      />
                    </Field>
                    <Field label={`Quantity (${stockUnit})`}>
                      <TextInput
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={slot.quantity}
                        onChange={(e) => updateSlot(index, { quantity: e.target.value })}
                        aria-label={`Dose quantity ${index + 1}`}
                      />
                    </Field>
                  </div>
                  <Field label="Meal timing">
                    <Select
                      value={slot.mealRelation}
                      onChange={(e) => updateSlot(index, { mealRelation: e.target.value })}
                      aria-label={`Meal timing ${index + 1}`}
                    >
                      <option value="">Not specified</option>
                      <option value="before">Before eating</option>
                      <option value="after">After eating</option>
                      <option value="with">With food</option>
                    </Select>
                  </Field>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-2 w-auto" onClick={addTime}>
              <Plus className="size-3.5" /> Add dose time
            </Button>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              Add as many times as needed (each can have different quantity and before/after eating). Times are saved in 24-hour format and sorted.
            </p>
          </div>

          <Field label="Low-stock threshold">
            <TextInput type="number" min="0" {...register("lowStockThreshold")} />
          </Field>

          <Field label="General notes" hint="optional">
            <TextArea placeholder="Take with water" {...register("notes")} />
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
              {busy ? "Saving…" : isEdit ? "Save medicine" : "Add medicine"}
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
  const [quantity, setQuantity] = useState("30")
  const [locationName, setLocationName] = useState(locations[0]?.name || "Dhaka")
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
          {busy ? "…" : done ? "Added" : "Add"}
        </Button>
      </div>
      <p className="mt-1.5 text-[10.5px] text-muted">
        Purchases increase stock only when receipt is recorded (BR-06).
      </p>
    </div>
  )
}
