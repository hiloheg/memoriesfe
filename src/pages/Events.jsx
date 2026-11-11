import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import NewEventDialog from '../components/NewEventDialog.jsx'
import { Avatar } from '../components/UserMenu.jsx'
import { TilesSkeleton } from '../components/Loaders.jsx'
import { eventStatus } from '../credits.js'
import { formatDay } from '../dates.js'
import { EventBadge } from '../eventIcons.jsx'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

/** One clear thing to do next, based on what the photographer has set up so far. */
function NextStep({ events, onCreate }) {
  if (events === null) return null
  const withoutCamera = events.find((ev) => ev.cameraCount === 0 && !ev.cameraAccessExpired)
  if (events.length === 0) {
    return (
      <div className="next">
        <div>
          <h2>Create your first event</h2>
          <p>Name the occasion, then add a camera for each photographer or angle.</p>
        </div>
        <button className="primary" onClick={onCreate}>Create an event</button>
      </div>
    )
  }
  if (withoutCamera) {
    return (
      <div className="next">
        <div>
          <h2>Add a camera to {withoutCamera.name}</h2>
          <p>Each camera gets its own FTP login and shows as a folder in the gallery.</p>
        </div>
        <Link className="btn primary" to={`/events/${withoutCamera.id}`}>Add a camera</Link>
      </div>
    )
  }
  return (
    <div className="next">
      <div>
        <h2>Share your QR code</h2>
        <p>Guests scan it to open your page and see the photos.</p>
      </div>
      <Link className="btn primary" to="/share">Open QR code</Link>
    </div>
  )
}

/** Home: what to do next, totals, and the events grid that starts with the "New event" tile. */
export default function Dashboard() {
  const { apiFetch, user } = useAuth()
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    apiFetch('/api/v1/events')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Could not load events (${r.status})`))))
      .then(setEvents)
      .catch((e) => setError(e.message))
  }, [apiFetch])

  useEffect(load, [load])

  const firstName = user.name && user.name !== 'null' ? user.name.split(' ')[0] : null
  const cameras = events ? events.reduce((n, ev) => n + ev.cameraCount, 0) : 0
  const noCamera = events ? events.filter((ev) => ev.cameraCount === 0).length : 0
  const mainEvent = events?.find((ev) => ev.main)

  return (
    <section className="dashboard">
      <div className="welcome">
        <Avatar user={user} size={52} />
        <div>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        </div>
        <a className="btn primary visit-hero" href={user.shareUrl} target="_blank" rel="noopener noreferrer">
          Visit my public page
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>

      <NextStep events={events} onCreate={() => setCreating(true)} />

      <div className="stats">
        <Stat value={events ? events.length : '–'} label={events?.length === 1 ? 'event' : 'events'} />
        <Stat value={events ? cameras : '–'} label={cameras === 1 ? 'camera' : 'cameras'} />
        <Stat value={events ? noCamera : '–'} label="need a camera" />
      </div>

      <div className="section-title">
        <h2>Your events</h2>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {mainEvent && (
        <p className="notice-info">Your page shows only <strong>{mainEvent.name}</strong>, your main event. Open it to change that.</p>
      )}

      {events === null ? (
        !error && <TilesSkeleton />
      ) : (
        <ul className="events">
          <li>
            <button type="button" className="event-tile new-tile" onClick={() => setCreating(true)}>
              <span className="new-plus" aria-hidden="true">+</span>
              New event
            </button>
          </li>
          {events.map((ev) => (
            <li key={ev.id}>
              <Link to={`/events/${ev.id}`} className="event-tile">
                <EventBadge name={ev.icon} />
                {(ev.main || ev.visibility !== 'public') && (
                  <span className="tile-badges">
                    {ev.main && <span className="status-pill main">Main</span>}
                    {ev.visibility === 'private' && <span className="status-pill">Private</span>}
                    {ev.visibility === 'protected' && <span className="status-pill">Protected</span>}
                  </span>
                )}
                <strong>{ev.name}</strong>
                {(() => {
                  const status = eventStatus(ev)
                  return status && <small className={`tile-status ${status.kind}`}>{status.text}</small>
                })()}
                <span className="tile-meta">
                  <small>{formatDay(ev.eventDate)}</small>
                  <span className={ev.cameraCount || ev.cameraAccessExpired ? 'pill' : 'pill pill-warn'}>
                    {ev.cameraCount ? `${ev.cameraCount} ${ev.cameraCount === 1 ? 'camera' : 'cameras'}` : ev.cameraAccessExpired ? 'Ended' : 'Add a camera'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewEventDialog open={creating} onClose={() => setCreating(false)} />
    </section>
  )
}
