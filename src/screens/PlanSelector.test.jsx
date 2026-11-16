// src/screens/PlanSelector.test.jsx
// Care-plan selector: empty state, plan list, and selecting a plan.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PlanSelector from "./PlanSelector.jsx";
import { usePlans } from "../store/plan.js";
import { useSession } from "../store/session.js";
import {
  resetAppDb,
  resetStores,
  seedPlan,
  signInStore,
} from "../test/seed.js";

beforeEach(async () => {
  await resetAppDb();
  resetStores();
});

function renderSelector() {
  return render(
    <MemoryRouter initialEntries={["/select"]}>
      <Routes>
        <Route path="/select" element={<PlanSelector />} />
        <Route path="/plan" element={<div>plan page</div>} />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PlanSelector", () => {
  it("shows the empty state when there are no plans", async () => {
    useSession.setState({
      status: "signed-in",
      profile: { id: "p1", name: "Rafiq Ahmed", email: "rafiq@example.com" },
      session: {},
      error: null,
    });
    renderSelector();
    expect(
      await screen.findByText(
        "No care plans yet. Create one to start coordinating care.",
      ),
    ).toBeInTheDocument();
  });

  it("lists plans and selects one", async () => {
    const { profile, session, planId } = await seedPlan();
    signInStore({ profile, session });
    renderSelector();

    expect(await screen.findByText("Rahim Mia")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Rahim Mia"));

    await waitFor(() => expect(usePlans.getState().currentPlanId).toBe(planId));
    expect(await screen.findByText("plan page")).toBeInTheDocument();
  });
});
