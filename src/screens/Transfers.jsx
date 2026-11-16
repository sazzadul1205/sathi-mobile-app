import { useEffect, useState } from "react";
import { getPlanDb, usePlans } from "../store/plan.js";
import { useSession } from "../store/session.js";
import { listTransfers, saveTransfer } from "../lib/repo/transfers.js";
import {
  Button,
  Card,
  Field,
  Loading,
  ScreenHeader,
  Select,
  StatusPill,
  TextInput,
} from "../components/ui.jsx";

export default function Transfers() {
  const { currentPlanId, context } = usePlans();
  const { profile } = useSession();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({
    medicineName: "",
    quantity: "1",
    sourceName: "",
    destinationName: "",
    status: "preparing",
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!currentPlanId) return;
    const db = await getPlanDb(currentPlanId);
    setItems(await listTransfers(db));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentPlanId) return;
      const db = await getPlanDb(currentPlanId);
      const data = await listTransfers(db);
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPlanId]);

  if (!items || !context) return <Loading />;

  const sourceName = form.sourceName || context.locations[0]?.name || "";
  const destinationName =
    form.destinationName ||
    context.locations[1]?.name ||
    context.locations[0]?.name ||
    "";

  async function add(e) {
    e.preventDefault();
    if (!form.medicineName.trim()) return;
    setBusy(true);
    const db = await getPlanDb(currentPlanId);
    await saveTransfer(
      db,
      { ...form, sourceName, destinationName },
      { planId: currentPlanId, recordedBy: profile?.id || "device" },
    );
    setForm((f) => ({
      ...f,
      medicineName: "",
      quantity: "1",
      status: "preparing",
    }));
    setBusy(false);
    await load();
  }

  return (
    <div>
      <ScreenHeader
        title="Transfers"
        subtitle="Move stock between locations"
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
          <Field label="From">
            <Select
              value={sourceName}
              onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
            >
              {context.locations.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="To">
            <Select
              value={destinationName}
              onChange={(e) =>
                setForm({ ...form, destinationName: e.target.value })
              }
            >
              {context.locations.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
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
              {["preparing", "in_transit", "received", "cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="submit" disabled={busy || !form.medicineName.trim()}>
          {busy ? "Saving…" : "Create transfer"}
        </Button>
      </form>
      <div className="space-y-2">
        {items.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t.medicineName}</div>
              <StatusPill
                tone={
                  t.status === "received"
                    ? "ok"
                    : t.status === "in_transit"
                      ? "transit"
                      : "pending"
                }
              >
                {t.status.replace("_", " ")}
              </StatusPill>
            </div>
            <div className="mt-1 text-xs text-muted">
              {t.quantity} · {t.sourceName} → {t.destinationName}
            </div>
          </Card>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-muted">
            No transfers yet. In-transit quantity is not available at either end
            until receipt is confirmed (FR-60).
          </p>
        ) : null}
      </div>
    </div>
  );
}
