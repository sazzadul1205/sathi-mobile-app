import { useEffect, useState } from "react";
import { getPlanDb, usePlans } from "../store/plan.js";
import { listAudit } from "../lib/repo/schedule.js";
import { Card, Loading, ScreenHeader } from "../components/ui.jsx";

export default function AuditHistory() {
  const { currentPlanId } = usePlans();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentPlanId) return;
      const db = await getPlanDb(currentPlanId);
      const data = await listAudit(db, { limit: 50 });
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPlanId]);

  if (!items) return <Loading />;
  return (
    <div>
      <ScreenHeader
        title="Audit history"
        subtitle="Traceable care and access changes"
        backTo
      />
      <div className="space-y-2">
        {items.map((a) => (
          <Card key={a.id}>
            <div className="text-sm font-bold">{a.action}</div>
            <div className="mt-0.5 text-xs text-muted">
              {a.entityType} · {a.detail || "—"}
            </div>
            <div className="mt-1 text-[11px] text-muted">
              {new Date(a.createdAt).toLocaleString()}
            </div>
          </Card>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-muted">No audit entries yet.</p>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Audit records are append-only and show actor/time/summary. Credentials
        and secrets are never exposed (SR-09/10).
      </p>
    </div>
  );
}
