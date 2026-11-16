import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Inventory from "./Inventory.jsx";
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

describe("Inventory", () => {
  it("renders inventory screen", async () => {
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan();
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });
    render(
      <MemoryRouter>
        <Inventory />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: /Inventory/i }),
    ).toBeInTheDocument();
    db.close();
  });
});
