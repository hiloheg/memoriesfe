import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDay } from '../dates.js'
import { passwordHeaders, readPassword, writePassword } from '../eventAccess.js'
import Lightbox from './Lightbox.jsx'
import PasswordGate from './PasswordGate.jsx'
import { LazyPhoto, TopBar } from './Loaders.jsx'

const API_URL = import.meta.env.VITE_API_URL
const PAGE = 12
const MAX = 33 // the profile shows only the newest 33 photos

/** Same rule as the event gallery: up to 4 columns, none narrower than 150px. */
const columnsFor = (width) => Math.max(1, Math.min(4, Math.floor((width + 8) / 158)))

/**
 * The main event shown as photos right on the profile: newest upload first,
 * more photos load by themselves as the visitor scrolls.
 */
export default function PhotoStream({ slug, eventSlug, fallbackName, fallbackDate }) {
  const [info, setInfo] = useState({ name: fallbackName, eventDate: fallbackDate, total: null })
  const [photos, setPhotos] = useState([])
  const [next, setNext] = useState(0) // offset of the next page; null when everything is loaded
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openIndex, setOpenIndex] = useState(null)
  const [password, setPassword] = useState(() => readPassword(slug, eventSlug))
  const [gate, setGate] = useState(null) // { message } while the event asks for a password
  const busy = useRef(false)
  const sentinel = useRef(null)
  const grid = useRef(null)
  const [cols, setCols] = useState(3)
  const hasPhotos = photos.length > 0

  // Photos go into fixed columns in order, so new pages are added at the bottom without the grid reshuffling.
  useEffect(() => {
    const el = grid.current
    if (!el) return
    const update = () => setCols(columnsFor(el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasPhotos])

  const more = useCallback(async () => {
    if (busy.current || next === null) return
    busy.current = true
    setLoading(true)
    setError(null)
    try {
      const url = `${API_URL}/api/v1/public/photographers/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventSlug)}/photos?offset=${next}&limit=${Math.min(PAGE, MAX - next)}`
      const r = await fetch(url, { headers: passwordHeaders(password) })
      if (r.status === 401 || r.status === 403) {
        if (r.status === 403) { writePassword(slug, eventSlug, ''); setPassword('') }
        setGate({ message: r.status === 403 ? 'That password is not right.' : null })
        return
      }
      setGate(null)
      if (!r.ok) throw new Error('Could not load the photos.')
      const page = await r.json()
      setInfo({ name: page.name, eventDate: page.eventDate, total: page.total })
      // Photos uploaded meanwhile shift the offsets, so skip any we already have.
      setPhotos((old) => {
        const seen = new Set(old.map((p) => `${p.camera}/${p.name}`))
        return [...old, ...page.photos.filter((p) => !seen.has(`${p.camera}/${p.name}`))]
      })
      setNext(page.next === null || page.next >= MAX ? null : page.next)
    } catch (e) {
      setError(e.message)
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [slug, eventSlug, next, password])

  // Load when the end of the grid comes near the screen; photos.length re-arms the observer after each page.
  useEffect(() => {
    const el = sentinel.current
    if (!el || next === null || error || gate) return
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) more() }, { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, next, error, gate, photos.length])

  const done = next === null
  function unlock(value) {
    writePassword(slug, eventSlug, value)
    setGate(null)
    setPassword(value)
  }
  return (
    <section className="photo-stream" aria-label="Photos">
      <h2 className="stream-title">
        Photos - {info.name}
        {info.eventDate && <span className="stream-date">{formatDay(info.eventDate)}</span>}
      </h2>
      {photos.length > 0 && (
        <p className="muted">{Math.min(info.total, MAX)} {Math.min(info.total, MAX) === 1 ? 'photo' : 'photos'}</p>
      )}

      {photos.length > 0 && (
        <div className="stream-cols" ref={grid}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="stream-col">
              {photos.map((p, i) => i % cols === c && (
                <LazyPhoto key={`${p.camera}/${p.name}`} src={p.url} label={`Open photo ${i + 1}`} onOpen={() => setOpenIndex(i)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {gate && <PasswordGate eventName={info.name} message={gate.message} onSubmit={unlock} />}
      {done && photos.length === 0 && !error && !gate && <p className="empty">No photos yet. They appear here as the photographers upload.</p>}
      {loading && <TopBar />}
      {error && (
        <p role="alert" className="error">{error} <button type="button" onClick={more}>Try again</button></p>
      )}
      {!done && !gate && <div ref={sentinel} className="stream-sentinel" aria-hidden="true" />}

      <Lightbox photos={photos} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} onNearEnd={more} />
    </section>
  )
}
