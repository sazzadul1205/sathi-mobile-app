import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Purchases from "./Purchases.jsx";
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

describe("Purchases", () => {
  it("renders purchases page", async () => {
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan();
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });
    render(
      <MemoryRouter>
        <Purchases />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: /Purchases/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add purchase/i }),
    ).toBeInTheDocument();
    db.close();
  });
});
