import { test, expect, firstPhoto } from './helpers'
import { writeFile } from 'node:fs/promises'

type Metrics = { lcp: number | null; cls: number }

// Playwright's clock replaces parts of the performance timeline. Measure with
// native timing; only the separate functional cases freeze the departure date.
test.use({ freezeDate: false })

// Run after the functional projects, without competing browser workers.
test('record mobile load metrics with CPU and network emulation', async ({ page, context, browser }, testInfo) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const session = await context.newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.setCacheDisabled', { cacheDisabled: true })
  await session.send('Network.emulateNetworkConditions', {
    offline: false, latency: 100, downloadThroughput: 200_000, uploadThroughput: 75_000,
  })
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => {
    const metrics: Metrics = { lcp: null, cls: 0 }
    ;(window as unknown as { auditMetrics: Metrics }).auditMetrics = metrics
    new PerformanceObserver((list) => {
      metrics.lcp = list.getEntries().at(-1)?.startTime ?? null
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!shift.hadRecentInput) metrics.cls += shift.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto('/')
  await firstPhoto(page, 30_000)
  await expect(page.locator('.hero')).toHaveCSS('opacity', '1')
  await expect.poll(() => page.evaluate(() => (window as unknown as { auditMetrics: Metrics }).auditMetrics.lcp)).not.toBeNull()
  // Flush paint/observer delivery, then the interaction finalizes the LCP window.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await page.getByRole('button', { name: 'Explorar nuestro viaje' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const result = await page.evaluate(() => {
    const input = performance.getEntriesByType('first-input')[0] as PerformanceEntry & { processingStart: number } | undefined
    return {
      ...(window as unknown as { auditMetrics: Metrics }).auditMetrics,
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
      firstInputDelay: input ? input.processingStart - input.startTime : null,
      completedResources: performance.getEntriesByType('resource').map((entry) => {
        const resource = entry as PerformanceResourceTiming
        return { name: new URL(resource.name).pathname, bytes: resource.encodedBodySize }
      }),
    }
  })
  expect(result.cls).toBeLessThanOrEqual(0.1)
  const path = testInfo.outputPath('mobile-performance.json')
  await writeFile(path, JSON.stringify({
      environment: 'Headless Chromium; synthetic mobile emulation, not a physical device or Lighthouse score',
      timeSource: 'Native browser performance timeline; no simulated clock',
      browser: browser.version(), viewport: '390x844', cpuSlowdown: 4,
      latencyMs: 100, downloadBytesPerSecond: 200_000,
      ...result,
    }, null, 2))
  await testInfo.attach('mobile-performance.json', { path, contentType: 'application/json' })
})
