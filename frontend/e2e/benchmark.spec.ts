import { expect, test } from '@playwright/test'

test.describe('ATSAD Bench real e2e', () => {
  test('operator can open benchmark and run demo evaluation', async ({ page }) => {
    const username = process.env.E2E_USERNAME
    const password = process.env.E2E_PASSWORD
    test.skip(!username || !password, 'Set E2E_USERNAME and E2E_PASSWORD to run real e2e login.')

    await page.goto('/login')
    await expect(page.getByPlaceholder('Officer username')).toBeVisible()
    await page.getByPlaceholder('Officer username').fill(username ?? '')
    await page.getByPlaceholder('Clearance code').fill(password ?? '')
    await page.getByRole('button', { name: 'Authenticate' }).click()

    await expect
      .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('orbita_token'))), {
        timeout: 20_000,
      })
      .toBe(true)
    await page.goto('/benchmark')

    await expect(page.getByRole('heading', { name: 'ATSAD Bench' })).toBeVisible()
    await expect(page.getByText('Quick Evaluate')).toBeVisible()

    const demoBtn = page.getByRole('button', { name: 'Create demo run & evaluate' })
    await expect(demoBtn).toBeVisible()
    await demoBtn.click()

    await expect(page.getByText(/Demo complete|Demo failed/)).toBeVisible({ timeout: 45_000 })
  })
})
