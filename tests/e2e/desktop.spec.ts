import { test, expect, firstPhoto, noHorizontalOverflow, capture } from './helpers'

test('desktop composition and itinerary remain usable', async ({ page }, testInfo) => {
  await page.goto('/')
  await firstPhoto(page)
  await expect(page.locator('.hero')).toHaveCSS('opacity', '1')
  await noHorizontalOverflow(page)
  await expect(page.getByRole('heading', { name: 'JAPÓN 2027' })).toBeInViewport()
  await expect(page.getByText('カウントダウン', { exact: true })).toHaveAttribute('lang', 'ja')
  await expect(page.getByText('お久しぶりです', { exact: true })).toHaveAttribute('lang', 'ja')
  await expect(page.locator('.countdown')).toBeInViewport()
  await capture(page, testInfo, 'home-desktop')
  const trigger = page.getByRole('button', { name: 'Explorar nuestro viaje' })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Nuestro viaje' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
