import { trip } from '../config/trip'
import { useCountdown } from '../hooks/useCountdown'

const units = [
  { key: 'days', label: 'Días' },
  { key: 'hours', label: 'Horas' },
  { key: 'minutes', label: 'Minutos' },
  { key: 'seconds', label: 'Segundos' },
] as const

export function Countdown({ targetTimestamp }: { targetTimestamp: number }) {
  const time = useCountdown(targetTimestamp)

  return (
    <section className="countdown" aria-labelledby="countdown-heading">
      {/* Only completion is announced; the ticking digits are never live. */}
      <p className={`countdown__status${time.isComplete ? ' countdown__status--complete' : ''}`} role="status">
        {time.isComplete ? trip.arrivalMessage : ''}
      </p>
      <dl className="countdown__units" aria-live="off">
        {units.map(({ key, label }) => (
          <div className={`time-block time-block--${key}`} key={key}>
            <dt className="time-block__label">{label}</dt>
            <dd className="time-block__value">
              {key === 'days' ? time[key] : String(time[key]).padStart(2, '0')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
