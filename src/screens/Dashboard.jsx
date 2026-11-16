import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeftRight,
  ClipboardList,
  MapPin,
  Pill,
  ShoppingCart,
  Stethoscope,
} from "lucide-react";
import { usePlans, getPlanDb } from "../store/plan.js";
import { useMedicines } from "../store/medicines.js";
import { listSlots } from "../lib/repo/schedule.js";
import { makeCollection } from "../lib/db/index.js";
import {
  Button,
  Card,
  Loading,
  StatusPill,
  SyncStrip,
} from "../components/ui.jsx";

export default function Dashboard() {
  const { context, currentPlanId } = usePlans();
  const { status, medicines, stock, lowStock, load } = useMedicines();
  const [slots, setSlots] = useState(null);
  const [pendingSync, setPendingSync] = useState(0);

  const refresh = useCallback(async () => {
    if (!currentPlanId) return;
    await load();
    const db = await getPlanDb(currentPlanId);
    const today = await listSlots(db, {
      medicines: useMedicines.getState().medicines,
      patient: usePlans.getState().context?.patient,
    });
    setSlots(today);
    const queue = await makeCollection(db, "syncQueue").count();
    setPendingSync(queue);
  }, [currentPlanId, load]);

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

  if (!context || status === "loading" || !slots) return <Loading />;

  const given = slots.filter((slot) => slot.outcome === "given").length;
  const missed = slots.filter((slot) => slot.outcome === "missed").length;
  const remaining = slots.filter((slot) => !slot.outcome).length;
  const upcoming = slots.filter((slot) => !slot.outcome).slice(0, 4);
  const lowStockMedicines = medicines.filter((m) => lowStock.includes(m.id));

  return (
    <div>
      <div className="pb-3 text-xs text-muted">
        {format(new Date(), "EEEE, d MMMM")}
      </div>
      <SyncStrip pending={pendingSync} />

      <Link
        to="/plan/patient"
        className="relative mb-3 block overflow-hidden rounded-xl bg-linear-to-br from-brand-gradient-from to-brand-gradient-to p-4.5 text-white shadow-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Active care plan
            </div>
            <h3 className="mt-1 text-xl font-bold tracking-tight">
              {context.patient?.name}
            </h3>
            <div className="text-xs text-white/75">
              {(context.patient?.notes || "No care notes yet").slice(0, 60)}
            </div>
          </div>
          <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10.5px] font-bold">
            {context.role}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-white/15 pt-2.5 text-[11.5px] text-white/80">
          <MapPin className="size-3.5 opacity-80" />
          Currently in {context.patient?.location} · tap for patient profile
        </div>
      </Link>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <SummaryTile tone="given" value={given} label="Given" />
        <SummaryTile tone="refused" value={remaining} label="Remaining" />
        <SummaryTile tone="missed" value={missed} label="Missed" />
      </div>

      <Card className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold">Upcoming doses</h3>
          <Link
            to="/plan/schedule"
            className="text-xs font-semibold text-brand"
          >
            Full schedule
          </Link>
        </div>
        {upcoming.length ? (
          upcoming.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-3 border-b border-line-2 py-2.5 last:border-0"
            >
              <div className="w-12 flex-none text-center text-[11px] font-bold text-ink-2 tabular-nums">
                {slot.time}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">
                  {slot.medicineName} {slot.strength}
                </div>
                <div className="truncate text-[11.5px] text-muted">
                  {slot.doseQuantity} {slot.stockUnit}
                  {slot.instructions ? ` · ${slot.instructions}` : ""}
                </div>
              </div>
              <StatusPill tone="pending">Pending</StatusPill>
            </div>
          ))
        ) : (
          <p className="py-2 text-xs text-muted">
            {slots.length
              ? "All doses recorded for today."
              : "No doses scheduled today."}
          </p>
        )}
      </Card>

      <div className="mb-3 grid grid-cols-4 gap-2">
        <QuickAction
          to="/plan/schedule"
          icon={Stethoscope}
          label="Record"
          tone="given"
        />
        <QuickAction
          to="/plan/inventory"
          icon={ClipboardList}
          label="Inventory"
          tone="other"
        />
        <QuickAction
          to="/plan/transfers"
          icon={ArrowLeftRight}
          label="Transfer"
          tone="transit"
        />
        <QuickAction
          to="/plan/purchases"
          icon={ShoppingCart}
          label="Purchase"
          tone="refused"
        />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Link
          to="/plan/members"
          className="rounded-md border border-line bg-card px-2 py-2.5 text-center text-[10.5px] font-semibold text-ink-2"
        >
          Members
        </Link>
        <Link
          to="/plan/notifications"
          className="rounded-md border border-line bg-card px-2 py-2.5 text-center text-[10.5px] font-semibold text-ink-2"
        >
          Activity
        </Link>
        <Link
          to="/plan/sync"
          className="rounded-md border border-line bg-card px-2 py-2.5 text-center text-[10.5px] font-semibold text-ink-2"
        >
          Sync
        </Link>
      </div>

      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
        Alerts
      </h3>
      {lowStockMedicines.length ? (
        lowStockMedicines.map((medicine) => (
          <div
            key={medicine.id}
            className="mb-2 flex items-start gap-2.5 rounded-md border border-line bg-card px-3.5 py-3"
          >
            <span className="grid size-8 flex-none place-items-center rounded-lg bg-refused-soft text-refused">
              <Pill className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">
                Low stock · {medicine.name} {medicine.strength}
              </div>
              <div className="text-[11.5px] leading-relaxed text-muted">
                {stock[medicine.id]?.total ?? 0} {medicine.stockUnit}s left
                (threshold {medicine.lowStockThreshold}).
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="pb-2 text-xs text-muted">No low-stock alerts.</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to="/plan/audit">
          <Button variant="secondary" type="button">
            Audit history
          </Button>
        </Link>
        <Link to="/plan/notification-preferences">
          <Button variant="secondary" type="button">
            Notif. prefs
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SummaryTile({ tone, value, label }) {
  return (
    <div className="rounded-md border border-line bg-card px-2 py-3 text-center">
      <div
        className={`text-xl font-bold tabular-nums tracking-tight ${tone === "given" ? "text-given" : tone === "missed" ? "text-missed" : "text-refused"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone, disabled }) {
  const tones = {
    given: "bg-given-soft text-given",
    other: "bg-other-soft text-other",
    transit: "bg-transit-soft text-transit",
    refused: "bg-refused-soft text-refused",
  };
  const content = (
    <>
      <span
        className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}
      >
        <Icon className="size-4" />
      </span>
      <span>{label}</span>
    </>
  );
  if (disabled)
    return (
      <span className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-md border border-line bg-card px-1 py-3 text-[10.5px] font-semibold text-muted opacity-60">
        {content}
      </span>
    );
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-md border border-line bg-card px-1 py-3 text-[10.5px] font-semibold text-ink-2 transition-colors hover:bg-app"
    >
      {content}
    </Link>
  );
}
