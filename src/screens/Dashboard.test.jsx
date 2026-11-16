// src/screens/Dashboard.test.jsx
// Dashboard: renders plan context, dose summary, upcoming doses and low-stock
// alerts from the real (fake-indexeddb) ledger.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard.jsx";
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

describe("Dashboard", () => {
  it("renders the plan card, summary tiles, upcoming doses and low stock", async () => {
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan({
        medicines: [
          {
            name: "Metformin",
            strength: "500 mg",
            times: "08:00, 21:00",
            doseQuantity: 1,
            stockUnit: "tablet",
            lowStockThreshold: 10,
          },
        ],
      });
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Active care plan")).toBeInTheDocument();
    expect(screen.getByText("Rahim Mia")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Upcoming doses" }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText(/Metformin/)).length).toBeGreaterThan(0);

    // Summary tiles
    expect(screen.getByText("Given")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("Missed")).toBeInTheDocument();

    // No stock received yet → at/below threshold → low-stock alert.
    expect(
      await screen.findByText(/Low stock · Metformin/),
    ).toBeInTheDocument();

    db.close();
  });
});
