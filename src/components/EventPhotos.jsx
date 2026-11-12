import { useCallback, useEffect, useRef, useState } from 'react'
import { readError } from '../accents.js'
import { useAuth } from '../auth.jsx'
import { smallUrl } from '../photoUrls.js'
import { Spinner } from './Loaders.jsx'

const PAGE = 24

const Trash = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
)

const keyOf = (p) => `${p.kind}/${p.uploadId ?? `${p.sourceId}/${p.name}`}`

/**
 * The event's Photos tab for the organizer: what the cameras and the guests added, newest first, a few at a time.
 * Each photo says where it came from. Delete removes one photo for everyone; Block stops a guest adding more (their photos stay until deleted).
 */
export default function EventPhotos({ eventId, uploadsOn, onOpenSettings }) {
  const { apiFetch } = useAuth()
  const [items, setItems] = useState([])
  const [sources, setSources] = useState(null)
  const [total, setTotal] = useState(0)
  const [next, setNext] = useState(0) // offset of the next page; null when everything is loaded
  const [source, setSource] = useState('') // '' = everyone
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(null) // a photo key, or `guest:<id>` while the backend works
  const generation = useRef(0) // bumped when the source changes, so a late answer for the old one is ignored

  const more = useCallback(async (offset, chosen) => {
    const mine = generation.current
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ offset: String(offset), limit: String(PAGE) })
      if (chosen) query.set('source', chosen)
      const r = await apiFetch(`/api/v1/events/${eventId}/photos?${query}`)
      if (!r.ok) throw new Error(await readError(r, `Could not load the photos (${r.status})`))
      const page = await r.json()
      if (mine !== generation.current) return
      setItems((old) => {
        const seen = new Set(old.map(keyOf))
        return offset === 0 ? page.items : [...old, ...page.items.filter((p) => !seen.has(keyOf(p)))]
      })
      setSources(page.sources)
      setTotal(page.total)
      setNext(page.next)
    } catch (e) {
      if (mine === generation.current) setError(e.message)
    } finally {
      if (mine === generation.current) setLoading(false)
    }
  }, [apiFetch, eventId])

  useEffect(() => { more(0, '') }, [more])

  function choose(id) {
    generation.current += 1
    setSource(id)
    setItems([])
    setNext(0)
    more(0, id)
  }

  function forget(photo) {
    setItems((old) => old.filter((p) => keyOf(p) !== keyOf(photo)))
    setTotal((n) => Math.max(0, n - 1))
    setSources((old) => old?.map((s) => (s.id === photo.sourceId ? { ...s, count: Math.max(0, s.count - 1) } : s)))
  }

  async function remove(photo) {
    if (!confirm(`Delete this photo from ${photo.source}? It disappears from the gallery for everyone. This cannot be undone.`)) return
    setWorking(keyOf(photo))
    setError(null)
    try {
      const path = photo.kind === 'guest'
        ? `/api/v1/events/${eventId}/guest-photos/${photo.uploadId}`
        : `/api/v1/events/${eventId}/camera-photos?${new URLSearchParams({ camera: photo.sourceId, name: photo.name })}`
      const r = await apiFetch(path, { method: 'DELETE' })
      if (!r.ok) throw new Error(await readError(r, `Could not delete the photo (${r.status})`))
      forget(photo)
    } catch (e) {
      setError(e.message)
    }
    setWorking(null)
  }

  async function setBlocked(guest, blocked) {
    const ask = blocked
      ? `Block ${guest.label}? They can no longer add photos to this event. Photos they already added stay until you delete them.`
      : `Let ${guest.label} add photos to this event again?`
    if (!confirm(ask)) return
    setWorking(`guest:${guest.id}`)
    setError(null)
    try {
      const r = await apiFetch(`/api/v1/events/${eventId}/guests/${guest.id}/blocked`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      })
      if (!r.ok) throw new Error(await readError(r, `Could not ${blocked ? 'block' : 'unblock'} ${guest.label} (${r.status})`))
      setSources((old) => old.map((s) => (s.id === guest.id ? { ...s, blocked } : s)))
    } catch (e) {
      setError(e.message)
    }
    setWorking(null)
  }

  const chosen = sources?.find((s) => s.id === source)
  const empty = sources !== null && sources.every((s) => s.count === 0)
  return (
    <section className="guest-manage" aria-label="Photos of this event">
      <p className="muted guest-manage-intro">
        Everything your cameras and guests added, newest first. Delete any photo that should not be in the gallery, and block a guest to stop them adding more.
      </p>
      {!uploadsOn && (
        <p className="notice-warn" role="status">
          Guest uploads are switched off, so nobody can add photos right now. Photos already added are still in the gallery.
          {' '}<button type="button" className="link-btn" onClick={onOpenSettings}>Change this in the event settings</button>
        </p>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      {sources && sources.length > 1 && !empty && (
        <nav className="tabs camera-filter" aria-label="Show the photos of one camera or guest">
          <button type="button" className="tab" aria-pressed={source === ''} onClick={() => choose('')}>All</button>
          {sources.map((s) => (
            <button key={s.id} type="button" className={`tab tag-${s.kind}`} aria-pressed={source === s.id} onClick={() => choose(s.id)}>
              {s.label} <small>{s.count}</small>
              {s.blocked && <span className="status-pill blocked">Blocked</span>}
            </button>
          ))}
        </nav>
      )}
      {chosen?.kind === 'guest' && (
        <p className="guest-line">
          <span className="muted">{chosen.blocked ? `${chosen.label} is blocked and cannot add photos.` : `Photos added by ${chosen.label}.`}</span>
          <button type="button" className={chosen.blocked ? '' : 'danger'} onClick={() => setBlocked(chosen, !chosen.blocked)} disabled={working !== null}>
            {working === `guest:${chosen.id}` && <Spinner />}{chosen.blocked ? 'Unblock' : 'Block'}
          </button>
        </p>
      )}
      {empty && <p className="empty">{uploadsOn ? 'No photos yet. They show up here as soon as a camera or a guest adds one.' : 'No photo has been added to this event yet.'}</p>}
      {sources === null && loading && <p className="muted" role="status"><Spinner /> Loading photos…</p>}
      {(items.length > 0 || next !== null) && !empty && (
        <ul className="manage-grid">
          {items.map((p) => (
            <li key={keyOf(p)}>
              <img src={smallUrl(p)} onError={(e) => { if (e.currentTarget.src !== p.url) e.currentTarget.src = p.url }} alt={`Photo from ${p.source}`} loading="lazy" />
              <span className="manage-from">{p.source}</span>
              <button type="button" className="manage-delete" onClick={() => remove(p)} disabled={working !== null}
                aria-label={`Delete this photo from ${p.source}`} title="Delete this photo">
                {working === keyOf(p) ? <Spinner /> : <Trash />}
              </button>
            </li>
          ))}
          {next !== null && (
            <li className="manage-more">
              <button type="button" onClick={() => more(next, source)} disabled={loading}>
                {loading ? <Spinner /> : <span className="manage-more-plus" aria-hidden="true">+</span>}
                <span>{loading ? 'Loading…' : 'Load next'}</span>
                {!loading && <small>{Math.max(0, total - items.length)} more</small>}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
