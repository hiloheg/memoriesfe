import { useEffect, useRef, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { readError } from '../accents.js'
import { allowGoogle, useConsent } from '../consent.js'
import { passwordHeaders } from '../eventAccess.js'
import { guestFetch, readGuestToken, writeGuestToken } from '../guestAuth.js'
import { prepareImage } from '../prepareImage.js'
import { Spinner } from './Loaders.jsx'
import Modal from './Modal.jsx'

/** Google sign-in for guests. Google's script only loads once the visitor allows it, like on the home page. */
function GuestSignIn({ onToken }) {
  const consent = useConsent()
  if (!consent?.google) {
    return <button type="button" className="primary" onClick={() => allowGoogle()} title="This loads Google sign-in">Sign in with Google</button>
  }
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleLogin onSuccess={(res) => onToken(res.credential)} onError={() => alert('Google sign-in failed. Try again.')} shape="pill" text="signin_with" />
    </GoogleOAuthProvider>
  )
}

/** The steps inside the dialog: sign in, choose a photo, confirm, upload. Starts fresh every time the dialog opens. */
function Flow({ slug, eventSlug, password, onDone }) {
  const [token, setToken] = useState(readGuestToken)
  const [status, setStatus] = useState(null) // { enabled, limit, used }
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [photo, setPhoto] = useState(null) // prepared File waiting for confirmation
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(0)
  const camera = useRef(null)
  const device = useRef(null)
  const base = `/photographers/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventSlug)}`

  function signOut(message) {
    writeGuestToken(null)
    setToken(null)
    setStatus(null)
    setNotice(message ?? null)
  }

  // Ask how many photos this guest may still add.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    guestFetch(`${base}/status`, { token, headers: passwordHeaders(password) })
      .then(async (r) => {
        if (cancelled) return
        if (r.status === 401) return signOut('Your sign-in expired. Sign in again to continue.')
        if (!r.ok) throw new Error('Could not check your uploads. Try again in a moment.')
        setStatus(await r.json())
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [token, base, password])

  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function login(credential) {
    writeGuestToken(credential)
    setNotice(null)
    setToken(credential)
  }

  async function choose(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      setPhoto(await prepareImage(file))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function upload() {
    setBusy(true)
    setError(null)
    const body = new FormData()
    body.append('file', photo)
    try {
      const r = await guestFetch(`${base}/photos`, { token, method: 'POST', body, headers: passwordHeaders(password) })
      if (r.status === 401) {
        signOut('Your sign-in expired. Sign in again and your photo will be ready to upload.')
        setBusy(false)
        return
      }
      if (!r.ok) {
        throw new Error(await readError(r, `Could not upload the photo (${r.status}).`))
      }
      const { remaining } = await r.json()
      setStatus((s) => ({ ...s, used: s.limit - remaining }))
      setAdded((n) => n + 1)
      setPhoto(null)
      onDone()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (!token) {
    return (
      <div className="guest-step">
        {notice && <p role="status" className="notice-info">{notice}</p>}
        <p>Sign in with Google to add your photos to this event. Your Google name is shown next to every photo you add.</p>
        <GuestSignIn onToken={login} />
        {photo && <p className="muted">Your photo is kept while you sign in again.</p>}
      </div>
    )
  }
  if (error && !status) return <p role="alert" className="error">{error}</p>
  if (!status) return <p className="muted" role="status"><Spinner /> Checking your uploads…</p>
  if (!status.enabled) return <p className="notice-warn" role="status">Guest uploads are switched off for this event.</p>

  if (status.blocked) return <p className="notice-warn" role="status">The organizer has stopped you from adding photos to this event.</p>

  const remaining = status.limit - status.used
  if (photo) {
    return (
      <div className="guest-step">
        <img className="guest-preview" src={preview ?? undefined} alt="The photo you chose" />
        <p className="guest-notice">Your Google name will be shown next to this photo, and only the event creator can remove it.</p>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="guest-actions">
          <button type="button" onClick={() => { setPhoto(null); setError(null) }} disabled={busy}>Choose another</button>
          <button type="button" className="primary" onClick={upload} disabled={busy}>{busy && <Spinner />}{busy ? 'Uploading…' : 'Upload photo'}</button>
        </div>
      </div>
    )
  }
  return (
    <div className="guest-step">
      {added > 0 && <p role="status" className="notice-info">Added! It is in the gallery now.</p>}
      {remaining <= 0 ? (
        <p className="notice-warn" role="status">You've used all your uploads for this event.</p>
      ) : (
        <>
          <p>You can add {remaining} more {remaining === 1 ? 'photo' : 'photos'}.</p>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="guest-choices">
            <button type="button" className="primary" onClick={() => camera.current?.click()} disabled={busy}>{busy && <Spinner />}Take a photo</button>
            <button type="button" onClick={() => device.current?.click()} disabled={busy}>Choose from device</button>
          </div>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={choose} />
          <input ref={device} type="file" accept="image/*,.heic,.heif" hidden onChange={choose} />
        </>
      )}
      <button type="button" className="guest-signout" onClick={() => signOut('You signed out.')}>Not you? Sign out</button>
    </div>
  )
}

function CameraPlus() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><path d="M12 10.5v5M9.5 13h5" />
    </svg>
  )
}

/**
 * "Add your photos" and its dialog. Shown only when the event lets guests upload.
 * `variant="tile"` is a photo-shaped slot that sits first in the photo grid; the default is a plain button.
 */
export default function GuestUpload({ slug, eventSlug, limit, password, onUploaded, variant = 'button' }) {
  const [open, setOpen] = useState(false)
  if (!slug || !eventSlug || !(limit > 0)) return null
  return (
    <>
      {variant === 'tile' ? (
        <button type="button" className="guest-tile" onClick={() => setOpen(true)}>
         <span className="guest-tile-face">
          <svg className="guest-tile-scene" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <circle cx="72" cy="30" r="13" fill="#fff" opacity="0.35" />
            <path d="M0 125V84C22 66 40 80 62 64S90 68 100 58V125Z" fill="#fff" opacity="0.2" />
            <path d="M0 125V106C26 94 48 106 100 92V125Z" fill="#fff" opacity="0.28" />
          </svg>
          <span className="guest-tile-icon"><CameraPlus /></span>
          <span className="guest-tile-caption">
            <strong>Add your photos</strong>
            <small>Up to {limit} {limit === 1 ? 'photo' : 'photos'} each</small>
          </span>
         </span>
        </button>
      ) : (
        <button type="button" className="primary guest-add" onClick={() => setOpen(true)}>Add your photos</button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add your photos">
        <Flow slug={slug} eventSlug={eventSlug} password={password} onDone={() => onUploaded?.()} />
      </Modal>
    </>
  )
}
