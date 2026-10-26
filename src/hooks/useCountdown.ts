import { useEffect, useState } from 'react'
import { calculateCountdown } from '../utils/countdown'

export function useCountdown(targetTimestamp: number) {
  const [time, setTime] = useState(() => calculateCountdown(targetTimestamp))
  const { isComplete } = time

  useEffect(() => {
    if (isComplete) return

    const update = () => {
      const nextTime = calculateCountdown(targetTimestamp)
      setTime(nextTime)

      if (nextTime.isComplete) window.clearInterval(intervalId)
    }

    const intervalId = window.setInterval(update, 1000)
    // Catch up when a background tab or sleeping device resumes.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') update()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [targetTimestamp, isComplete])

  return time
}
