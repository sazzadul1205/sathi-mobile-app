import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotificationPreferences from "./NotificationPreferences.jsx";
import SyncStatus from "./SyncStatus.jsx";
import AuditHistory from "./AuditHistory.jsx";
import {
  activatePlan,
  resetAppDb,
  resetStores,
  seedPlan,
  signInStore,
} from "../test/seed.js";

describe("More screens", () => {
  it("renders notification preferences", () => {
    render(
      <MemoryRouter>
        <NotificationPreferences />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /Notification preferences/i }),
    ).toBeInTheDocument();
  });

  it("renders sync status", async () => {
    await resetAppDb();
    resetStores();
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan();
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });
    render(
      <MemoryRouter>
        <SyncStatus />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: /Offline sync status/i }),
    ).toBeInTheDocument();
    db.close();
  });

  it("renders audit history", async () => {
    await resetAppDb();
    resetStores();
    const { profile, session, planId, planRecord, context, db } =
      await seedPlan();
    signInStore({ profile, session });
    activatePlan({ planId, planRecord, context });
    render(
      <MemoryRouter>
        <AuditHistory />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: /Audit history/i }),
    ).toBeInTheDocument();
    db.close();
  });
});
