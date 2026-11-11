import { useCallback, useEffect, useMemo, useState } from 'react'
import { readError } from '../accents.js'
import { useAuth } from '../auth.jsx'
import { Spinner } from './Loaders.jsx'

/**
 * The event's Photos tab for the organizer: everything guests added, grouped by guest.
 * Delete removes one photo for everyone; Block stops that guest adding more (their photos stay until deleted).
 */
export default function GuestPhotos({ eventId, uploadsOn, onOpenSettings }) {
  const { apiFetch } = useAuth()
  const [photos, setPhotos] = useState(null)
  const [guests, setGuests] = useState(null)
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(null) // `photo:<id>` or `guest:<id>` while the backend works

  const load = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([
        apiFetch(`/api/v1/events/${eventId}/guest-photos`),
        apiFetch(`/api/v1/events/${eventId}/guests`),
      ])
      if (!p.ok) throw new Error(await readError(p, `Could not load the guest photos (${p.status})`))
      if (!g.ok) throw new Error(await readError(g, `Could not load the guests (${g.status})`))
      setPhotos(await p.json())
      setGuests(await g.json())
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [apiFetch, eventId])

  useEffect(() => { load() }, [load])

  const byGuest = useMemo(() => {
    const map = new Map()
    for (const p of photos ?? []) map.set(p.guestId, [...(map.get(p.guestId) ?? []), p])
    return map
  }, [photos])

  async function removePhoto(photo) {
    if (!confirm(`Delete this photo by ${photo.guestName}? It disappears from the gallery for everyone. This cannot be undone.`)) return
    setWorking(`photo:${photo.id}`)
    setError(null)
    try {
      const r = await apiFetch(`/api/v1/events/${eventId}/guest-photos/${photo.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(await readError(r, `Could not delete the photo (${r.status})`))
      setPhotos((old) => old.filter((p) => p.id !== photo.id))
      setGuests((old) => old.map((g) => (g.id === photo.guestId ? { ...g, photos: Math.max(0, g.photos - 1) } : g)))
    } catch (e) {
      setError(e.message)
    }
    setWorking(null)
  }

  async function setBlocked(guest, blocked) {
    const ask = blocked
      ? `Block ${guest.name}? They can no longer add photos to this event. Photos they already added stay until you delete them.`
      : `Let ${guest.name} add photos to this event again?`
    if (!confirm(ask)) return
    setWorking(`guest:${guest.id}`)
    setError(null)
    try {
      const r = await apiFetch(`/api/v1/events/${eventId}/guests/${guest.id}/blocked`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      })
      if (!r.ok) throw new Error(await readError(r, `Could not ${blocked ? 'block' : 'unblock'} ${guest.name} (${r.status})`))
      setGuests((old) => old.map((g) => (g.id === guest.id ? { ...g, blocked } : g)))
    } catch (e) {
      setError(e.message)
    }
    setWorking(null)
  }

  const loading = (photos === null || guests === null) && !error
  const nobody = guests?.length === 0

  return (
    <section className="guest-manage" aria-label="Photos added by guests">
      <p className="muted guest-manage-intro">
        Photos your guests add go live straight away. Delete any that should not be there, and block a guest to stop them adding more.
      </p>
      {!uploadsOn && (
        <p className="notice-warn" role="status">
          Guest uploads are switched off, so nobody can add photos right now. Photos already added are still in the gallery.
          {' '}<button type="button" className="link-btn" onClick={onOpenSettings}>Change this in the event settings</button>
        </p>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      {loading && <p className="muted" role="status"><Spinner /> Loading guest photos…</p>}
      {nobody && (
        <p className="empty">
          {uploadsOn ? 'No guest has added a photo yet. They show up here as soon as someone does.' : 'No guest has added a photo to this event.'}
        </p>
      )}

      <ul className="guest-list">
        {guests?.map((g) => {
          const mine = byGuest.get(g.id) ?? []
          return (
            <li key={g.id} className={`guest-block${g.blocked ? ' is-blocked' : ''}`}>
              <header className="guest-head">
                <span className="guest-avatar" aria-hidden="true">{g.name.trim().charAt(0).toUpperCase() || '?'}</span>
                <span className="guest-who">
                  <strong>{g.name}</strong>
                  <small className="muted">
                    {g.photos === 0 ? 'No photos in the gallery' : `${g.photos} ${g.photos === 1 ? 'photo' : 'photos'}`}
                    {g.blocked && <span className="status-pill blocked">Blocked</span>}
                  </small>
                </span>
                <button type="button" className={g.blocked ? '' : 'danger'} onClick={() => setBlocked(g, !g.blocked)} disabled={working !== null}>
                  {working === `guest:${g.id}` && <Spinner />}{g.blocked ? 'Unblock' : 'Block'}
                </button>
              </header>
              {mine.length > 0 && (
                <ul className="guest-photo-grid">
                  {mine.map((p) => (
                    <li key={p.id}>
                      <img src={p.url} alt={`Photo by ${p.guestName}`} loading="lazy" />
                      <button type="button" className="photo-delete" onClick={() => removePhoto(p)} disabled={working !== null}
                        aria-label={`Delete this photo by ${p.guestName}`}>
                        {working === `photo:${p.id}` ? <Spinner /> : 'Delete'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
