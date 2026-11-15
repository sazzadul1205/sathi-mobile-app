// e2e/app.spec.js
// End-to-end coverage: every route renders, the core care flow works end to
// end, guards redirect correctly, and the offline session survives a reload.
import { expect, test } from '@playwright/test'
import {
  TEST_MEDICINE,
  TEST_PATIENT,
  addMedicine,
  createPlan,
  seedApp,
  signIn,
} from './helpers.js'

test.describe('routing guards', () => {
  test('a signed-out visitor lands on the login screen', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/login$/)
    await expect(page.getByRole('heading', { name: 'Welcome to Sathi' })).toBeVisible()
  })
})

test.describe('core care flow', () => {
  test('sign in → create plan → add medicine → record dose → sign out', async ({
    page,
  }) => {
    await signIn(page)
    await createPlan(page, TEST_PATIENT)

    await page.getByRole('link', { name: 'Meds', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Medicines' })).toBeVisible()
    await addMedicine(page, TEST_MEDICINE)

    // Record the first pending dose as given. Scope to the outcome row so we
    // don't hit the "Given" filter chip (which has the same accessible name).
    await page.getByRole('link', { name: 'Schedule', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Schedule', exact: true })).toBeVisible()
    const firstOutcomeRow = page.locator('div.grid.grid-cols-4').first()
    await expect(firstOutcomeRow).toBeVisible()
    await firstOutcomeRow.getByRole('button', { name: 'Given', exact: true }).click()
    await expect(page.getByText('given', { exact: true }).first()).toBeVisible()

    // Settings: switch theme, then sign out.
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByLabel('Theme').selectOption('ocean')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean')
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page.getByRole('heading', { name: 'Welcome to Sathi' })).toBeVisible()
  })
})

test.describe('page rendering', () => {
  test('every authenticated page renders with its key content', async ({ page }) => {
    const { medicine } = await seedApp(page)

    // Dashboard
    await page.goto('/#/plan')
    await expect(page.getByText('Active care plan')).toBeVisible()
    await expect(page.getByText(TEST_PATIENT).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upcoming doses' })).toBeVisible()

    // Medicines list
    await page.goto('/#/plan/meds')
    await expect(page.getByRole('heading', { name: 'Medicines' })).toBeVisible()
    await expect(page.getByText(medicine.name).first()).toBeVisible()

    // New medicine form
    await page.goto('/#/plan/meds/new')
    await expect(page.getByRole('heading', { name: 'New medicine' })).toBeVisible()
    await expect(page.getByPlaceholder('Metformin')).toBeVisible()

    // Schedule
    await page.goto('/#/plan/schedule')
    await expect(page.getByRole('heading', { name: 'Schedule', exact: true })).toBeVisible()
    await expect(page.getByText(medicine.name).first()).toBeVisible()

    // Settings
    await page.goto('/#/plan/settings')
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await expect(page.getByText('Offline authorization')).toBeVisible()

    // Edit medicine (open from the list so we get a real id)
    await page.goto('/#/plan/meds')
    await page.getByRole('link', { name: new RegExp(medicine.name) }).first().click()
    await expect(page.getByRole('heading', { name: 'Edit medicine' })).toBeVisible()
  })

  test('the offline session survives a reload', async ({ page }) => {
    await seedApp(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Select a plan' })).toBeVisible()
    await expect(page.getByText(TEST_PATIENT).first()).toBeVisible()
  })
})