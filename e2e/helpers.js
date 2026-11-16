import { expect } from "@playwright/test"

export const TEST_PROFILE = { name: "Rafiq Ahmed", email: "rafiq@example.com" }
export const TEST_PATIENT = "Rahim Mia"
export const TEST_MEDICINE = { name: "Metformin", strength: "500 mg" }

export async function signIn(page, profile = TEST_PROFILE) {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Welcome to Sathi" })).toBeVisible()
  await page.getByRole("button", { name: /new device profile/i }).click()
  await page.getByPlaceholder("Rafiq Ahmed").fill(profile.name)
  await page.getByPlaceholder("you@example.com").fill(profile.email)
  await page.getByRole("button", { name: /^create profile$/i }).click()
  await expect(page.getByRole("heading", { name: "Select a plan" })).toBeVisible()
}

export async function createPlan(page, patientName = TEST_PATIENT) {
  await page.getByRole("button", { name: /create a new care plan/i }).click()
  await expect(page.getByRole("heading", { name: "New care plan" })).toBeVisible()
  await page.getByPlaceholder("Full name").fill(patientName)
  await page.getByRole("button", { name: /^create plan$/i }).click()
  await expect(page.getByText("Active care plan")).toBeVisible()
}

export async function addMedicine(page, medicine = TEST_MEDICINE) {
  await page.getByRole("link", { name: "Meds", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Medicines" })).toBeVisible()
  await page.getByRole("link", { name: "Add medicine" }).first().click()
  await expect(page.getByRole("heading", { name: "New medicine" })).toBeVisible()
  await page.getByPlaceholder("Metformin").fill(medicine.name)
  if (medicine.strength) await page.getByPlaceholder("500 mg").fill(medicine.strength)

  const time1 = page.getByLabel("Dose time 1")
  if (await time1.count()) {
    await time1.fill((medicine.times && medicine.times[0]?.time) || "08:00")
    if (medicine.times?.[0]?.quantity != null) {
      await page.getByLabel("Dose quantity 1").fill(String(medicine.times[0].quantity))
    }
    if (medicine.times?.[0]?.mealRelation) {
      await page.getByLabel("Meal timing 1").selectOption(medicine.times[0].mealRelation)
    }
    for (let i = 1; i < (medicine.times?.length || 0); i++) {
      await page.getByRole("button", { name: "Add dose time" }).click()
      await page.getByLabel(`Dose time ${i + 1}`).fill(medicine.times[i].time)
      if (medicine.times[i].quantity != null) {
        await page.getByLabel(`Dose quantity ${i + 1}`).fill(String(medicine.times[i].quantity))
      }
      if (medicine.times[i].mealRelation) {
        await page.getByLabel(`Meal timing ${i + 1}`).selectOption(medicine.times[i].mealRelation)
      }
    }
  } else if (typeof medicine.times === "string") {
    // Backward compatibility with older text-input form.
    await page.getByPlaceholder("08:00, 13:00, 21:00").fill(medicine.times)
  }

  await page.getByRole("button", { name: /^add medicine$/i }).click()
  await expect(page.getByRole("heading", { name: "Medicines" })).toBeVisible()
  await expect(page.getByText(medicine.name).first()).toBeVisible()
}

export async function seedApp(page, opts = {}) {
  const profile = opts.profile || TEST_PROFILE
  const patientName = opts.patientName || TEST_PATIENT
  const medicine = opts.medicine || {
    ...TEST_MEDICINE,
    times: [
      { time: "08:00", quantity: 1, mealRelation: "after" },
      { time: "21:00", quantity: 1, mealRelation: "before" },
    ],
  }
  await signIn(page, profile)
  await createPlan(page, patientName)
  await addMedicine(page, medicine)
  return { profile, patientName, medicine }
}
