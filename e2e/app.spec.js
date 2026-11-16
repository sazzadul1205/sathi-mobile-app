import { expect, test } from "@playwright/test"
import { TEST_MEDICINE, TEST_PATIENT, addMedicine, createPlan, seedApp, signIn } from "./helpers.js"

test.describe("routing and auth", () => {
  test("signed-out visitor lands on login", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/#\/login$/)
    await expect(page.getByRole("heading", { name: "Welcome to Sathi" })).toBeVisible()
  })

  test("unknown routes redirect safely when signed out", async ({ page }) => {
    await page.goto("/#/does-not-exist")
    await expect(page).toHaveURL(/#\/login$/)
  })

  test("can create a device profile and reach plan selector", async ({ page }) => {
    await signIn(page, { name: "Karim Uddin", email: "karim@example.com" })
    await expect(page.getByRole("heading", { name: "Select a plan" })).toBeVisible()
    await expect(page.getByText("Signed in as Karim Uddin")).toBeVisible()
  })
})

test.describe("plans and dashboard", () => {
  test("creates a care plan and shows dashboard context", async ({ page }) => {
    await signIn(page)
    await createPlan(page, TEST_PATIENT)
    await expect(page.getByText("Active care plan")).toBeVisible()
    await expect(page.getByText(TEST_PATIENT).first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "Upcoming doses" })).toBeVisible()
    await expect(page.getByText(/local mode/i)).toBeVisible()
  })
})

test.describe("medicines and schedule", () => {
  test("adds medicine with per-dose qty/meal, records and corrects dose", async ({ page }) => {
    await signIn(page)
    await createPlan(page, TEST_PATIENT)

    await addMedicine(page, {
      ...TEST_MEDICINE,
      times: [
        { time: "08:00", quantity: 2, mealRelation: "after" },
        { time: "21:00", quantity: 1, mealRelation: "before" },
      ],
    })

    await page.getByRole("link", { name: "Schedule", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible()
    await expect(page.getByText(/2 tablet/i).first()).toBeVisible()
    await expect(page.getByText(/after eating/i).first()).toBeVisible()

    const morningRow = page.locator("div.grid.grid-cols-4").first()
    await expect(morningRow).toBeVisible()
    await morningRow.getByRole("button", { name: "Given", exact: true }).click()
    await expect(page.getByText("given", { exact: true }).first()).toBeVisible()

    await page.getByRole("button", { name: /Correct/i }).first().click()
    await page.getByLabel("Corrected outcome").selectOption("missed")
    await page.getByLabel("Correction reason").fill("Recorded in error")
    await page.getByRole("button", { name: "Save correction" }).click()
    await expect(page.getByRole("button", { name: /Correct/i }).first()).toBeVisible()
    await expect(page.locator("main")).toContainText(/08:00[\s\S]*missed/i)

    await page.getByRole("button", { name: "Missed", exact: true }).click()
    await expect(page.locator("main")).toContainText(/missed/i)
  })

  test("supports schedule outcome filters and medicine edit", async ({ page }) => {
    await seedApp(page)
    await page.goto("/#/plan/schedule")
    await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Pending", exact: true }).click()
    await expect(page.locator("main")).toContainText(/Pending|No doses scheduled|Nothing matches/i)
    await page.getByRole("button", { name: "All", exact: true }).click()

    await page.goto("/#/plan/meds")
    await page.getByRole("link", { name: new RegExp(TEST_MEDICINE.name) }).first().click()
    await expect(page.getByRole("heading", { name: "Edit medicine" })).toBeVisible()
    await expect(page.getByLabel("Dose time 1")).toBeVisible()
  })

  test("saves, applies, skips duplicates, and deletes a medicine template", async ({ page }) => {
    await seedApp(page)
    await page.goto("/#/plan/meds")
    await expect(page.getByText("Medicine templates")).toBeVisible()

    await page.getByLabel("Template name").fill("Daily plan")
    await page.getByRole("button", { name: "Save template" }).click()
    await expect(page.getByText(/Template saved/i)).toBeVisible()
    await expect(page.getByText("Daily plan")).toBeVisible()

    await page.getByRole("button", { name: /Add all/i }).click()
    await expect(page.getByText(/No new medicines added/i)).toBeVisible()

    await page.getByRole("button", { name: "Delete template Daily plan" }).click()
    await expect(page.getByText("Daily plan")).toHaveCount(0)
    await expect(page.getByText(/No templates yet/i)).toBeVisible()
  })
})

test.describe("care management", () => {
  test("updates patient profile", async ({ page }) => {
    await seedApp(page)
    await page.goto("/#/plan/patient")
    await expect(page.getByRole("heading", { name: "Patient profile" })).toBeVisible()
    const name = page.getByLabel(/Patient name/i)
    await name.fill("Rahim Mia Updated")
    await page.getByLabel(/Care notes/i).fill("Needs evening reminder")
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.reload()
    await expect(page.getByLabel(/Patient name/i)).toHaveValue("Rahim Mia Updated")
    await expect(page.getByLabel(/Care notes/i)).toHaveValue("Needs evening reminder")
  })

  test("adds and removes a local member", async ({ page }) => {
    await seedApp(page)
    await page.goto("/#/plan/members")
    await expect(page.getByRole("heading", { name: "Members & permissions" })).toBeVisible()
    await page.getByLabel(/Member name/i).fill("Sadia")
    await page.getByLabel(/^Role$/i).selectOption("caregiver")
    await page.getByRole("button", { name: "Add member" }).click()
    await expect(page.getByText("Sadia")).toBeVisible()
    await page.getByRole("button", { name: "Remove" }).first().click()
    await expect(page.getByText("Sadia")).toHaveCount(0)
  })

  test("records stock receipt and adjustment", async ({ page }) => {
    await seedApp(page)

    await page.goto("/#/plan/inventory/receipt")
    await expect(page.getByRole("heading", { name: "Stock receipt" })).toBeVisible()
    await page.getByLabel(/Quantity received/i).fill("10")
    await page.getByRole("button", { name: "Save receipt" }).click()
    await expect(page).toHaveURL(/#\/plan\/inventory$/)
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible()
    await expect(page.getByText(/\+10/).first()).toBeVisible()

    await page.goto("/#/plan/inventory/adjust")
    await expect(page.getByRole("heading", { name: "Adjust / dispose stock" })).toBeVisible()
    await page.getByRole("button", { name: "Save adjustment" }).click()
    await expect(page.getByText(/reason is required/i)).toBeVisible()
    await page.getByLabel(/^Reason$/i).fill("Damaged")
    await page.getByLabel(/Quantity change/i).fill("-2")
    await page.getByRole("button", { name: "Save adjustment" }).click()
    await expect(page).toHaveURL(/#\/plan\/inventory$/)
    await expect(page.getByText(/adjustment/i).first()).toBeVisible()
  })

  test("creates purchase, updates status, and creates transfer", async ({ page }) => {
    await seedApp(page)

    await page.goto("/#/plan/purchases")
    await expect(page.getByRole("heading", { name: "Purchases" })).toBeVisible()
    await page.getByLabel(/^Medicine$/i).fill("Metformin")
    await page.getByLabel(/^Quantity$/i).fill("30")
    await page.getByLabel(/Estimated cost/i).fill("৳240")
    await page.getByRole("button", { name: "Add purchase" }).click()
    const purchaseLink = page.getByRole("link", { name: /Metformin/i }).first()
    await expect(purchaseLink).toBeVisible()
    await purchaseLink.click()
    await expect(page.getByRole("heading", { name: "Purchase details" })).toBeVisible()
    await page.getByLabel(/Update status/i).selectOption("received")
    await expect(page.getByText("received", { exact: true }).first()).toBeVisible()

    await page.goto("/#/plan/transfers")
    await expect(page.getByRole("heading", { name: "Transfers" })).toBeVisible()
    await page.getByLabel(/^Medicine$/i).fill("Metformin")
    await page.getByLabel(/^Quantity$/i).fill("5")
    await page.getByRole("button", { name: "Create transfer" }).click()
    await expect(page.getByText(/Metformin/i).first()).toBeVisible()
    await expect(page.getByText(/preparing|in transit|received/i).first()).toBeVisible()
  })
})

test.describe("notifications, sync, audit, settings", () => {
  test("notifications can be marked read/unread and preferences render", async ({ page }) => {
    await seedApp(page)
    await page.goto("/#/plan/notifications")
    await expect(page.getByRole("heading", { name: "Notifications & activity" })).toBeVisible()
    const toggle = page.getByRole("button", { name: /Mark read|Mark unread/i }).first()
    const before = await toggle.textContent()
    await toggle.click()
    await expect(page.getByRole("button", { name: before?.includes("Mark read") ? /Mark unread/i : /Mark read/i }).first()).toBeVisible()

    await page.goto("/#/plan/notification-preferences")
    await expect(page.getByRole("heading", { name: "Notification preferences" })).toBeVisible()
    await expect(page.getByText("Push notifications")).toBeVisible()
    await expect(page.getByText(/not configured/i)).toBeVisible()
    await page.getByRole("switch", { name: "Upcoming doses" }).click()
    await page.getByRole("switch", { name: "Hide preview" }).click()
  })

  test("sync, audit, settings, backup UI and sign out work", async ({ page }) => {
    await seedApp(page)

    await page.goto("/#/plan/sync")
    await expect(page.getByRole("heading", { name: "Offline sync status" })).toBeVisible()
    await expect(page.getByText(/sealed with the device key/i)).toBeVisible()
    await page.getByRole("button", { name: "Refresh" }).click()

    await page.goto("/#/plan/audit")
    await expect(page.getByRole("heading", { name: "Audit history" })).toBeVisible()
    await expect(page.getByText(/plan\.created|medicine/i).first()).toBeVisible()

    await page.goto("/#/plan/settings")
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()
    await expect(page.getByText("Backup & restore")).toBeVisible()
    await expect(page.getByRole("button", { name: /Export backup/i })).toBeVisible()
    await expect(page.getByLabel("Restore backup file")).toBeVisible()
    await page.getByLabel("Theme").selectOption("ocean")
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean")
    await page.getByRole("button", { name: /sign out/i }).click()
    await expect(page.getByRole("heading", { name: "Welcome to Sathi" })).toBeVisible()
  })

  test("session survives reload and recovery screen is accessible", async ({ page }) => {
    await seedApp(page)
    await page.reload()
    await expect(page.getByRole("heading", { name: "Select a plan" })).toBeVisible()
    await expect(page.getByText(TEST_PATIENT).first()).toBeVisible()

    await page.goto("/#/recover")
    await expect(page.getByRole("heading", { name: "Recover account" })).toBeVisible()
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible()
  })
})
