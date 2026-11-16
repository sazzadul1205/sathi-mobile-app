import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Medicines from "./Medicines.jsx";
import { useMedicines } from "../store/medicines.js";
import { usePlans } from "../store/plan.js";
import { findLowStock, stockByMedicine } from "../lib/repo/inventory.js";
import { resetAppDb, resetStores, seedPlan } from "../test/seed.js";

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(async () => ({ isConfirmed: true })),
  },
}));

beforeEach(async () => {
  await resetAppDb();
  resetStores();
});

function renderMedicines() {
  return render(
    <MemoryRouter>
      <Medicines />
    </MemoryRouter>,
  );
}

describe("Medicines", () => {
  it("shows the empty state when there are no medicines", async () => {
    usePlans.setState({
      ...usePlans.getState(),
      context: { patient: { name: "Rahim Mia" }, locations: [], role: "owner" },
    });
    useMedicines.setState({
      status: "ready",
      medicines: [],
      stock: {},
      lowStock: [],
      error: null,
    });

    renderMedicines();

    expect(screen.getByText("No medicines yet")).toBeInTheDocument();
    expect(await screen.findByText(/No templates yet/i)).toBeInTheDocument();
  });

  it("renders medicines with per-location stock and a low-stock flag", async () => {
    const { context, db, medicines } = await seedPlan({
      medicines: [
        { name: "Metformin", strength: "500 mg", lowStockThreshold: 10 },
        { name: "Amlodipine", strength: "5 mg", lowStockThreshold: 2 },
      ],
    });

    const stockMap = await stockByMedicine(db);
    const stock = Object.fromEntries(
      [...stockMap].map(([id, entry]) => [
        id,
        {
          byLocation: Object.fromEntries(entry.byLocation),
          total: entry.total,
        },
      ]),
    );
    const lowStock = findLowStock(medicines, stockMap).map((m) => m.id);

    usePlans.setState({ ...usePlans.getState(), context, status: "ready" });
    useMedicines.setState({
      status: "ready",
      medicines,
      stock,
      lowStock,
      error: null,
      save: vi.fn(),
    });

    renderMedicines();

    expect(screen.getByText(/2 active/)).toBeInTheDocument();
    expect(screen.getByText(/Metformin 500 mg/)).toBeInTheDocument();
    expect(screen.getByText(/Amlodipine 5 mg/)).toBeInTheDocument();
    expect(screen.getAllByText("Low").length).toBeGreaterThan(0);
    expect(await screen.findByText(/No templates yet/i)).toBeInTheDocument();

    db.close();
  });

  it("saves a template and adds all medicines from it in one click", async () => {
    const save = vi.fn(async () => {});
    const meds = [
      {
        id: "m1",
        name: "Metformin",
        strength: "500 mg",
        form: "Tablet",
        route: "Oral",
        stockUnit: "tablet",
        doseQuantity: 1,
        lowStockThreshold: 10,
        times: [{ time: "08:00", quantity: 1, mealRelation: "" }],
      },
    ];
    usePlans.setState({
      ...usePlans.getState(),
      context: { patient: { name: "Rahim Mia" }, locations: [], role: "owner" },
    });
    useMedicines.setState({
      status: "ready",
      medicines: meds,
      stock: {},
      lowStock: [],
      error: null,
      save,
    });

    renderMedicines();

    await screen.findByText(/No templates yet/i);
    fireEvent.change(screen.getByLabelText("Template name"), {
      target: { value: "Daily" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));
    expect(await screen.findByText("Daily")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add all/i }));
    await waitFor(() => expect(screen.getByText("Daily")).toBeInTheDocument());
    expect(save).not.toHaveBeenCalled();

    useMedicines.setState({
      status: "ready",
      medicines: [],
      stock: {},
      lowStock: [],
      error: null,
      save,
    });
    renderMedicines();
    expect(await screen.findByText("Daily")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add all/i }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].name).toBe("Metformin");
  });
});
