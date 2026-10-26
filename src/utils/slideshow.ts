/** Search once around the sequence, skipping the current and broken files. */
export async function findNextPhoto(
  photos: readonly string[],
  after: number,
  failed: Set<string>,
  signal: AbortSignal,
): Promise<number | null> {
  for (let offset = 1; offset <= photos.length; offset += 1) {
    signal.throwIfAborted()
    const index = (after + offset) % photos.length
    const url = photos[index]
    if (index === after || failed.has(url)) continue
    if (await preloadPhoto(url, signal, after < 0 ? 'high' : 'low')) return index
    failed.add(url)
  }
  return null
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

    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', onAbort)
    }

    const finish = (loaded: boolean) => {
      cleanup()
      resolve(loaded)
    }

    const onAbort = () => {
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
    signal.addEventListener('abort', onAbort, { once: true })
    image.src = url
  })
}
