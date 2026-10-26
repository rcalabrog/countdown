export type CountdownTime = {
  days: number
  hours: number
  minutes: number
  seconds: number
  isComplete: boolean
}

export function calculateCountdown(targetTimestamp: number, now = Date.now()): CountdownTime {
  // Round up so zero never appears before the actual departure.
  const totalSeconds = Math.max(0, Math.ceil((targetTimestamp - now) / 1000))

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isComplete: totalSeconds === 0,
  }
}
