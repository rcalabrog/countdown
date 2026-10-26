import { useEffect, useState, type CSSProperties } from 'react'
import { photos, SLIDE_DURATION_MS, TRANSITION_DURATION_MS } from '../config/slideshow'
import { findNextPhoto, waitForPaint, waitForVisibleDuration } from '../utils/slideshow'
import './BackgroundSlideshow.css'

type Frame = { current: string | null; incoming: string | null; fading: boolean }

const transitionStyle = {
  '--slideshow-transition': `${TRANSITION_DURATION_MS}ms`,
} as CSSProperties

export function BackgroundSlideshow() {
  const [frame, setFrame] = useState<Frame>({ current: null, incoming: null, fading: false })

  useEffect(() => {
    if (photos.length === 0) return

    const controller = new AbortController()
    const { signal } = controller
    const failed = new Set<string>()

    const findNext = (after: number) => findNextPhoto(photos, after, failed, signal)

    const run = async () => {
      const initial = await findNext(-1)
      if (initial === null) return
      let current: number = initial
      await waitForVisibleDuration(0, signal)
      signal.throwIfAborted()
      setFrame({ current: photos[current], incoming: null, fading: false })
      if (photos.length === 1) return

      let holdDuration = SLIDE_DURATION_MS
      while (!signal.aborted) {
        // Preload only the next usable file while the current photo stays visible.
        const [next] = await Promise.all([
          findNext(current),
          waitForVisibleDuration(holdDuration, signal),
        ])
        if (next === null) return
        await waitForVisibleDuration(0, signal)
        signal.throwIfAborted()

        const currentUrl = photos[current]
        const incomingUrl = photos[next]
        setFrame({ current: currentUrl, incoming: incomingUrl, fading: false })
        await waitForPaint(signal)
        await waitForVisibleDuration(0, signal)
        signal.throwIfAborted()
        setFrame({ current: currentUrl, incoming: incomingUrl, fading: true })

        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : TRANSITION_DURATION_MS
        await waitForVisibleDuration(duration, signal)
        signal.throwIfAborted()
        setFrame({ current: incomingUrl, incoming: null, fading: false })
        current = next
        // Keep successive transitions approximately 15 seconds apart.
        holdDuration = Math.max(0, SLIDE_DURATION_MS - duration)
      }
    }

    // Cleanup also cancels pending loads, paints and visibility waits in StrictMode.
    void run().catch((error: unknown) => {
      if (!signal.aborted) console.error('Unable to continue the background slideshow.', error)
    })
    return () => controller.abort()
  }, [])

  if (!frame.current) return null

  return (
    <div className="background-slideshow" style={transitionStyle} aria-hidden="true">
      {[frame.current, frame.incoming].map((url) => {
        if (!url) return null
        const incoming = url === frame.incoming
        const classes = [
          'background-slideshow__image',
          incoming && 'background-slideshow__image--incoming',
          incoming && frame.fading && 'background-slideshow__image--visible',
        ].filter(Boolean).join(' ')

        return <img key={url} src={url} alt="" draggable={false} decoding="async" className={classes} />
      })}
    </div>
  )
}
