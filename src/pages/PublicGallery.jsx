import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import FaceSearch from '../components/FaceSearch.jsx'
import GuestUpload from '../components/GuestUpload.jsx'
import Lightbox from '../components/Lightbox.jsx'
import PasswordGate from '../components/PasswordGate.jsx'
import { passwordHeaders, readPassword, writePassword } from '../eventAccess.js'
import { visibleFolders } from '../faceSearch.js'
import { LazyPhoto, PhotoGridSkeleton, TopBar } from '../components/Loaders.jsx'
import { smallUrl } from '../photoUrls.js'
import TagFilter from '../components/TagFilter.jsx'

const API_URL = import.meta.env.VITE_API_URL

/** Guest view behind the QR code: camera folders as tabs, photos in a masonry grid. No sign-in. */
export default function PublicGallery() {
  const { token, slug, eventSlug } = useParams()
  const [gallery, setGallery] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(() => new Set()) // ids of the cameras/guests picked as tags; none = everything
  const [reload, setReload] = useState(0)
  const [openIndex, setOpenIndex] = useState(null)
  const [password, setPassword] = useState(() => readPassword(slug ?? token, eventSlug ?? ''))
  const [gate, setGate] = useState(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [face, setFace] = useState(null) // the answer of a face search: { matches, indexed, total }; null = no face filter

  useEffect(() => {
    document.title = 'Photos'
    const path = slug
      ? `/api/v1/public/photographers/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventSlug)}`
      : `/api/v1/public/events/${encodeURIComponent(token)}`
    fetch(`${API_URL}${path}`, { headers: passwordHeaders(password) })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          if (r.status === 403) { writePassword(slug ?? token, eventSlug ?? '', ''); setPassword('') }
          setGate({ message: r.status === 403 ? 'That password is not right.' : null })
          return null
        }
        setGate(null)
        return r
      })
      .then((r) => (r === null ? null : r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'This gallery does not exist. Check the link or scan the code again.' : r.status === 410 ? 'This gallery has expired. The photographer’s photos are no longer online.' : 'Could not load the photos. Try again in a moment.'))))
      .then((g) => { if (g) { setGallery(g); document.title = g.name } })
      .catch((e) => setError(e.message))
  }, [token, slug, eventSlug, password, reload])

  const visible = useMemo(
    () => (gallery ? visibleFolders(gallery.folders, selected, face ? face.matches : null) : []),
    [gallery, selected, face],
  )
  const flat = useMemo(() => visible.flatMap((f) => f.photos.map((p) => ({ ...p, kind: f.kind }))), [visible])
  const total = gallery ? gallery.folders.reduce((n, f) => n + f.photos.length, 0) : 0
  const tags = useMemo(
    () => (gallery ? gallery.folders.map((f) => ({ id: f.id, label: f.name, kind: f.kind, count: f.photos.length })) : []),
    [gallery],
  )
  const shown = flat.length

  const close = useCallback(() => setOpenIndex(null), [])

  if (gate) {
    return (
      <main className="gallery">
        <PasswordGate message={gate.message} onSubmit={(v) => { writePassword(slug ?? token, eventSlug ?? '', v); setGate(null); setPassword(v) }} />
      </main>
    )
  }
  if (error) return <main className="gallery"><p role="alert" className="error gallery-head">{error}</p></main>
  if (!gallery) {
    return (
      <main className="gallery" aria-busy="true">
        <TopBar />
        <header className="gallery-head">
          <div className="skeleton line" style={{ width: '50%', height: 48, marginBottom: 12 }} />
          <div className="skeleton line" style={{ width: '20%' }} />
        </header>
        <PhotoGridSkeleton />
      </main>
    )
  }

  const offsets = visible.map((_, i) => visible.slice(0, i).reduce((n, f) => n + f.photos.length, 0))

  return (
    <main className="gallery">
      <header className="gallery-head">
        {slug && <Link to={`/${slug}`} className="crumb">All events by {slug}</Link>}
        <h1>{gallery.name}</h1>
        {slug && <GuestUpload slug={slug} eventSlug={eventSlug} limit={gallery.guestLimit} password={password} onUploaded={() => setReload((n) => n + 1)} />}
        <p className="muted">{total === 0 ? 'No photos yet. They appear here as the photographers upload.' : `${total} ${total === 1 ? 'photo' : 'photos'}`}</p>
      </header>

      {gallery.faceSearch && slug && !face && (
        <div className="find-me">
          <button type="button" className="primary" onClick={() => setScanOpen(true)}>Find my photos</button>
          <span className="muted">Scan your face to see only the photos you are in.</span>
        </div>
      )}
      <TagFilter tags={tags} selected={selected} onChange={setSelected}
        mine={{ active: Boolean(face), count: face ? face.matches.length : 0, onClear: () => setFace(null) }} />
      {(selected.size > 0 || face) && <p className="muted" role="status">{shown} {shown === 1 ? 'photo' : 'photos'} match your choice.</p>}
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

      {visible.map((f, fi) => (
        <section key={f.id} className="photo-group">
          {visible.length > 1 && <h2>{f.name}</h2>}
          {f.photos.length === 0 ? (
            <p className="empty">Nothing from {f.name} yet.</p>
          ) : (
            <div className="masonry">
              {f.photos.map((p, pi) => (
<LazyPhoto key={p.name} src={smallUrl(p)} fallback={p.url} label={`Open photo ${p.name}`} onOpen={() => setOpenIndex(offsets[fi] + pi)} />
              ))}
            </div>
          )}
        </section>
      ))}

      <footer className="gallery-foot"><Link to="/" className="logo-link" aria-label="Go to the imemories home page"><Logo label={false} /></Link><Link to="/terms" className="legal-link">Terms</Link><Link to="/privacy" className="legal-link">Privacy policy</Link><Link to="/refunds" className="legal-link">Refunds</Link></footer>

      {gallery.faceSearch && slug && (
        <FaceSearch open={scanOpen} onClose={() => setScanOpen(false)} searchOptions={{ slug, eventSlug, password }}
          onFound={(result) => { setFace(result); setSelected(new Set()); window.scrollTo({ top: 0 }) }} />
      )}

      <Lightbox photos={flat} index={openIndex} onIndex={setOpenIndex} onClose={close} logoUrl={gallery.logoUrl ?? ''} canEdit={gallery.features?.editor ?? true} />
    </main>
  )
}
