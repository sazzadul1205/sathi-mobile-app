import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlanDb, usePlans } from "../store/plan.js";
import { useMedicines } from "../store/medicines.js";
import { useSession } from "../store/session.js";
import { addMovement } from "../lib/repo/inventory.js";
import {
  Button,
  Field,
  Loading,
  ScreenHeader,
  Select,
  TextArea,
  TextInput,
} from "../components/ui.jsx";

export default function StockAdjust() {
  const navigate = useNavigate();
  const { currentPlanId, context } = usePlans();
  const { status, medicines, load } = useMedicines();
  const { profile } = useSession();
  const [form, setForm] = useState({
    medicineId: "",
    locationId: "",
    quantity: "-1",
    reason: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentPlanId) load();
  }, [currentPlanId, load]);

  const medicineId = form.medicineId || medicines[0]?.id || "";
  const locationId = form.locationId || context?.locations?.[0]?.id || "";

  if (status === "loading" || !context) return <Loading />;

  async function submit(e) {
    e.preventDefault();
    if (!form.reason.trim()) {
      setError("A reason is required for adjustments.");
      return;
    }
    setBusy(true);
    setError(null);
    const db = await getPlanDb(currentPlanId);
    await addMovement(
      db,
      {
        medicineId,
        locationId,
        type: "adjustment",
        quantity: Number(form.quantity) || 0,
        reason: `${form.reason}${form.note ? ` — ${form.note}` : ""}`,
      },
      { planId: currentPlanId, recordedBy: profile?.id || "device" },
    );
    await load();
    setBusy(false);
    navigate("/plan/inventory");
  }

  return (
    <div>
      <ScreenHeader
        title="Adjust / dispose stock"
        subtitle="Reason required · append-only"
        backTo
      />
      <form
        onSubmit={submit}
        className="rounded-lg border border-line bg-card p-4 shadow-1"
      >
        <Field label="Medicine">
          <Select
            value={medicineId}
            onChange={(e) => setForm({ ...form, medicineId: e.target.value })}
          >
            {medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.strength}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Select
            value={locationId}
            onChange={(e) => setForm({ ...form, locationId: e.target.value })}
          >
            {(context.locations || []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity change" hint="negative to reduce">
          <TextInput
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </Field>
        <Field label="Reason">
          <TextInput
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Damaged / expired / correction"
          />
        </Field>
        <Field label="Note">
          <TextArea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>
        {error ? (
          <p className="mb-2 text-xs font-semibold text-missed">{error}</p>
        ) : null}
        <p className="mb-3 text-[11px] text-muted">
          Every adjustment is audited with user, time and reason. History is
          never overwritten (BR-09/FR-41).
        </p>
        <Button type="submit" disabled={busy || medicines.length === 0}>
          {busy ? "Saving…" : "Save adjustment"}
        </Button>
      </form>
      {medicines.length === 0 ? (
        <p className="mt-3 text-xs text-muted">Add a medicine first.</p>
      ) : null}
    </div>
  );
}
