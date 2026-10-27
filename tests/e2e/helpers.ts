import { test as base, expect, type Page, type TestInfo } from '@playwright/test'
import { readdirSync } from 'node:fs'

export const galleryFiles = readdirSync(new URL('../../src/assets/photos/', import.meta.url))
  .filter((name) => /\.(jpe?g|png|webp|avif)$/i.test(name))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }))

// Keep all E2E cases independent of the real date, including after April 2027.
export const referenceTime = new Date('2026-10-26T12:00:00+01:00')
export const test = base.extend<{ runtimeErrors: string[]; freezeDate: boolean }>({
  freezeDate: [true, { option: true }],
  runtimeErrors: [async ({ page, freezeDate }, use) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Unable to continue')) errors.push(message.text())
    })
    if (freezeDate) await page.clock.setFixedTime(referenceTime)
    await use(errors)
    expect(errors, 'No uncaught application errors').toEqual([])
  }, { auto: true }],
})
export { expect }

/** Observe real decode completion before advancing a simulated clock. */
export async function trackPhotoDecodes(page: Page) {
  await page.addInitScript(() => {
    const decoded: string[] = []
    ;(window as unknown as { decodedPhotos: string[] }).decodedPhotos = decoded
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = function () {
      return decode.call(this).then(() => { decoded.push(this.currentSrc || this.src) })
    }
  })
}

export async function waitForDecodedPhotos(page: Page, count: number) {
  await expect.poll(() => page.evaluate(() => (window as unknown as { decodedPhotos: string[] }).decodedPhotos.length), { timeout: 10_000 }).toBeGreaterThanOrEqual(count)
}

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`)
  // Pause at the rendered frame: cancelling infinite CSS animations would reset
  // the subtle light to its unanimated opacity and misrepresent the actual UI.
  const running = await page.evaluateHandle(() => {
    const animations = document.getAnimations().filter((animation) => animation.playState === 'running')
    animations.forEach((animation) => animation.pause())
    return animations
  })
  try {
    await page.screenshot({ path, fullPage: true, scale: 'css' })
  } finally {
    await running.evaluate((animations) => animations.forEach((animation) => animation.play()))
    await running.dispose()
  }
  await testInfo.attach(name, { path, contentType: 'image/png' })
}

export async function firstPhoto(page: Page, timeout = 10_000) {
  const image = page.locator('.background-slideshow__image').first()
  await expect(image).toBeVisible({ timeout })
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout }).toBe(true)
  return image
}

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.documentElement.clientWidth,
    dialog: (() => {
      const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')
      return dialog ? dialog.scrollWidth - dialog.clientWidth : 0
    })(),
  }))
  expect(overflow).toEqual({ root: 0, body: 0, dialog: 0 })
}
