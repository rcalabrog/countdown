import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { itinerary, itinerarySummary, type TravelLeg } from '../config/itinerary'
import './TripTimeline.css'

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric', month: 'short', timeZone: 'UTC',
})

const dateLabel = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00Z`))

function FlightMilestone({ leg }: { leg: TravelLeg }) {
  return (
    <section className="trip-flight" aria-label={leg.label}>
      <h3>{leg.label}</h3>
      <dl>
        {[leg.departure, leg.arrival].map((moment, index) => (
          <div key={moment.at}>
            <dt>{index === 0 ? 'Salida' : 'Llegada'} · {moment.location}</dt>
            <dd>
              <time dateTime={moment.at}>
                {new Intl.DateTimeFormat('es-ES', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: moment.timeZone,
                }).format(new Date(moment.at))}
              </time>
              <span className="trip-flight__zone">{moment.timeZoneLabel}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function TripTimeline() {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const restoreScroll = useRef<(() => void) | null>(null)

  useEffect(() => () => { restoreScroll.current?.() }, [])

  const close = () => {
    restoreScroll.current?.()
    restoreScroll.current = null
    trigger.current?.focus({ preventScroll: true })
  }

  const open = () => {
    const panel = dialog.current
    if (!panel || panel.open) return

    panel.showModal()
    panel.scrollTop = 0

    const root = document.documentElement
    const previousOverflow = root.style.overflow
    const previousPadding = root.style.paddingRight
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth)
    const padding = Number.parseFloat(window.getComputedStyle(root).paddingRight) || 0
    root.style.overflow = 'hidden'
    if (scrollbarWidth > 0) root.style.paddingRight = `${padding + scrollbarWidth}px`
    restoreScroll.current = () => {
      root.style.overflow = previousOverflow
      root.style.paddingRight = previousPadding
    }
  }

  const panel = (
    <dialog className="trip-dialog" id={`${id}-dialog`} ref={dialog} onClose={close}
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-summary`}>
      <header className="trip-dialog__header">
        <div>
          <h2 id={`${id}-title`}>Nuestro viaje</h2>
          <p id={`${id}-summary`}>Japón {itinerary.year} · {itinerarySummary.nights} noches</p>
        </div>
        <button className="trip-dialog__close" type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar itinerario">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="trip-dialog__content">
        <p className="trip-dialog__route">{itinerary.stages.map((stage) => stage.city).join(' → ')}</p>
        <p className="trip-dialog__facts">{itinerarySummary.cities} ciudades principales · {itinerarySummary.excursions} excursiones confirmadas</p>

        <FlightMilestone leg={itinerary.outbound} />

        <ol className="trip-stages" aria-label="Etapas de alojamiento">
          {itinerary.stages.map((stage, index) => (
            <li className="trip-stage" key={stage.city}>
              <span className="trip-stage__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <article className="trip-stage__card">
                <header className="trip-stage__header">
                  <h3>{stage.city}</h3>
                  <span className="trip-stage__nights">{stage.nights} noches</span>
                </header>
                <p className="trip-stage__dates">
                  <time dateTime={stage.startDate}>{dateLabel(stage.startDate)}</time>
                  {' — '}
                  <time dateTime={stage.endDate}>{dateLabel(stage.endDate)}</time>
                </p>
                {stage.transfer && (
                  <p className="trip-stage__transfer">
                    Desde {stage.transfer.from} · <time dateTime={stage.transfer.date}>{dateLabel(stage.transfer.date)}</time>
                    {stage.transfer.transport && ` · ${stage.transfer.transport}`}
                  </p>
                )}
                {stage.excursions.map((excursion) => (
                  <div className="trip-excursion" key={`${excursion.destination}-${excursion.date}`}>
                    <p>Excursión a {excursion.destination} <span>·</span> <time dateTime={excursion.date}>{dateLabel(excursion.date)}</time></p>
                    <p>{excursion.description}</p>
                  </div>
                ))}
              </article>
            </li>
          ))}
        </ol>

        <FlightMilestone leg={itinerary.homebound} />
        <p className="trip-dialog__note">Todas las horas son locales.</p>
      </div>
    </dialog>
  )

  return (
    <div className="trip-access">
      <button className="trip-trigger" type="button" ref={trigger} onClick={open}
        aria-haspopup="dialog" aria-controls={`${id}-dialog`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z" strokeLinejoin="round" />
          <path d="M9 3v16M15 5v16" />
        </svg>
        Explorar nuestro viaje
      </button>
      {typeof document !== 'undefined' && createPortal(panel, document.body)}
    </div>
  )
}
