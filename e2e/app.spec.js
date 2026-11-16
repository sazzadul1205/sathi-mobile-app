import { expect, test } from "@playwright/test"
import { TEST_MEDICINE, TEST_PATIENT, addMedicine, createPlan, seedApp, signIn } from "./helpers.js"

test.describe("routing guards", () => {
  test("signed-out visitor lands on login", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/#\/login$/)
    await expect(page.getByRole("heading", { name: "Welcome to Sathi" })).toBeVisible()
  })

  test("unknown routes redirect safely", async ({ page }) => {
    await page.goto("/#/does-not-exist")
    await expect(page).toHaveURL(/#\/login$/)
  })
})

test.describe("core care flow", () => {
  test("sign in, create plan, add medicine, record/correct dose, sign out", async ({ page }) => {
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

    await page.getByRole("link", { name: "Settings", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()
    await page.getByLabel("Theme").selectOption("ocean")
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean")
    await page.getByRole("button", { name: /sign out/i }).click()
    await expect(page.getByRole("heading", { name: "Welcome to Sathi" })).toBeVisible()
  })
})

test.describe("authenticated pages", () => {
  test("renders core and care-management pages", async ({ page }) => {
    const { medicine } = await seedApp(page)

    await page.goto("/#/plan")
    await expect(page.getByText("Active care plan")).toBeVisible()
    await expect(page.getByText(TEST_PATIENT).first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "Upcoming doses" })).toBeVisible()

    await page.goto("/#/plan/meds")
    await expect(page.getByRole("heading", { name: "Medicines" })).toBeVisible()
    await expect(page.getByText(medicine.name).first()).toBeVisible()
    await page.getByRole("link", { name: "Add medicine" }).first().click()
    await expect(page.getByRole("heading", { name: "New medicine" })).toBeVisible()
    await page.goto("/#/plan/meds")
    await page.getByRole("link", { name: new RegExp(medicine.name) }).first().click()
    await expect(page.getByRole("heading", { name: "Edit medicine" })).toBeVisible()

    await page.goto("/#/plan/schedule")
    await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible()
    await expect(page.getByText(medicine.name).first()).toBeVisible()

    await page.goto("/#/plan/patient")
    await expect(page.getByRole("heading", { name: "Patient profile" })).toBeVisible()

    await page.goto("/#/plan/members")
    await expect(page.getByRole("heading", { name: "Members & permissions" })).toBeVisible()

    await page.goto("/#/plan/inventory")
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible()

    await page.goto("/#/plan/inventory/receipt")
    await expect(page.getByRole("heading", { name: "Stock receipt" })).toBeVisible()

    await page.goto("/#/plan/inventory/adjust")
    await expect(page.getByRole("heading", { name: "Adjust / dispose stock" })).toBeVisible()

    await page.goto("/#/plan/purchases")
    await expect(page.getByRole("heading", { name: "Purchases" })).toBeVisible()

    await page.goto("/#/plan/transfers")
    await expect(page.getByRole("heading", { name: "Transfers" })).toBeVisible()

    await page.goto("/#/plan/notifications")
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible()

    await page.goto("/#/plan/notification-preferences")
    await expect(page.getByRole("heading", { name: "Notification preferences" })).toBeVisible()

    await page.goto("/#/plan/sync")
    await expect(page.getByRole("heading", { name: "Offline sync status" })).toBeVisible()
    await expect(page.getByText(/sealed with the device key/i)).toBeVisible()

    await page.goto("/#/plan/audit")
    await expect(page.getByRole("heading", { name: "Audit history" })).toBeVisible()

    await page.goto("/#/plan/settings")
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()
    await expect(page.getByText("Offline authorization")).toBeVisible()
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
