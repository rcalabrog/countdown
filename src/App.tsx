import { Countdown } from './components/Countdown'
import { trip } from './config/trip'
import type { CSSProperties } from 'react'
import { effects } from './config/effects'
import { AmbientEffects } from './components/AmbientEffects'
import { BackgroundSlideshow } from './components/BackgroundSlideshow'
import { TripTimeline } from './components/TripTimeline'
import './App.css'

const departureDate = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: trip.timeZone,
}).format(new Date(trip.departure))

const entranceStyle = {
  '--entrance-duration': `${effects.entranceDurationMs}ms`,
} as CSSProperties

const departureTime = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: trip.timeZone,
}).format(new Date(trip.departure))

function App() {
  return (
    <div className="journey" style={entranceStyle}>
      <div className="landscape" aria-hidden="true">
        <div className="landscape__sun" />
        <div className="landscape__ridge landscape__ridge--distant" />
        <div className="landscape__ridge landscape__ridge--near" />
        <BackgroundSlideshow />
      </div>
      <AmbientEffects />

      <header className="masthead">
        <span className="wordmark">
          <span className="sun-mark" aria-hidden="true" />
          THE COUNTDOWN
        </span>
        <span className="masthead__note">Un viaje para recordar</span>
      </header>

      <main className="hero">
        <span className="japanese-note" lang="ja" aria-hidden="true">日本への旅</span>
        <p className="eyebrow"><span aria-hidden="true" /> El próximo capítulo</p>
        <h1>{trip.title} <span>{trip.year}</span></h1>
        <p className="hero__subtitle" id="countdown-heading">El viaje comienza en...</p>

        <Countdown targetTimestamp={Date.parse(trip.departure)} />

        <p className="departure">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="m21 3-6 18-4-8-8-4 18-6Z" strokeLinejoin="round" />
            <path d="m11 13 5-5" strokeLinecap="round" />
          </svg>
          <time dateTime={trip.departure}>{departureDate} <span className="departure__divider">/</span> {departureTime}</time>
          <span className="departure__zone">Hora de {trip.timeZoneLabel}</span>
        </p>

        <div className="route">
          <span className="route__line" aria-hidden="true" />
          <p>
            {trip.route.map((city, index) => (
              <span key={city}>
                {index > 0 && <span className="route__dot"> · </span>}
                {city}
              </span>
            ))}
          </p>
          <span className="route__line" aria-hidden="true" />
        </div>
        <TripTimeline />
      </main>

      <footer className="footer">
        <p>Lejos de la rutina. Más cerca de Japón.</p>
        <span className="footer__signature"><span lang="ja">日本</span> <span aria-hidden="true">/</span> {trip.year}</span>
      </footer>
    </div>
  )
}

export default App
