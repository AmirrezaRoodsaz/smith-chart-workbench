import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/') })

test('explain mode shows a popover instead of activating the control', async ({ page }) => {
  await page.getByRole('button', { name: 'Explain mode' }).click()
  await page.locator('.vswr-badge').click()
  await expect(page.locator('.explain-pop')).toBeVisible()
  await expect(page.locator('.explain-pop')).toContainText('VSWR')
  // clicking a control in explain mode must NOT activate it
  await page.getByLabel('Grid mode').click()
  await expect(page.locator('.explain-pop')).toContainText('grids')
  await expect(page.locator('.grid-y')).toHaveCount(0)
})

test('morph dialog opens and scrubbing changes the grid', async ({ page }) => {
  await page.locator('.learn-menu summary').click()
  await page.getByRole('button', { name: 'Why does it look like this?' }).click()
  const path = page.locator('.morph-svg path').first()
  const d0 = await path.getAttribute('d')
  await page.getByLabel('Morph progress').fill('1000')
  expect(await path.getAttribute('d')).not.toBe(d0)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.locator('.morph-svg')).toHaveCount(0)
})

test('walk the line animates the standing wave', async ({ page }) => {
  await page.locator('.learn-menu summary').click()
  await page.getByRole('button', { name: 'Walk the line' }).click()
  await expect(page.locator('.walkline-svg')).toBeVisible()
  const d0 = await page.locator('.wl-sum').getAttribute('d')
  await page.waitForTimeout(300)
  expect(await page.locator('.wl-sum').getAttribute('d')).not.toBe(d0)
})

test('mission 2: the Veritasium match is completable', async ({ page }) => {
  await page.locator('.learn-menu summary').click()
  await page.getByRole('button', { name: 'Match the Veritasium antenna' }).click()
  const card = page.locator('.tour-card')
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Next' }).click() // intro; default load+freq auto-pass
  await expect(card).toContainText('transmission line')
  await page.getByRole('button', { name: 'Line', exact: true }).click()
  await expect(card).toContainText('r = 1')
  await page.getByLabel('Line value in °').fill('54.2')
  await page.getByLabel('Line value in °').press('Enter')
  await expect(card).toContainText('inductor')
  await page.getByRole('button', { name: 'Series L', exact: true }).click()
  await page.getByLabel('Series L value in nH').fill('995')
  await page.getByLabel('Series L value in nH').press('Enter')
  await expect(card).toContainText('Matched!')
  await expect(page.locator('.vswr-badge')).toHaveClass(/good/)
})
