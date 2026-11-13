import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { reopenConsent } from '../consent.js'
import { themeVars } from '../backgrounds.js'
import Backdrop from '../components/Backdrop.jsx'
import Logo from '../components/Logo.jsx'
import { HeroSkeleton, TilesSkeleton, TopBar } from '../components/Loaders.jsx'
import PhotoStream from '../components/PhotoStream.jsx'
import { frameClass } from '../frames.js'
import ProfileHero from '../components/ProfileHero.jsx'
import { formatDay } from '../dates.js'
import { EventBadge } from '../eventIcons.jsx'
import { readAgreed, readFollowed, writeAgreed, writeFollowed } from '../social.js'

const API_URL = import.meta.env.VITE_API_URL

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** What a visitor must do before the photos show: agree to the privacy policy first, then open every follow button (if asked). */
function GatePanel({ name, links, followed, onOpen, agreed, onAgree }) {
  const done = links.filter((l) => followed.has(l.url)).length
  const first = name.split(' ')[0]
  const hasLinks = links.length > 0
  return (
    <section className={agreed ? 'follow gate agreed' : 'follow gate'} aria-labelledby="follow-title">
      <h2 id="follow-title">{hasLinks ? `Follow ${first} to see the photos` : `Agree to see ${first}'s photos`}</h2>

      <label className="gate-agree">
        {hasLinks && <span className="gate-step" aria-hidden="true">1</span>}
        <input type="checkbox" checked={agreed} onChange={(e) => e.target.checked && onAgree()} />
        <span className="gate-box" aria-hidden="true"><Check /></span>
        <span className="gate-agree-text">
          <strong>{agreed ? 'Privacy policy accepted' : 'Agree to the privacy policy'}</strong>
          <small>
            {agreed ? 'You will not be asked again on this device.' : <>I have read the <Link to="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</Link> and agree to how my data is handled.</>}
          </small>
        </span>
      </label>

      {hasLinks && (
        <div className={agreed ? 'gate-follow' : 'gate-follow waiting'}>
          <p className="gate-follow-head">
            <span className="gate-step" aria-hidden="true">2</span>
            <span aria-live="polite">
              {!agreed ? 'Follow buttons open after you agree.' : done === 0 ? 'Open each button below. The photos unlock after the last one.' : `${done} of ${links.length} opened. ${links.length - done} to go.`}
            </span>
          </p>
          <ul className="follow-list">
            {links.map((l) => {
              const isDone = followed.has(l.url)
              return (
                <li key={l.id}>
                  <a className={isDone ? 'follow-btn done' : 'follow-btn'} href={agreed ? l.url : undefined} target="_blank" rel="noopener noreferrer"
                    role={agreed ? undefined : 'link'} aria-disabled={!agreed || undefined} tabIndex={agreed ? undefined : -1}
                    onClick={(e) => { if (!agreed) return e.preventDefault(); onOpen(l.url) }}>
                    <span className="follow-check">{isDone && <Check />}</span>
                    {l.label}
                    {isDone && <span className="sr-only"> (opened)</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

function LockedTiles({ count = 3 }) {
  return (
    <ul className="events" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => i).map((i) => (
        <li key={i}>
          <div className="event-tile locked"><Lock /><span>Unlocks after the steps above</span></div>
        </li>
      ))}
    </ul>
  )
}

/** A photographer's public page (imemories.eu/their-name): who they are, follow buttons and their events. No sign-in. */
function ProfilePage({ slug, eventSlug }) {
  const [page, setPage] = useState(null)
  const [error, setError] = useState(null)
  const [followed, setFollowed] = useState(() => readFollowed(slug))
  const [justUnlocked, setJustUnlocked] = useState(false)
  const [agreed, setAgreed] = useState(readAgreed)

  useEffect(() => {
    document.title = 'Photos'
    fetch(`${API_URL}/api/v1/public/photographers/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'We could not find this page. Check the address or scan the code again.' : 'Could not load the page. Try again in a moment.'))))
      .then((p) => { setPage(p); document.title = p.name })
      .catch((e) => setError(e.message))
  }, [slug])

  if (error) return <main className="gallery"><p role="alert" className="error gallery-head">{error}</p></main>
  if (!page) return <main className="gallery" aria-busy="true"><TopBar /><HeroSkeleton /><TilesSkeleton count={3} /></main>

  const gated = page.followGate && page.links.length > 0
  const followsDone = !gated || page.links.every((l) => followed.has(l.url))
  const locked = !followsDone || !agreed

  function open(url) {
    const next = new Set(followed).add(url)
    setFollowed(next)
    writeFollowed(slug, next)
    if (locked && agreed && page.links.every((l) => next.has(l.url))) setJustUnlocked(true)
  }

  function agree() {
    setAgreed(true)
    writeAgreed()
    if (followsDone) setJustUnlocked(true)
  }

  return (
    <div className={`profile-bg ${frameClass(page.background?.frame)}`} style={themeVars(page)}>
    <Backdrop bg={page.background} />
    <main className="gallery profile-page">
      <ProfileHero profile={page} href={eventSlug && !page.featured ? `/${page.slug}` : undefined} />

      {locked && <GatePanel name={page.name} links={gated ? page.links : []} followed={followed} onOpen={open} agreed={agreed} onAgree={agree} />}

      {!locked && page.links.length > 0 && (
        <section className="social-card" aria-label={`Follow ${page.name}`}>
          <div className="profile-links">
            {page.links.map((l) => <a key={l.id} className="chip" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>)}
          </div>
        </section>
      )}

      {!locked && (eventSlug || page.featured) ? (
        <>
          {eventSlug && !page.featured && (
            <Link to={`/${page.slug}`} className="crumb stream-back">All events by {page.name}</Link>
          )}
          <PhotoStream key={eventSlug ?? page.events[0].slug} slug={page.slug} eventSlug={eventSlug ?? page.events[0].slug}
            fallbackName={(page.events.find((e) => e.slug === (eventSlug ?? page.events[0].slug)) ?? page.events[0])?.name}
            fallbackDate={(page.events.find((e) => e.slug === (eventSlug ?? page.events[0].slug)) ?? page.events[0])?.eventDate} />
        </>
      ) : (
        <section className="profile-events">
          <h2>{locked ? (page.featured ? 'Photos' : 'Events') : page.events.length === 0 ? 'No events yet' : 'Events'}</h2>
          {locked ? (
            <LockedTiles count={page.featured ? 1 : 3} />
          ) : page.events.length === 0 ? (
            <p className="muted">Photos will appear here once {page.name.split(' ')[0]} adds an event.</p>
          ) : (
            <ul className={`events${justUnlocked ? ' reveal' : ''}`}>
              {page.events.map((ev, i) => (
                <li key={ev.slug} style={{ '--i': i }}>
                  <Link to={`/${page.slug}/${ev.slug}`} className="event-tile">
                    <EventBadge name={ev.icon} />
                    <strong>{ev.name}</strong>
                    <small>{formatDay(ev.eventDate)}</small>
                    {ev.locked && <span className="pill">Needs a password</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="gallery-foot"><Link to="/" className="logo-link" aria-label="Go to the imemories home page"><Logo label={false} /></Link><Link to="/terms" className="legal-link">Terms</Link><Link to="/privacy" className="legal-link">Privacy policy</Link><Link to="/refunds" className="legal-link">Refunds</Link><button type="button" className="linklike legal-link" onClick={reopenConsent}>Cookie settings</button></footer>
    </main>
    </div>
  )
}

export default function PublicProfile() {
  const { slug, eventSlug } = useParams()
  return <ProfilePage key={slug} slug={slug} eventSlug={eventSlug?.toLowerCase()} />
}
