// e2e/helpers.js
// Shared UI drivers for the end-to-end suite. Everything goes through the real
// UI (no direct IndexedDB seeding) so the tests prove the actual user flows.
import { expect } from '@playwright/test'

export const TEST_PROFILE = { name: 'Rafiq Ahmed', email: 'rafiq@example.com' }
export const TEST_PATIENT = 'Rahim Mia'
export const TEST_MEDICINE = { name: 'Metformin', strength: '500 mg', times: '08:00, 21:00' }

export async function signIn(page, profile = TEST_PROFILE) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome to Sathi' })).toBeVisible()
  await page.getByRole('button', { name: /new device profile/i }).click()
  await page.getByPlaceholder(profile.name).fill(profile.name)
  await page.getByPlaceholder('you@example.com').fill(profile.email)
  await page.getByRole('button', { name: /^create profile$/i }).click()
  await expect(page.getByRole('heading', { name: 'Select a plan' })).toBeVisible()
}

export async function createPlan(page, patientName = TEST_PATIENT) {
  await page.getByRole('button', { name: /create a new care plan/i }).click()
  await expect(page.getByRole('heading', { name: 'New care plan' })).toBeVisible()
  await page.getByPlaceholder('Full name').fill(patientName)
  await page.getByRole('button', { name: /^create plan$/i }).click()
  await expect(page.getByText('Active care plan')).toBeVisible()
}

export async function addMedicine(page, medicine = TEST_MEDICINE) {
  await page.getByRole('link', { name: 'Meds', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Medicines' })).toBeVisible()
  await page.getByRole('link', { name: 'Add medicine' }).first().click()
  await expect(page.getByRole('heading', { name: 'New medicine' })).toBeVisible()
  await page.getByPlaceholder('Metformin').fill(medicine.name)
  if (medicine.strength) {
    await page.getByPlaceholder('500 mg').fill(medicine.strength)
  }
  if (medicine.times) {
    await page.getByPlaceholder('08:00, 13:00, 21:00').fill(medicine.times)
  }
  await page.getByRole('button', { name: /^add medicine$/i }).click()
  await expect(page.getByRole('heading', { name: 'Medicines' })).toBeVisible()
  await expect(page.getByText(medicine.name).first()).toBeVisible()
}

// Convenience: sign in, create a plan, and add one medicine.
export async function seedApp(page, opts = {}) {
  const profile = opts.profile || TEST_PROFILE
  const patientName = opts.patientName || TEST_PATIENT
  const medicine = opts.medicine || TEST_MEDICINE
  await signIn(page, profile)
  await createPlan(page, patientName)
  await addMedicine(page, medicine)
  return { profile, patientName, medicine }
}