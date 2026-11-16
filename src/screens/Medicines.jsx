import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Plus, Copy, Trash2, Layers } from "lucide-react";
import { useMedicines } from "../store/medicines.js";
import { usePlans } from "../store/plan.js";
import {
  listMedicineTemplates,
  saveMedicineTemplate,
  deleteMedicineTemplate,
} from "../lib/repo/medicineTemplates.js";
import {
  confirmDialog,
  alertError,
  alertSuccess,
  alertInfo,
} from "../lib/swal.js";
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Loading,
  StatusPill,
  TextInput,
} from "../components/ui.jsx";

function formatTimes(times) {
  if (!times?.length) return "";
  return times
    .map((t) => (typeof t === "string" ? t : t?.time))
    .filter(Boolean)
    .join(", ");
}

function mealShort(rel) {
  if (rel === "before") return "before food";
  if (rel === "after") return "after food";
  if (rel === "with") return "with food";
  return "";
}

export default function Medicines() {
  const { status, medicines, stock, lowStock, save } = useMedicines();
  const { context } = usePlans();
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateMsg, setTemplateMsg] = useState(null);
  const [templateError, setTemplateError] = useState(null);

  async function loadTemplates() {
    setTemplates(await listMedicineTemplates());
  }

  useEffect(() => {
    let cancelled = false;
    listMedicineTemplates().then((list) => {
      if (!cancelled) setTemplates(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") return <Loading />;

  async function handleSaveTemplate(e) {
    e.preventDefault();
    setTemplateBusy(true);
    setTemplateError(null);
    setTemplateMsg(null);
    try {
      await saveMedicineTemplate({ name: templateName, medicines });
      setTemplateName("");
      await alertSuccess(
        "Template saved",
        "Template saved from current medicines.",
      );
      await loadTemplates();
    } catch (err) {
      await alertError("Could not save template", String(err.message || err));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleApplyTemplate(template) {
    const ok = await confirmDialog({
      title: "Add medicines from template?",
      text: `Add all medicines from "${template.name}" to this plan? Existing medicines with the same name and strength will be skipped.`,
      confirmButtonText: "Add all",
      icon: "question",
    });
    if (!ok) return;
    setTemplateBusy(true);
    setTemplateError(null);
    setTemplateMsg(null);
    try {
      const existingKeys = new Set(
        medicines.map(
          (m) =>
            `${(m.name || "").toLowerCase()}|${(m.strength || "").toLowerCase()}`,
        ),
      );
      let added = 0;
      for (const med of template.medicines || []) {
        const key = `${(med.name || "").toLowerCase()}|${(med.strength || "").toLowerCase()}`;
        if (existingKeys.has(key)) continue;
        await save({ ...med, id: undefined });
        existingKeys.add(key);
        added += 1;
      }
      if (added)
        await alertSuccess(
          "Medicines added",
          `Added ${added} medicine${added === 1 ? "" : "s"} from "${template.name}".`,
        );
      else
        await alertInfo(
          "No medicines added",
          `No new medicines added from "${template.name}" (all already exist).`,
        );
    } catch (err) {
      await alertError("Could not add medicines", String(err.message || err));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleDeleteTemplate(id) {
    const target = templates.find((t) => t.id === id);
    const ok = await confirmDialog({
      title: "Delete template?",
      text: target
        ? `Delete template "${target.name}"?`
        : "Delete this template?",
      confirmButtonText: "Delete",
      icon: "warning",
    });
    if (!ok) return;
    setTemplateError(null);
    setTemplateMsg(null);
    await deleteMedicineTemplate(id);
    await loadTemplates();
    await alertSuccess("Template deleted");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-2 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Medicines</h2>
          <div className="mt-0.5 text-xs text-muted">
            {medicines.length} active
            {lowStock.length ? ` · ${lowStock.length} low stock` : ""}
          </div>
        </div>
        <Link to="/plan/meds/new" aria-label="Add medicine">
          <IconButton
            label="Add medicine"
            className="border-brand bg-brand text-white hover:opacity-90"
          >
            <Plus className="size-4" />
          </IconButton>
        </Link>
      </div>

      <Card className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Layers className="size-4 text-brand" />
          <div className="text-sm font-bold">Medicine templates</div>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-muted">
          Save your current medicines as a template, then add all medicines from
          a template in one click. Existing medicines with the same name and
          strength are skipped.
        </p>

        <form
          onSubmit={handleSaveTemplate}
          className="mb-3 flex gap-2 items-end"
        >
          <div className="flex-1">
            <Field label="Template name">
              <TextInput
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Daily home medicines"
                aria-label="Template name"
              />
            </Field>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={
              templateBusy || !templateName.trim() || medicines.length === 0
            }
            className="mb-3.5 w-auto flex-none"
          >
            Save template
          </Button>
        </form>

        {templateError ? (
          <p className="mb-2 text-[11px] font-semibold text-missed">
            {templateError}
          </p>
        ) : null}
        {templateMsg ? (
          <p className="mb-2 text-[11px] font-semibold text-brand">
            {templateMsg}
          </p>
        ) : null}

        {templates.length ? (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-app px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold">
                    {template.name}
                  </div>
                  <div className="text-[11px] text-muted">
                    {template.medicines?.length || 0} medicine
                    {(template.medicines?.length || 0) === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="flex flex-none gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="w-auto px-2.5 py-1.5 text-[11px]"
                    onClick={() => handleApplyTemplate(template)}
                    disabled={templateBusy}
                  >
                    <Copy className="size-3.5" /> Add all
                  </Button>
                  <button
                    type="button"
                    aria-label={`Delete template ${template.name}`}
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={templateBusy}
                    className="grid size-8 place-items-center rounded-md border border-line bg-card text-muted hover:text-missed disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted">
            No templates yet. Add medicines, then save them as a reusable
            template.
          </p>
        )}
      </Card>

      {medicines.length ? (
        medicines.map((medicine) => {
          const medicineStock = stock[medicine.id];
          const locations = context?.locations || [];
          const timeSummary = formatTimes(medicine.times);
          const details = (medicine.times || [])
            .filter(
              (t) =>
                t &&
                typeof t === "object" &&
                (t.mealRelation ||
                  Number(t.quantity) !== Number(medicine.doseQuantity)),
            )
            .map(
              (t) =>
                `${t.time} ${t.quantity ?? medicine.doseQuantity} ${medicine.stockUnit}${mealShort(t.mealRelation) ? ` ${mealShort(t.mealRelation)}` : ""}`,
            );
          return (
            <Link
              key={medicine.id}
              to={`/plan/meds/${medicine.id}`}
              className="mb-2.5 block rounded-lg border border-line bg-card p-3.5 shadow-1 transition-colors hover:bg-app"
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">
                    {medicine.name} {medicine.strength}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {medicine.form} · {medicine.route}
                    {timeSummary ? ` · ${timeSummary}` : ""}
                  </div>
                  {details.length ? (
                    <div className="mt-1 text-[11px] text-muted">
                      {details.join(" · ")}
                    </div>
                  ) : null}
                </div>
                {lowStock.includes(medicine.id) ? (
                  <StatusPill tone="low">Low</StatusPill>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-app p-2">
                {locations.slice(0, 2).map((location) => (
                  <div key={location.id} className="text-center">
                    <div className="text-sm font-bold tabular-nums">
                      {medicineStock?.byLocation?.[location.id] ?? 0}
                    </div>
                    <div className="text-[9.5px] font-semibold uppercase tracking-wider text-muted">
                      {location.name}
                    </div>
                  </div>
                ))}
                <div className="rounded-md bg-card px-1 py-1 text-center">
                  <div className="text-sm font-bold tabular-nums">
                    {medicineStock?.total ?? 0}
                  </div>
                  <div className="text-[9.5px] font-semibold uppercase tracking-wider text-muted">
                    Total
                  </div>
                </div>
              </div>
            </Link>
          );
        })
      ) : (
        <EmptyState
          title="No medicines yet"
          hint="Add the patient's medicines exactly as prescribed — Sathi never generates instructions."
          action={
            <Link to="/plan/meds/new">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-xs font-bold text-white">
                <Plus className="size-3.5" /> Add medicine
              </span>
            </Link>
          }
        />
      )}

      <p className="mt-3 rounded-md border border-dashed border-line bg-app px-3.5 py-2.5 text-[11px] leading-relaxed text-muted">
        Different strengths are separate records. The app never modifies
        prescribed instructions automatically.
      </p>
    </div>
  );
}
