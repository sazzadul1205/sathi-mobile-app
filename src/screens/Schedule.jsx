import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, X, Ban, HelpCircle, Pencil } from "lucide-react";
import { getPlanDb, usePlans } from "../store/plan.js";
import { useMedicines } from "../store/medicines.js";
import { useSession } from "../store/session.js";
import { correctDose, listSlots, recordOutcome } from "../lib/repo/schedule.js";
import {
  Button,
  EmptyState,
  Loading,
  Select,
  StatusPill,
  TextArea,
  TextInput,
} from "../components/ui.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "given", label: "Given" },
  { id: "missed", label: "Missed" },
];

function mealLabel(rel) {
  if (rel === "before") return "before eating";
  if (rel === "after") return "after eating";
  if (rel === "with") return "with food";
  return "";
}

export default function Schedule() {
  const { currentPlanId, context } = usePlans();
  const { load: loadMedicines } = useMedicines();
  const { profile } = useSession();
  const [slots, setSlots] = useState(null);
  const [filter, setFilter] = useState("all");
  const [busySlot, setBusySlot] = useState(null);
  const [correcting, setCorrecting] = useState(null);
  const [correctForm, setCorrectForm] = useState({
    outcome: "given",
    reason: "",
    notes: "",
  });
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!currentPlanId) return;
    const db = await getPlanDb(currentPlanId);
    await loadMedicines();
    const medicines = (
      await import("../store/medicines.js")
    ).useMedicines.getState().medicines;
    setSlots(
      await listSlots(db, {
        medicines,
        patient: usePlans.getState().context?.patient,
      }),
    );
  }, [currentPlanId, loadMedicines]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setSlots([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const recordedBy = profile?.id || "device";

  async function record(slot, outcome) {
    const db = await getPlanDb(currentPlanId);
    setBusySlot(slot.id);
    setError(null);
    try {
      await recordOutcome(db, {
        slot,
        outcome,
        recordedBy,
        planId: currentPlanId,
      });
      await refresh();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusySlot(null);
    }
  }

  async function submitCorrection(slot) {
    const db = await getPlanDb(currentPlanId);
    setError(null);
    try {
      await correctDose(db, {
        slot,
        outcome: correctForm.outcome,
        reason: correctForm.reason,
        notes: correctForm.notes,
        recordedBy,
        planId: currentPlanId,
      });
      setCorrecting(null);
      setCorrectForm({ outcome: "given", reason: "", notes: "" });
      await refresh();
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  const groups = useMemo(() => {
    if (!slots) return null;
    const filtered = slots.filter((slot) => {
      if (filter === "pending") return !slot.outcome;
      if (filter === "all") return true;
      return slot.outcome === filter;
    });
    return [
      { label: "Morning", slots: filtered.filter((s) => s.time < "12:00") },
      {
        label: "Afternoon",
        slots: filtered.filter((s) => s.time >= "12:00" && s.time < "17:00"),
      },
      { label: "Evening", slots: filtered.filter((s) => s.time >= "17:00") },
    ].filter((group) => group.slots.length > 0);
  }, [slots, filter]);

  if (!slots || !context) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-2 pb-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Schedule</h2>
          <div className="mt-0.5 text-xs text-muted">
            {context.patient?.name} · {format(new Date(), "EEEE, d MMMM")}
          </div>
        </div>
      </div>

      <div className="chips mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`flex-none rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === chip.id
                ? "border-brand bg-brand text-white"
                : "border-line bg-card text-ink-2"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-3 rounded-md bg-missed-soft px-3 py-2 text-xs font-semibold text-missed">
          {error}
        </p>
      ) : null}

      {groups && groups.length ? (
        groups.map((group) => (
          <div key={group.label}>
            <h3 className="mt-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              {group.label}
            </h3>
            <div className="rounded-lg border border-line bg-card px-3.5">
              {group.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="border-b border-line-2 py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 flex-none text-center">
                      <div className="text-[11px] font-bold text-ink-2 tabular-nums">
                        {slot.time}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">
                        {slot.medicineName} {slot.strength}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {slot.doseQuantity} {slot.stockUnit}
                        {mealLabel(slot.mealRelation)
                          ? ` · ${mealLabel(slot.mealRelation)}`
                          : ""}
                        {slot.instructions ? ` · ${slot.instructions}` : ""}
                      </div>
                    </div>
                    {slot.outcome ? (
                      <StatusPill tone={slot.outcome}>
                        {slot.outcome}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="pending">Pending</StatusPill>
                    )}
                  </div>

                  {slot.outcome ? (
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setCorrecting(
                            correcting?.id === slot.id
                              ? null
                              : { ...slot, record: slot.record },
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand"
                      >
                        <Pencil className="size-3" />
                        {correcting?.id === slot.id
                          ? "Cancel correction"
                          : "Correct"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      <OutcomeButton
                        label="Given"
                        icon={Check}
                        tone="given"
                        busy={busySlot === slot.id}
                        onClick={() => record(slot, "given")}
                      />
                      <OutcomeButton
                        label="Missed"
                        icon={X}
                        tone="missed"
                        busy={busySlot === slot.id}
                        onClick={() => record(slot, "missed")}
                      />
                      <OutcomeButton
                        label="Refused"
                        icon={Ban}
                        tone="refused"
                        busy={busySlot === slot.id}
                        onClick={() => record(slot, "refused")}
                      />
                      <OutcomeButton
                        label="Other"
                        icon={HelpCircle}
                        tone="other"
                        busy={busySlot === slot.id}
                        onClick={() => record(slot, "other")}
                      />
                    </div>
                  )}

                  {correcting?.id === slot.id ? (
                    <div className="mt-2.5 rounded-md border border-line bg-app p-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                        Correcting record — original stays in history
                      </div>
                      <Select
                        value={correctForm.outcome}
                        onChange={(e) =>
                          setCorrectForm({
                            ...correctForm,
                            outcome: e.target.value,
                          })
                        }
                        aria-label="Corrected outcome"
                        className="mb-2 py-2 text-xs"
                      >
                        {["given", "missed", "refused", "other"].map(
                          (option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ),
                        )}
                      </Select>
                      <TextInput
                        value={correctForm.reason}
                        onChange={(e) =>
                          setCorrectForm({
                            ...correctForm,
                            reason: e.target.value,
                          })
                        }
                        placeholder="Reason (required)"
                        aria-label="Correction reason"
                        className="mb-2 py-2 text-xs"
                      />
                      <TextArea
                        value={correctForm.notes}
                        onChange={(e) =>
                          setCorrectForm({
                            ...correctForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Notes (optional)"
                        aria-label="Correction notes"
                        className="mb-2 min-h-16 py-2 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => submitCorrection(correcting)}
                      >
                        Save correction
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : slots.length ? (
        <EmptyState
          title="Nothing matches this filter"
          hint="Try a different filter to see other doses."
        />
      ) : (
        <EmptyState
          title="No doses scheduled today"
          hint="Add medicines with dose times from the Meds tab."
        />
      )}

      <p className="mt-3 rounded-md border border-dashed border-line bg-app px-3.5 py-2.5 text-[11px] leading-relaxed text-muted">
        A scheduled dose is not proof that it was taken. Recording is always a
        separate action.
      </p>
    </div>
  );
}

const OUTCOME_STYLES = {
  given: "border-given-soft bg-given-soft text-given",
  missed: "border-missed-soft bg-missed-soft text-missed",
  refused: "border-refused-soft bg-refused-soft text-refused",
  other: "border-other-soft bg-other-soft text-other",
};

function OutcomeButton({ label, icon: Icon, tone, busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex flex-col items-center gap-1 rounded-md border py-2 text-[10.5px] font-bold transition-opacity disabled:opacity-40 ${OUTCOME_STYLES[tone]}`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
