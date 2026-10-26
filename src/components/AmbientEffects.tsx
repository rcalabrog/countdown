import { useEffect, useRef, type CSSProperties } from 'react'
import { effects } from '../config/effects'
import { SakuraParticles } from './SakuraParticles'
import './AmbientEffects.css'

const atmosphereStyle = {
  '--ambient-light-opacity': effects.lighting.opacity,
  '--ambient-light-duration': `${effects.lighting.cycleDurationMs}ms`,
} as CSSProperties

export function AmbientEffects() {
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = layer.current
    const updateVisibility = () => {
      element?.setAttribute('data-paused', String(document.visibilityState !== 'visible'))
    }

    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  return (
    <div className="ambient-effects" ref={layer} style={atmosphereStyle} data-paused="true" aria-hidden="true">
      <div className="ambient-light" />
      <SakuraParticles />
    </div>
  )
}
