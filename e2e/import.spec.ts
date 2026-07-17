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

  const downloadPromise = page.waitForEvent('download')
  await page.getByLabel('Export chart as PNG').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('smith-chart.png')
  const path = await download.path()
  const { size } = await import('node:fs/promises').then((fs) => fs.stat(path!))
  expect(size).toBeGreaterThan(10_000) // a real chart, not an empty canvas
  // ink-fraction check: count non-background pixels via a canvas in the page
  const buf = await import('node:fs/promises').then((fs) => fs.readFile(path!))
  const inkFraction = await page.evaluate(async (bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
    const bmp = await createImageBitmap(blob)
    const c = document.createElement('canvas')
    c.width = bmp.width
    c.height = bmp.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(bmp, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    const bg = [d[0], d[1], d[2]]
    let ink = 0
    const total = c.width * c.height
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 30) ink++
    }
    return ink / total
  }, [...buf])
  expect(inkFraction).toBeGreaterThan(0.005)
  expect(inkFraction).toBeLessThan(0.2)

  await page.getByLabel('Clear imported file').click()
  await expect(page.locator('.vswr-strip')).toHaveCount(0)
})
