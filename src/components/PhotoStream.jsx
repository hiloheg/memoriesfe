import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDay } from '../dates.js'
import { passwordHeaders, readPassword, writePassword } from '../eventAccess.js'
import GuestUpload from './GuestUpload.jsx'
import Lightbox from './Lightbox.jsx'
import PasswordGate from './PasswordGate.jsx'
import { LazyPhoto, TopBar } from './Loaders.jsx'
import { smallUrl } from '../photoUrls.js'
import TagFilter from './TagFilter.jsx'
import FaceSearch from './FaceSearch.jsx'
import { facePhotos } from '../faceSearch.js'

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
  const [info, setInfo] = useState({ name: fallbackName, eventDate: fallbackDate, total: null, logoUrl: '', canEdit: true })
  const [loaded, setLoaded] = useState([]) // the pages loaded so far
  const [faceOffered, setFaceOffered] = useState(false) // the server offers "Find my photos" for this event
  const [face, setFace] = useState(null) // the face search result while it is applied
  const [faceList, setFaceList] = useState([]) // the photos the face result points at
  const [scanOpen, setScanOpen] = useState(false)
  // With a face result applied the grid shows the guest's photos instead of the pages.
  const photos = face ? faceList : loaded
  const [tags, setTags] = useState([]) // cameras and guests of the event, from the first page
  const [selected, setSelected] = useState(() => new Set())
  const [guestLimit, setGuestLimit] = useState(0)
  const [next, setNext] = useState(0) // offset of the next page; null when everything is loaded
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openIndex, setOpenIndex] = useState(null)
  const [password, setPassword] = useState(() => readPassword(slug, eventSlug))
  const [gate, setGate] = useState(null) // { message } while the event asks for a password
  const busy = useRef(false)
  const generation = useRef(0) // bumped when the tags change, so a late answer for the old tags is ignored
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
    if (busy.current || next === null || face) return
    busy.current = true
    const mine = generation.current
    setLoading(true)
    setError(null)
    try {
      const url = `${API_URL}/api/v1/public/photographers/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventSlug)}/photos?offset=${next}&limit=${Math.min(PAGE, MAX - next)}${[...selected].map((id) => `&by=${encodeURIComponent(id)}`).join('')}`
      const r = await fetch(url, { headers: passwordHeaders(password) })
      if (mine !== generation.current) return
      if (r.status === 401 || r.status === 403) {
        if (r.status === 403) { writePassword(slug, eventSlug, ''); setPassword('') }
        setGate({ message: r.status === 403 ? 'That password is not right.' : null })
        return
      }
      setGate(null)
      if (!r.ok) throw new Error(r.status === 410 ? 'This gallery has expired. The photographer’s photos are no longer online.' : 'Could not load the photos.')
      const page = await r.json()
      if (mine !== generation.current) return
      // Keep the first logo URL: the server re-signs it on every page, and a changed string would reload the editor.
      setInfo((old) => ({ name: page.name, eventDate: page.eventDate, total: page.total, logoUrl: old.logoUrl || page.logoUrl || '', canEdit: page.features?.editor ?? true }))
      setTags(page.tags)
      setGuestLimit(page.guestLimit)
      setFaceOffered(page.faceSearch === true)
      // Photos uploaded meanwhile shift the offsets, so skip any we already have.
      setLoaded((old) => {
        const seen = new Set(old.map((p) => `${p.byId}/${p.name}`))
        return [...old, ...page.photos.filter((p) => !seen.has(`${p.byId}/${p.name}`))]
      })
      setNext(page.next === null || page.next >= MAX ? null : page.next)
    } catch (e) {
      if (mine === generation.current) setError(e.message)
    } finally {
      if (mine === generation.current) {
        busy.current = false
        setLoading(false)
      }
    }
  }, [slug, eventSlug, next, password, selected, face])

  // Load when the end of the grid comes near the screen; photos.length re-arms the observer after each page.
  useEffect(() => {
    const el = sentinel.current
    if (!el || next === null || error || gate) return
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) more() }, { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, next, error, gate, photos.length])

  const done = next === null || Boolean(face)
  /** The invitation to add photos: first in the grid, or on its own while the event has no photos yet. */
  const uploadTile = (
    <GuestUpload variant="tile" slug={slug} eventSlug={eventSlug} limit={guestLimit} password={password}
      onUploaded={() => { generation.current += 1; busy.current = false; setLoaded([]); setNext(0) }} />
  )
  /** Changing the tags starts the list again from the newest photo. */
  function pick(ids) {
    generation.current += 1
    busy.current = false
    setFace(null)
    setSelected(ids)
    setLoaded([])
    setNext(0)
    setError(null)
  }
  /** The guest scanned their face: fetch the whole event once and keep the photos they are in. */
  async function foundFace(result) {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_URL}/api/v1/public/photographers/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventSlug)}`, { headers: passwordHeaders(password) })
      if (!r.ok) throw new Error('Could not load your photos.')
      const gallery = await r.json()
      setFaceList(facePhotos(gallery.folders, result.matches))
      setFace(result)
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
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
      <TagFilter tags={tags} selected={selected} onChange={pick}
        mine={{ offered: faceOffered, active: Boolean(face), count: face ? face.matches.length : 0, onFind: () => setScanOpen(true), onClear: () => setFace(null) }} />
      {face && face.indexed < face.total && (
        <p className="muted" role="status">Still looking through the newest photos ({face.indexed} of {face.total}). Scan again in a minute for more.</p>
      )}
      {face && face.matches.length === 0 && (
        <div className="empty find-me">
          <p>We did not find you yet. Try a closer picture in good light, or check again later.</p>
          <button type="button" onClick={() => setScanOpen(true)}>Try again</button>
          <button type="button" onClick={() => setFace(null)}>Show all photos</button>
        </div>
      )}

      {photos.length > 0 && (
        <p className="muted">{Math.min(info.total, MAX)} {Math.min(info.total, MAX) === 1 ? 'photo' : 'photos'}</p>
      )}

      {photos.length > 0 && (
        <div className="stream-cols" ref={grid}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="stream-col">
              {c === 0 && uploadTile}
              {photos.map((p, i) => i % cols === c && (
                <LazyPhoto key={`${p.byId}/${p.name}`} src={smallUrl(p)} fallback={p.url} label={`Open photo ${i + 1}`} onOpen={() => setOpenIndex(i)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !gate && guestLimit > 0 && <div className="stream-tile-solo">{uploadTile}</div>}
      {gate && <PasswordGate eventName={info.name} message={gate.message} onSubmit={unlock} />}
      {done && photos.length === 0 && !error && !gate && !face && (
        <p className="empty">{selected.size > 0 ? 'No photos for these tags.' : 'No photos yet. They appear here as the photographers upload.'}</p>
      )}
      {loading && <TopBar />}
      {error && (
        <p role="alert" className="error">{error} <button type="button" onClick={more}>Try again</button></p>
      )}
      {!done && !gate && <div ref={sentinel} className="stream-sentinel" aria-hidden="true" />}

      {faceOffered && (
        <FaceSearch open={scanOpen} onClose={() => setScanOpen(false)} searchOptions={{ slug, eventSlug, password }} onFound={foundFace} />
      )}

      <Lightbox photos={photos} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} onNearEnd={more} logoUrl={info.logoUrl} canEdit={info.canEdit} />
    </section>
  )
}
