import type { PhotoSequence } from './photoSequence'

export const PHOTO_LOAD_TIMEOUT_MS = 45_000

/** Consume the active cycle until a decoded photo is ready, or none remain. */
export async function findNextPhoto(
  sequence: PhotoSequence,
  current: string | null,
  failed: Set<string>,
  signal: AbortSignal,
): Promise<string | null> {
  while (true) {
    signal.throwIfAborted()
    const url = sequence.next(current, failed)
    if (url === null) return null
    if (await preloadPhoto(url, signal, current === null ? 'high' : 'low')) return url
    failed.add(url)
  }
}

/** Count only foreground time, preserving the remaining delay while hidden. */
export function waitForVisibleDuration(duration: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    let remaining = Math.max(0, duration)
    let started = 0
    let timer: number | undefined

    const cleanup = () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      signal.removeEventListener('abort', onAbort)
    }

    const finish = () => {
      cleanup()
      resolve()
    }

    const onAbort = () => {
      cleanup()
      reject(signal.reason)
    }

    const onVisibilityChange = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer)
        remaining = Math.max(0, remaining - (performance.now() - started))
        timer = undefined
      }

      if (document.visibilityState === 'visible') {
        started = performance.now()
        timer = window.setTimeout(finish, remaining)
      }
    }

    signal.addEventListener('abort', onAbort, { once: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    onVisibilityChange()
  })
}

/** Let React commit the transparent incoming layer before changing its opacity. */
export function waitForPaint(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    let frame: number

    const onAbort = () => {
      window.cancelAnimationFrame(frame)
      reject(signal.reason)
    }

    signal.addEventListener('abort', onAbort, { once: true })
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      })
    })
  })
}

/** Load and decode offscreen; false means this file should be skipped. */
export function preloadPhoto(url: string, signal: AbortSignal, priority: 'high' | 'low' = 'low'): Promise<boolean> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const image = new Image()
    image.decoding = 'async'
    image.fetchPriority = priority
    let settled = false

    const cleanup = () => {
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', onAbort)
    }

    const finish = (loaded: boolean) => {
      if (settled) return
      settled = true
      cleanup()
      if (!loaded) image.removeAttribute('src')
      resolve(loaded)
    }

    const onAbort = () => {
      if (settled) return
      settled = true
      cleanup()
      image.removeAttribute('src')
      reject(signal.reason)
    }

    image.onload = () => {
      // Keep the abort listener active while decode is pending.
      void image.decode().then(
        () => { if (!signal.aborted) finish(true) },
        () => { if (!signal.aborted) finish(false) },
      )
    }
    image.onerror = () => finish(false)
    const timeout = window.setTimeout(() => finish(false), PHOTO_LOAD_TIMEOUT_MS)
    signal.addEventListener('abort', onAbort, { once: true })
    image.src = url
  })
}
