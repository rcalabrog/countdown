import type { CSSProperties } from 'react'
import { effects } from '../config/effects'

// Deterministic samples: no randomness, viewport listeners or per-render work.
const sample = (index: number, salt: number) => {
  const hash = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 1, 0x27d4eb2d)
  return (Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0) / 2 ** 32
}

const { petals } = effects
const particles = Array.from({ length: Math.max(petals.desktopCount, petals.mobileCount) }, (_, index) => {
  const duration = petals.minFallDurationMs
    + sample(index, 1) * (petals.maxFallDurationMs - petals.minFallDurationMs)

  return {
    id: index,
    style: {
      '--desktop-display': index < petals.desktopCount ? 'block' : 'none',
      '--mobile-display': index < petals.mobileCount ? 'block' : 'none',
      '--petal-left': `${5 + sample(index, 2) * 90}%`,
      '--petal-size': `${8 + sample(index, 3) * 8}px`,
      '--petal-alpha': petals.opacity * (0.55 + sample(index, 4) * 0.45),
      '--fall-duration': `${duration}ms`,
      '--fall-delay': `${-sample(index, 5) * duration}ms`,
      '--drift': `${-45 + sample(index, 6) * 90}px`,
      '--sway-distance': `${12 + sample(index, 7) * 22}px`,
      '--sway-duration': `${5_000 + sample(index, 8) * 4_000}ms`,
      '--sway-delay': `${-sample(index, 9) * 9_000}ms`,
      '--turn-duration': `${16_000 + sample(index, 10) * 12_000}ms`,
      '--turn-delay': `${-sample(index, 11) * 28_000}ms`,
      '--turn-start': `${sample(index, 12) * 360}deg`,
      '--turn-distance': `${-100 + sample(index, 13) * 260}deg`,
    } as CSSProperties,
  }
})

export function SakuraParticles() {
  return (
    <div className="sakura-particles" aria-hidden="true">
      {particles.map(({ id, style }) => (
        <span className="sakura-particle" key={id} style={style}>
          <span className="sakura-particle__sway">
            <span className="sakura-particle__petal" />
          </span>
        </span>
      ))}
    </div>
  )
}
