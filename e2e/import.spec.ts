import { expect, test } from '@playwright/test'

test('s1p import: curves, strip, marker drag, auto-match over the band, export', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Import Touchstone file').setInputFiles('e2e/fixtures/antenna.s1p')
  await expect(page.locator('.trace-matched')).toBeVisible()
  await expect(page.locator('.vswr-strip')).toBeVisible()

  const before = await page.getByLabel('Frequency MHz').inputValue()
  const strip = page.locator('.vswr-strip svg')
  const box = (await strip.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2)
  await expect(page.getByLabel('Frequency MHz')).not.toHaveValue(before)

  await page.locator('.automatch button').first().click()
  await expect(page.locator('.vswr-badge')).toHaveClass(/good/)

  const download = page.waitForEvent('download')
  await page.getByLabel('Export chart as PNG').click()
  expect((await download).suggestedFilename()).toBe('smith-chart.png')

  await page.getByLabel('Clear imported file').click()
  await expect(page.locator('.vswr-strip')).toHaveCount(0)
})
