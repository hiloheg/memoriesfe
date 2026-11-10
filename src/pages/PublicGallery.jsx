import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import Lightbox from '../components/Lightbox.jsx'
import PasswordGate from '../components/PasswordGate.jsx'
import { passwordHeaders, readPassword, writePassword } from '../eventAccess.js'
import { LazyPhoto, PhotoGridSkeleton, TopBar } from '../components/Loaders.jsx'

const API_URL = import.meta.env.VITE_API_URL

/** Guest view behind the QR code: camera folders as tabs, photos in a masonry grid. No sign-in. */
export default function PublicGallery() {
  const { token, slug, eventSlug } = useParams()
  const [gallery, setGallery] = useState(null)
  const [error, setError] = useState(null)
  const [folder, setFolder] = useState('all')
  const [openIndex, setOpenIndex] = useState(null)
  const [password, setPassword] = useState(() => readPassword(slug ?? token, eventSlug ?? ''))
  const [gate, setGate] = useState(null)

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
      .then((r) => (r === null ? null : r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'This gallery does not exist. Check the link or scan the code again.' : 'Could not load the photos. Try again in a moment.'))))
      .then((g) => { if (g) { setGallery(g); document.title = g.name } })
      .catch((e) => setError(e.message))
  }, [token, slug, eventSlug, password])

  const visible = useMemo(
    () => (gallery ? gallery.folders.filter((f) => folder === 'all' || f.id === folder) : []),
    [gallery, folder],
  )
  const flat = useMemo(() => visible.flatMap((f) => f.photos), [visible])
  const total = gallery ? gallery.folders.reduce((n, f) => n + f.photos.length, 0) : 0

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
        <p className="muted">{total === 0 ? 'No photos yet. They appear here as the photographers upload.' : `${total} ${total === 1 ? 'photo' : 'photos'}`}</p>
      </header>

      {gallery.folders.length > 1 && (
        <nav className="tabs" aria-label="Camera folders">
          <button className="tab" aria-pressed={folder === 'all'} onClick={() => setFolder('all')}>All <small>{total}</small></button>
          {gallery.folders.map((f) => (
            <button key={f.id} className="tab" aria-pressed={folder === f.id} onClick={() => setFolder(f.id)}>
              {f.name} <small>{f.photos.length}</small>
            </button>
          ))}
        </nav>
      )}

      {visible.map((f, fi) => (
        <section key={f.id} className="photo-group">
          {(gallery.folders.length > 1 && folder === 'all') && <h2>{f.name}</h2>}
          {f.photos.length === 0 ? (
            <p className="empty">Nothing from {f.name} yet.</p>
          ) : (
            <div className="masonry">
              {f.photos.map((p, pi) => (
<LazyPhoto key={p.name} src={p.url} label={`Open photo ${p.name}`} onOpen={() => setOpenIndex(offsets[fi] + pi)} />
              ))}
            </div>
          )}
        </section>
      ))}

      <footer className="gallery-foot"><Link to="/" className="logo-link" aria-label="Go to the imemories home page"><Logo label={false} /></Link><Link to="/privacy" className="legal-link">Privacy policy</Link></footer>

      <Lightbox photos={flat} index={openIndex} onIndex={setOpenIndex} onClose={close} />
    </main>
  )
}
