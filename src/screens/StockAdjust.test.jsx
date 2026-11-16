import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StockAdjust from "./StockAdjust.jsx";
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

describe("StockAdjust", () => {
  it("renders adjustment form", async () => {
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan({
        medicines: [{ name: "Metformin", strength: "500 mg" }],
      });
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });
    render(
      <MemoryRouter>
        <StockAdjust />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: /Adjust \/ dispose stock/i }),
    ).toBeInTheDocument();
    db.close();
  });
});
