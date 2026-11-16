// src/screens/Schedule.test.jsx
// Schedule: slots grouped by time of day, filters, and recording a dose (which
// writes to the ledger and reduces stock).
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Schedule from "./Schedule.jsx";
import { stockByMedicine } from "../lib/repo/inventory.js";
import {
  activatePlan,
  resetAppDb,
  resetStores,
  seedPlan,
  signInStore,
} from "../test/seed.js";

beforeEach(async () => {
  await resetAppDb();
  resetStores();
});

function renderSchedule() {
  return render(
    <MemoryRouter initialEntries={["/plan/schedule"]}>
      <Schedule />
    </MemoryRouter>,
  );
}

describe("Schedule", () => {
  it("groups doses by time of day and filters by outcome", async () => {
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan({
        medicines: [
          {
            name: "Metformin",
            strength: "500 mg",
            times: "08:00, 21:00",
            doseQuantity: 1,
            stockUnit: "tablet",
          },
        ],
      });
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });

    const { container } = renderSchedule();

    expect(await screen.findByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Evening")).toBeInTheDocument();
    expect(screen.getAllByText(/Metformin/).length).toBeGreaterThan(0);

    // "Given" filter with nothing recorded yet → empty result. Scope to the
    // filter chip row so we don't hit a dose's "Given" outcome button.
    const chips = container.querySelector(".chips");
    fireEvent.click(within(chips).getByRole("button", { name: "Given" }));
    expect(
      await screen.findByText("Nothing matches this filter"),
    ).toBeInTheDocument();

    db.close();
  });

  it("records a dose as given and reduces stock", async () => {
    const { profile, session, planId, planRecord, context, db, medicines } =
      await seedPlan({
        medicines: [
          {
            name: "Metformin",
            strength: "500 mg",
            times: "08:00, 21:00",
            doseQuantity: 1,
            stockUnit: "tablet",
          },
        ],
      });
    const medicine = medicines[0];
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });

    renderSchedule();

    const morningCard = () => screen.getByText("Morning").nextElementSibling;
    await waitFor(() => expect(morningCard()).toBeTruthy());

    fireEvent.click(
      within(morningCard()).getByRole("button", { name: "Given" }),
    );

    await waitFor(() => {
      expect(within(morningCard()).getByText("given")).toBeInTheDocument();
    });

    await waitFor(async () => {
      const stock = await stockByMedicine(db);
      expect(stock.get(medicine.id)?.total ?? 0).toBe(-1);
    });

    db.close();
  });
});
