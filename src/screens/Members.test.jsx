import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Members from "./Members.jsx";
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

describe("Members", () => {
  it("renders members list and add form", async () => {
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan();
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });
    render(
      <MemoryRouter>
        <Members />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: /Members & permissions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add member/i }),
    ).toBeInTheDocument();
    db.close();
  });
});
