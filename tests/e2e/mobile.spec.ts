import { test, expect, firstPhoto, noHorizontalOverflow, referenceTime, capture } from './helpers'
import { trip } from '../../src/config/trip'
// Behavioural contract: preserve the existing 15 s rotation / 1.5 s fade.
const SLIDE_DURATION_MS = 15_000
const TRANSITION_DURATION_MS = 1_500

const sizes = [[320, 568], [360, 800], [375, 667], [390, 844], [430, 932], [768, 1024], [844, 390]] as const

for (const [width, height] of sizes) {
  test(`layout ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await firstPhoto(page)
    await expect(page.getByRole('heading', { name: 'JAPÓN 2027' })).toBeInViewport()
    await expect(page.getByText('カウントダウン', { exact: true })).toHaveAttribute('lang', 'ja')
    await expect(page.getByText('お久しぶりです', { exact: true })).toHaveAttribute('lang', 'ja')
    await expect(page.locator('.hero')).toHaveCSS('opacity', '1')
    await noHorizontalOverflow(page)
    const blocks = page.locator('.time-block')
    await expect(blocks).toHaveCount(4)
    for (const label of ['Días', 'Horas', 'Minutos', 'Segundos']) await expect(page.getByText(label, { exact: true })).toBeVisible()
    const geometry = await blocks.evaluateAll((elements) => elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    }))
    expect(new Set(geometry.map(({ y }) => Math.round(y))).size).toBe(1)
    for (const block of geometry) expect(block.width).toBeGreaterThan(55)

    const trigger = page.getByRole('button', { name: 'Explorar nuestro viaje' })
    if (width < 600 && height >= 568) {
      await expect(trigger).toBeInViewport({ ratio: 1 })
      await expect(page.locator('.footer')).toBeInViewport({ ratio: 1 })
    }
    await trigger.scrollIntoViewIfNeeded()
    await expect(trigger).toBeInViewport()
    expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.evaluate(() => window.scrollTo(0, 0))
    if (width === 320 || width === 390) await capture(page, testInfo, `home-${width}x${height}`)

    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Nuestro viaje' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveCSS('opacity', '1')
    await noHorizontalOverflow(page)
    await expect(page.getByRole('button', { name: 'Cerrar itinerario' })).toBeInViewport()
    const box = (await dialog.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1)
    if (width === 390) await capture(page, testInfo, 'itinerary-mobile')
    await page.getByRole('button', { name: 'Cerrar itinerario' }).click()
    await expect(dialog).not.toBeVisible()
  })
}

test('itinerary touch, keyboard, internal scroll and restoration', async ({ page }) => {
  // A shorter visual viewport exercises real background scroll restoration.
  await page.setViewportSize({ width: 320, height: 480 })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Explorar nuestro viaje' })
  await expect(page.locator('.hero')).toHaveCSS('opacity', '1')
  await page.evaluate(() => window.scrollTo(0, 100))
  await trigger.scrollIntoViewIfNeeded()
  const position = await page.evaluate(() => window.scrollY)
  expect(position).toBeGreaterThan(0)
  const previousOverflow = await page.evaluate(() => document.documentElement.style.overflow)
  await trigger.tap()
  const dialog = page.getByRole('dialog', { name: 'Nuestro viaje' })
  const close = page.getByRole('button', { name: 'Cerrar itinerario' })
  await expect(dialog).toBeVisible()
  await expect(close).toBeFocused()
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
  for (const city of ['Osaka', 'Kioto', 'Tokio']) await expect(dialog.getByRole('heading', { name: city, exact: true })).toBeVisible()
  await expect(dialog.getByText('Excursión a Nara', { exact: false })).toBeVisible()
  await expect(dialog.getByText('Excursión a Nikkō', { exact: false })).toBeVisible()
  await page.keyboard.press('Tab')
  // Native dialogs may allow focus into browser chrome; the inert page must
  // never receive it. Shift+Tab returns to the dialog's only focusable control.
  await expect(trigger).not.toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await dialog.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await expect(dialog.getByText('Todas las horas son locales.')).toBeInViewport()
  await expect(close).toBeInViewport()
  await close.tap()
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe(previousOverflow)
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(position, 0)
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('slideshow preloads only the next photo and rotates with simulated time', async ({ page }) => {
  await page.clock.install({ time: referenceTime })
  await page.clock.pauseAt(referenceTime)
  const requests = new Set<string>()
  page.on('request', (request) => { if (/\.(jpe?g|png|webp|avif)(\?|$)/i.test(request.url())) requests.add(request.url()) })
  await page.goto('/')
  await expect.poll(async () => {
    await page.clock.runFor(50)
    return page.locator('.background-slideshow__image').count()
  }).toBe(1)
  const image = await firstPhoto(page)
  const initial = await image.getAttribute('src')
  await expect.poll(() => requests.size).toBe(2)
  await page.clock.runFor(SLIDE_DURATION_MS + 100)
  await expect(page.locator('.background-slideshow__image--visible')).toHaveCount(1)
  await expect(page.locator('.background-slideshow__image')).toHaveCount(2)
  await page.clock.runFor(TRANSITION_DURATION_MS + 100)
  await expect(page.locator('.background-slideshow__image')).toHaveCount(1)
  await expect(page.locator('.background-slideshow__image')).not.toHaveAttribute('src', initial!)
  await expect(page.locator('.background-slideshow__image')).toHaveCSS('opacity', '1')
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('.background-slideshow__image')).toHaveCSS('object-fit', 'cover')
  const photoBox = (await page.locator('.background-slideshow__image').boundingBox())!
  expect(photoBox.width).toBe(844)
  expect(photoBox.height).toBe(390)
})

test('broken photographs leave the CSS fallback and countdown usable', async ({ page }) => {
  let failed = 0
  await page.route(/\.(jpe?g|png|webp|avif)(\?|$)/i, (route) => { failed += 1; return route.abort() })
  await page.goto('/')
  await expect.poll(() => failed).toBeGreaterThanOrEqual(6)
  await expect(page.locator('.background-slideshow__image')).toHaveCount(0)
  await expect(page.locator('.countdown')).toBeVisible()
  await expect(page.locator('.landscape')).not.toHaveCSS('background-image', 'none')
  await page.getByRole('button', { name: 'Explorar nuestro viaje' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('visibility events pause decorative effects and rotation without stopping the countdown', async ({ page }) => {
  await page.clock.install({ time: referenceTime })
  await page.clock.pauseAt(referenceTime)
  await page.goto('/')
  await expect.poll(async () => {
    await page.clock.runFor(50)
    return page.locator('.background-slideshow__image').count()
  }).toBe(1)
  const initial = await page.locator('.background-slideshow__image').getAttribute('src')
  const initialMinutes = await page.locator('.time-block--minutes dd').textContent()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.ambient-effects')).toHaveAttribute('data-paused', 'true')
  await expect(page.locator('.ambient-light')).toHaveCSS('animation-play-state', 'paused')
  await expect(page.locator('.sakura-particle').first()).toHaveCSS('animation-play-state', 'paused')
  await page.clock.runFor(60_000)
  await expect(page.locator('.background-slideshow__image')).toHaveAttribute('src', initial!)
  await page.evaluate(() => {
    delete (document as unknown as Record<string, unknown>).visibilityState
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.ambient-effects')).toHaveAttribute('data-paused', 'false')
  await expect(page.locator('.ambient-light')).toHaveCSS('animation-play-state', 'running')
  await expect(page.locator('.time-block--minutes dd')).not.toHaveText(initialMinutes!)
  await expect(page.locator('.background-slideshow__image')).toHaveAttribute('src', initial!)
  await page.clock.runFor(SLIDE_DURATION_MS + TRANSITION_DURATION_MS + 200)
  await expect(page.locator('.background-slideshow__image')).toHaveCount(1)
  await expect(page.locator('.background-slideshow__image')).not.toHaveAttribute('src', initial!)
})

test('reduced motion disables decorative movement, entry and crossfades', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await firstPhoto(page)
  await expect(page.locator('.ambient-effects')).toHaveCSS('display', 'none')
  for (const selector of ['.hero', '.ambient-light', '.sakura-particle', '.sakura-particle__sway', '.sakura-particle__petal']) {
    await expect(page.locator(selector).first()).toHaveCSS('animation-name', 'none')
  }
  await page.getByRole('button', { name: 'Explorar nuestro viaje' }).click()
  await expect(page.getByRole('dialog')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.trip-dialog__close')).toHaveCSS('transition-duration', '0s')
  const css = await page.evaluate(() => {
    const image = document.createElement('img')
    image.className = 'background-slideshow__image--incoming'
    document.body.append(image)
    const duration = getComputedStyle(image).transitionDuration
    image.remove()
    return duration
  })
  expect(css).toBe('0s')
})

test('countdown completes at the exact Madrid instant and stays at zero', async ({ page }) => {
  const before = new Date(Date.parse(trip.departure) - 2_000)
  await page.clock.install({ time: before })
  await page.clock.pauseAt(before)
  await page.goto('/')
  await expect(page.locator('.time-block--seconds dd')).toHaveText('02')
  await expect(page.getByRole('status')).toBeEmpty()
  await page.clock.runFor(1_000)
  await expect(page.locator('.time-block--seconds dd')).toHaveText('01')
  await page.clock.runFor(1_000)
  await expect(page.getByRole('status')).toHaveText(trip.arrivalMessage)
  await expect(page.locator('.time-block--seconds dd')).toHaveText('00')
  await page.clock.runFor(60_000)
  await expect(page.locator('.time-block dd')).toHaveText(['0', '00', '00', '00'])
  await expect(page.locator('.countdown__units')).toHaveAttribute('aria-live', 'off')
})
