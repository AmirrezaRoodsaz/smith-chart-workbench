import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/') })

// Native <input type=range> jumps the thumb to the click point when you
// mousedown off the thumb — so a fixed "always click center" helper resets
// the value on every call instead of dragging further. Start each drag from
// the thumb's *current* position (derived from its value) so repeated calls
// accumulate instead of resetting.
async function dragSlider(page: import('@playwright/test').Page, dx: number) {
  const slider = page.getByLabel('Series L slider')
  const box = (await slider.boundingBox())!
  const t = Number(await slider.inputValue())
  const startX = box.x + (t / 1000) * box.width
  const y = box.y + box.height / 2
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(startX + dx, y, { steps: 5 })
  await page.mouse.up()
}

test('add element draws an arc; slider tunes the value', async ({ page }) => {
  await page.getByRole('button', { name: 'Series L', exact: true }).click()
  await expect(page.locator('.el-arc')).toHaveCount(1)
  await dragSlider(page, 60)
  await expect(page.locator('.el-val')).not.toHaveText('100 nH')
})

test('two separate drags are two undo steps', async ({ page }) => {
  await page.getByRole('button', { name: 'Series L', exact: true }).click()
  // smaller dx than the single-drag test above: two full-size drags in a row
  // would run the log-scaled slider past its ceiling, making the second
  // drag a no-op (same clamped max value) — not what this test is checking.
  await dragSlider(page, 30)
  const afterFirst = await page.locator('.el-val').textContent()
  await dragSlider(page, 30)
  await expect(page.locator('.el-val')).not.toHaveText(afterFirst!)
  await page.getByLabel('Undo').click()
  await expect(page.locator('.el-val')).toHaveText(afterFirst!)
  await page.getByLabel('Undo').click()
  await expect(page.locator('.el-val')).toHaveText('100 nH')
})

test('tabbing through settings adds no undo steps', async ({ page }) => {
  await expect(page.getByLabel('Undo')).toBeDisabled()
  await page.getByLabel('Z0 ohms').click()
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
  await expect(page.getByLabel('Undo')).toBeDisabled()
})

test('URL hash round-trips through a fresh load', async ({ page }) => {
  await page.getByRole('button', { name: 'Shunt C', exact: true }).click()
  await page.waitForFunction(() => location.hash.startsWith('#v1.'))
  const hash = await page.evaluate(() => location.hash)
  await page.goto('/' + hash)
  await expect(page.locator('.el-name')).toHaveText(['Shunt C'])
})

test('pasting a hash into a running tab loads it (undoably)', async ({ page }) => {
  await page.getByRole('button', { name: 'Shunt C', exact: true }).click()
  await page.waitForFunction(() => location.hash.startsWith('#v1.'))
  const hash = await page.evaluate(() => location.hash)
  await page.goto('/')
  await expect(page.locator('.el-row')).toHaveCount(0)
  await page.evaluate((h) => { window.location.hash = h }, hash)
  await expect(page.locator('.el-name')).toHaveText(['Shunt C'])
  await page.getByLabel('Undo').click()
  await expect(page.locator('.el-row')).toHaveCount(0)
})

test('auto-match centers the demo load', async ({ page }) => {
  await page.locator('.automatch button').first().click()
  await expect(page.locator('.vswr-badge')).toHaveClass(/good/)
})
