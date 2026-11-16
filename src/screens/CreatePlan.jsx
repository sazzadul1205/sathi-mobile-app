// src/screens/CreatePlan.jsx
// Create a care plan: one patient per plan (BR-01); creator becomes owner.
// Every change is audited (FR-09).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { usePlans } from "../store/plan.js";
import { useSession } from "../store/session.js";
import {
  Button,
  Field,
  Select,
  ScreenHeader,
  TextArea,
  TextInput,
} from "../components/ui.jsx";

const LOCATION_OPTIONS = ["Dhaka", "Cumilla", "Outside these cities"];

export default function CreatePlan() {
  const navigate = useNavigate();
  const { createPlan } = usePlans();
  const { profile } = useSession();
  const [form, setForm] = useState({
    name: "",
    patientName: "",
    location: "Dhaka",
    notes: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.patientName.trim()) {
      setError("Patient name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createPlan({
        name: form.name,
        patientName: form.patientName,
        notes: form.notes,
        location: form.location,
        ownerProfileId: profile.id,
      });
      navigate("/plan", { replace: true });
    } catch (err) {
      setError(String(err.message || err));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ScreenHeader title="New care plan" backTo />

        <form onSubmit={handleSubmit}>
          <Field label="Plan name" hint="optional">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={`e.g. "${form.patientName.trim() || "Abbu"}'s care"`}
            />
          </Field>
          <Field label="Patient name">
            <TextInput
              value={form.patientName}
              onChange={(e) =>
                setForm({ ...form, patientName: e.target.value })
              }
              placeholder="Full name"
              required
              autoFocus
            />
          </Field>
          <Field label="Current location">
            <Select
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            >
              {LOCATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Care notes" hint="optional">
            <TextArea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Existing conditions, allergies, important context…"
            />
          </Field>

          <div className="mb-4 flex items-start gap-2.5 rounded-md border border-line bg-card px-3.5 py-3">
            <ShieldCheck className="mt-0.5 size-4 flex-none text-brand" />
            <p className="text-xs leading-relaxed text-ink-2">
              <b className="text-ink">You will be the owner.</b> You can invite
              family members and caregivers after creating the plan. Patient
              data stays on this device until care-coordination servers are
              connected.
            </p>
          </div>

          {error ? (
            <p className="mb-3 text-xs font-semibold text-missed">{error}</p>
          ) : null}

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
              {busy ? "Creating…" : "Create plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
