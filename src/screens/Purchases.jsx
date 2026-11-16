import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlanDb, usePlans } from "../store/plan.js";
import { useSession } from "../store/session.js";
import { listPurchases, savePurchase } from "../lib/repo/purchases.js";
import {
  Button,
  Field,
  Loading,
  ScreenHeader,
  Select,
  StatusPill,
  TextInput,
} from "../components/ui.jsx";

export default function Purchases() {
  const { currentPlanId } = usePlans();
  const { profile } = useSession();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({
    medicineName: "",
    quantity: "30",
    estimatedCost: "",
    status: "planned",
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!currentPlanId) return;
    const db = await getPlanDb(currentPlanId);
    setItems(await listPurchases(db));
  }, [currentPlanId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentPlanId) return;
      const db = await getPlanDb(currentPlanId);
      const data = await listPurchases(db);
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPlanId, load]);

  async function add(e) {
    e.preventDefault();
    if (!form.medicineName.trim()) return;
    setBusy(true);
    const db = await getPlanDb(currentPlanId);
    await savePurchase(db, form, {
      planId: currentPlanId,
      recordedBy: profile?.id || "device",
    });
    setForm({
      medicineName: "",
      quantity: "30",
      estimatedCost: "",
      status: "planned",
    });
    setBusy(false);
    await load();
  }

  if (!items) return <Loading />;
  return (
    <div>
      <ScreenHeader
        title="Purchases"
        subtitle={`${items.length} record${items.length === 1 ? "" : "s"}`}
        backTo
      />
      <form
        onSubmit={add}
        className="mb-4 rounded-lg border border-line bg-card p-4 shadow-1"
      >
        <Field label="Medicine">
          <TextInput
            value={form.medicineName}
            onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
            placeholder="Medicine name"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Quantity">
            <TextInput
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {["planned", "ordered", "received", "cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Estimated cost" hint="optional">
          <TextInput
            value={form.estimatedCost}
            onChange={(e) =>
              setForm({ ...form, estimatedCost: e.target.value })
            }
            placeholder="e.g. ৳240"
          />
        </Field>
        <Button type="submit" disabled={busy || !form.medicineName.trim()}>
          {busy ? "Saving…" : "Add purchase"}
        </Button>
      </form>
      <div className="space-y-2">
        {items.map((p) => (
          <Link
            key={p.id}
            to={`/plan/purchases/${p.id}`}
            className="block rounded-lg border border-line bg-card p-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{p.medicineName}</div>
              <StatusPill
                tone={
                  p.status === "received"
                    ? "ok"
                    : p.status === "cancelled"
                      ? "missed"
                      : "pending"
                }
              >
                {p.status}
              </StatusPill>
            </div>
            <div className="mt-1 text-xs text-muted">
              Qty {p.quantity}
              {p.estimatedCost ? ` · ${p.estimatedCost}` : ""}
            </div>
          </Link>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-muted">
            No purchases yet. Planned/ordered purchases do not increase stock
            until receipt is recorded (BR-06).
          </p>
        ) : null}
      </div>
    </div>
  );
}
