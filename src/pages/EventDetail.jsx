import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { readError } from '../accents.js'
import { useCredits } from '../components/CreditsContext.jsx'
import EventQr from '../components/EventQr.jsx'
import GuestPhotos from '../components/GuestPhotos.jsx'
import IconPicker from '../components/IconPicker.jsx'
import { DetailSkeleton, Spinner } from '../components/Loaders.jsx'
import Modal from '../components/Modal.jsx'
import { eventStatus } from '../credits.js'
import { accessUntil, formatDay } from '../dates.js'
import { EventBadge } from '../eventIcons.jsx'

function Credentials({ cred, until, fresh, onReset, resetting, onClose }) {
  const [copied, setCopied] = useState(false)
  const hasPassword = Boolean(cred.password)
  const text = `Host: ${cred.ftpHost}
FTP port: ${cred.ftpPort}
SFTP port: ${cred.sftpPort}
User: ${cred.username}
Password: ${cred.password}
Works until: ${formatDay(until)}`
  function copy() {
    navigator.clipboard?.writeText(text)
    setCopied(true)
  }
  return (
    <div className="modal-form">
      <p className="muted">
        {fresh ? 'Enter these in the camera FTP settings.' : hasPassword ? 'The login for this camera.' : 'The password of this camera was not kept. Reset it to get a new one; the old one stops working.'}
      </p>
      <dl className="creds-list">
        <dt>Host</dt><dd>{cred.ftpHost}</dd>
        <dt>FTP port</dt><dd>{cred.ftpPort}</dd>
        <dt>SFTP port</dt><dd>{cred.sftpPort}</dd>
        <dt>User</dt><dd>{cred.username}</dd>
        <dt>Password</dt><dd>{hasPassword ? cred.password : 'Not available'}</dd>
        <dt>Works until</dt><dd>{formatDay(until)}</dd>
      </dl>
      <div className="modal-actions">
        {onReset && <button type="button" onClick={onReset} disabled={resetting}>{resetting && <Spinner />}{resetting ? 'Resetting…' : 'Reset password'}</button>}
        {hasPassword && <button type="button" className="primary" onClick={copy}>{copied ? 'Copied' : 'Copy details'}</button>}
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function AddCameraForm({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await onAdd(name)
    if (message) {
      setBusy(false)
      setError(message)
    }
  }
  return (
    <form className="modal-form" onSubmit={submit}>
      <label className="field">
        <span className="field-label">Camera name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ceremony" required maxLength={100} autoFocus disabled={busy} />
        <small className="muted">It becomes a folder in the guest gallery, so name it for what it shoots.</small>
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="primary" disabled={busy}>{busy && <Spinner />}{busy ? 'Adding camera…' : 'Add camera'}</button>
      </div>
    </form>
  )
}

function EditEventForm({ event, onSave, onClose }) {
  const [name, setName] = useState(event.name)
  const [icon, setIcon] = useState(event.icon)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await onSave({ name, icon })
    setBusy(false)
    if (message) setError(message)
  }
  return (
    <form className="modal-form" onSubmit={save}>
      <label className="field">
        <span className="field-label">Event name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus disabled={busy} />
        <small className="muted">Your shared links and QR code keep working after a rename.</small>
      </label>
      <IconPicker value={icon} onChange={setIcon} name="edit-event-icon" />
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="primary" disabled={busy}>{busy && <Spinner />}{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  )
}

const TABS = [
  { key: 'event', label: 'Event' },
  { key: 'photos', label: 'Guest photos' },
  { key: 'share', label: 'Share' },
]

/** The limit shown in the box: what is saved, or 10 as a first suggestion while guest uploads are off. */
const startLimit = (event) => (event.guestUploadsEnabled ? event.guestUploadLimit : event.guestUploadLimit || 10)

/** Who can find the event, with its password and main-event choice. Nothing changes until Save is pressed. */
function SettingsPanel({ event, onSave }) {
  const { user } = useAuth()
  const { openBuy } = useCredits()
  const faceReady = event.faceSearchAvailable !== false // the server switches the whole feature on with FACE_SEARCH_ENABLED
  const faceLocked = user?.unlocked === false // face search comes with the first purchase
  const [visibility, setVisibility] = useState(event.visibility)
  const [password, setPassword] = useState(event.accessPassword ?? '')
  const [main, setMain] = useState(event.main)
  const [guestOn, setGuestOn] = useState(event.guestUploadsEnabled)
  const [guestLimit, setGuestLimit] = useState(startLimit(event))
  const [faceOn, setFaceOn] = useState(event.faceSearchEnabled)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const passwordOk = visibility !== 'protected' || (password.length >= 4 && password.length <= 60)
  const limitOk = Number.isInteger(guestLimit) && guestLimit >= 0 && guestLimit <= 50
  const guestChanged = guestOn !== event.guestUploadsEnabled || (guestOn && guestLimit !== event.guestUploadLimit)
  const dirty = visibility !== event.visibility || main !== event.main || guestChanged || faceOn !== event.faceSearchEnabled
    || (visibility === 'protected' && password !== (event.accessPassword ?? ''))

  function pick(next) {
    setVisibility(next)
  }
  function toggleMain(on) {
    setMain(on)
    if (on) setVisibility('public') // the main event is always public
  }
  function discard() {
    setVisibility(event.visibility)
    setPassword(event.accessPassword ?? '')
    setMain(event.main)
    setGuestOn(event.guestUploadsEnabled)
    setGuestLimit(startLimit(event))
    setFaceOn(event.faceSearchEnabled)
    setError(null)
  }
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await onSave({ visibility, password, main, guestOn, guestLimit, faceOn })
    setBusy(false)
    if (message) setError(message)
  }

  return (
    <form className="visibility-panel" onSubmit={save} aria-busy={busy}>
      <fieldset disabled={busy}>
        <legend className="field-label">Who can find this event</legend>
        <div className="segmented" role="radiogroup" aria-label="Visibility">
          <label><input type="radio" name="visibility" checked={visibility === 'public'} onChange={() => pick('public')} /><span>Public</span></label>
          <label><input type="radio" name="visibility" checked={visibility === 'protected'} disabled={main} onChange={() => pick('protected')} /><span>Protected</span></label>
          <label><input type="radio" name="visibility" checked={visibility === 'private'} disabled={main} onChange={() => pick('private')} /><span>Private</span></label>
        </div>
        {visibility === 'protected' && (
          <input type="text" aria-label="Password for guests" placeholder="Password for guests (4 to 60 characters)" minLength={4} maxLength={60}
            autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
        <p className="muted">
          {main
            ? 'Your main event is always public, so everyone can see its photos. Untick main event to make it protected or private.'
            : visibility === 'private'
            ? 'Not listed on your page. Only people with the direct link can open it.'
            : visibility === 'protected'
              ? 'Listed on your page. Guests need this password to see the photos. Share it with them yourself.'
              : 'Listed on your page, unless you pick a main event.'}
        </p>
        <label className="check main-toggle">
          <input type="checkbox" checked={main} onChange={(e) => toggleMain(e.target.checked)} />
          <span>
            <strong>Make this my main event</strong>
            <span className="muted">Your page shows only this event and hides all your other events.</span>
          </span>
        </label>
        <label className="check main-toggle">
          <input type="checkbox" checked={guestOn} onChange={(e) => setGuestOn(e.target.checked)} />
          <span>
            <strong>Let guests upload photos</strong>
            <span className="muted">Guests sign in with Google, then add their own photos to this event. They show up straight away, with the guest's name.</span>
          </span>
        </label>
        {faceReady && (
          <>
          <label className="check main-toggle">
            <input type="checkbox" checked={faceOn} disabled={faceLocked && !event.faceSearchEnabled} onChange={(e) => setFaceOn(e.target.checked)} />
            <span>
              <strong>Let guests find their photos by scanning their face</strong>
              <span className="muted">Guests agree to a face scan first, and their picture is not saved. The faces in your photos are measured on our server and deleted with the event. You are responsible for telling the people you photograph where the law requires it.</span>
            </span>
          </label>
          {faceLocked && !event.faceSearchEnabled && (
            <p className="muted">Face search comes with your first purchase. <button type="button" className="linklike" onClick={openBuy}>Buy credits</button></p>
          )}
          </>
        )}
        {guestOn && (
          <label className="guest-limit">
            <span className="field-label">Photos each guest can add (0 to 50)</span>
            <input type="number" inputMode="numeric" min={0} max={50} step={1} value={Number.isNaN(guestLimit) ? '' : guestLimit}
              onChange={(e) => setGuestLimit(e.target.value === '' ? NaN : Number(e.target.value))} aria-invalid={!limitOk} />
            {!limitOk && <small className="error">Choose a whole number from 0 to 50.</small>}
            {limitOk && guestLimit === 0 && <small className="muted">With 0, guests cannot add anything.</small>}
          </label>
        )}
      </fieldset>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="settings-actions">
        <button type="button" onClick={discard} disabled={!dirty || busy}>Discard</button>
        <button type="submit" className="primary" disabled={!dirty || !passwordOk || (guestOn && !limitOk) || busy}>{busy && <Spinner />}{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
      {dirty && !busy && <p className="muted unsaved" role="status">You have unsaved changes.</p>}
    </form>
  )
}

/** One event: cameras (guest folders), camera registration and the printable QR card. */
export default function EventDetail() {
  const { id } = useParams()
  const { apiFetch } = useAuth()
  const { openBuy } = useCredits()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [adding, setAdding] = useState(false)
  const [cred, setCred] = useState(null) // { data, fresh } shown in the login dialog
  const [error, setError] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'event' // kept in the address, so a refresh stays on the same tab
  const setTab = (next) => setParams(next === 'event' ? {} : { tab: next }, { replace: true })
  const [pending, setPending] = useState(null) // which action is waiting for the backend

  const load = useCallback(() => {
    return apiFetch(`/api/v1/events/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'This event does not exist.' : `Could not load the event (${r.status})`))))
      .then(setData)
      .catch((e) => setError(e.message))
  }, [apiFetch, id])

  useEffect(() => {
    load()
  }, [load])

  /** Runs an action with its button showing progress until the backend answers and the page has refreshed. */
  async function run(key, action) {
    setPending(key)
    try {
      await action()
    } finally {
      setPending(null)
    }
  }

  /** Returns an error message, or null after closing the dialog and showing the new login. */
  async function addCamera(name) {
    const r = await apiFetch(`/api/v1/events/${id}/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!r.ok) return readError(r, `Could not add the camera (${r.status}). Check that SFTPGo is running.`)
    const data = await r.json()
    setAdding(false)
    setCred({ data, fresh: true })
    await load()
    return null
  }

  function showLogin(camera) {
    setError(null)
    return run(`login:${camera.id}`, async () => {
      const r = await apiFetch(`/api/v1/events/${id}/cameras/${camera.id}/credentials`)
      if (!r.ok) return setError(await readError(r, `Could not load the login (${r.status})`))
      setCred({ data: await r.json(), fresh: false })
    })
  }

  function resetLogin() {
    if (!confirm('Reset the password? The camera must be updated with the new one, the old one stops working.')) return
    return run('reset', async () => {
      const r = await apiFetch(`/api/v1/events/${id}/cameras/${cred.data.id}/credentials/reset`, { method: 'POST' })
      if (!r.ok) return setError(await readError(r, `Could not reset the password (${r.status})`))
      setCred({ data: await r.json(), fresh: true })
    })
  }

  async function saveDetails(body) {
    const r = await apiFetch(`/api/v1/events/${id}/details`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return readError(r, `Could not save the changes (${r.status})`)
    setEditing(false)
    await load()
    return null
  }

  /** Applies the edited settings in an order the backend accepts. Returns an error message, or null when saved. */
  async function saveSettings(draft) {
    const call = async (path, method, body) => {
      const r = await apiFetch(`/api/v1/events/${id}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      return r.ok ? null : readError(r, `Could not save (${r.status})`)
    }
    let message = null
    const current = data.event
    if (current.main && !draft.main) message = await call('/main', 'DELETE')
    if (!message && (draft.visibility !== current.visibility || (draft.visibility === 'protected' && draft.password !== current.accessPassword))) {
      message = await call('/visibility', 'PUT', { visibility: draft.visibility, password: draft.visibility === 'protected' ? draft.password : undefined })
    }
    if (!message && draft.main && !current.main) message = await call('/main', 'PUT')
    if (!message && (draft.guestOn !== current.guestUploadsEnabled || (draft.guestOn && draft.guestLimit !== current.guestUploadLimit))) {
      message = await call('/guest-uploads', 'PUT', { enabled: draft.guestOn, limit: draft.guestOn ? draft.guestLimit : current.guestUploadLimit })
    }
    if (!message && draft.faceOn !== current.faceSearchEnabled) message = await call('/face-search', 'PUT', { enabled: draft.faceOn })
    await load()
    return message
  }

  function removeCamera(camera) {
    if (!confirm(`Remove ${camera.name}? Its FTP login stops working and all its photos are deleted. This cannot be undone.`)) return
    return run(`cam:${camera.id}`, async () => {
      const r = await apiFetch(`/api/v1/events/${id}/cameras/${camera.id}`, { method: 'DELETE' })
      if (!r.ok) return setError(await readError(r, `Could not remove the camera (${r.status})`))
      await load()
    })
  }

  function removeEvent() {
    if (!confirm('Delete this event? All its photos and camera logins are deleted. This cannot be undone.')) return
    return run('delete', async () => {
      const r = await apiFetch(`/api/v1/events/${id}`, { method: 'DELETE' })
      if (!r.ok) return setError(await readError(r, `Could not delete the event (${r.status})`))
      navigate('/')
    })
  }

  if (error && !data) return <p role="alert" className="error">{error}</p>
  if (!data) return <DetailSkeleton />
  const { event, cameras } = data
  const status = eventStatus(event)
  const atCameraLimit = cameras.length >= event.maxCameras
  const closed = event.expired || event.cameraAccessExpired

  return (
    <section>
      <Link to="/" className="crumb">All events</Link>
      <header className="event-head">
        <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Change event icon" title="Change icon">
          <EventBadge name={event.icon} large />
        </button>
        <div className="event-head-text">
          <h1>{event.name}</h1>
          <p className="muted">
            {formatDay(event.eventDate)}
            {event.main && <span className="status-pill main">Main</span>}
            {event.visibility === 'private' && <span className="status-pill">Private</span>}
            {event.visibility === 'protected' && <span className="status-pill">Protected</span>}
          </p>
        </div>
        <div className="event-head-actions">
          <button type="button" onClick={() => setEditing(true)}>Edit</button>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(event.shareUrl); setLinkCopied(true) }}>{linkCopied ? 'Link copied' : 'Copy link'}</button>
        </div>
      </header>
      {status && (
        <p className={status.kind === 'active' ? 'notice-info' : 'notice-warn'} role="status" style={{ marginBottom: 16 }}>{status.text}</p>
      )}
      {error && <p role="alert" className="error" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="tabs-bar" role="tablist" aria-label="Event" onKeyDown={(e) => {
        const i = TABS.findIndex((t) => t.key === tab)
        if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].key)
        if (e.key === 'ArrowLeft') setTab(TABS[(i - 1 + TABS.length) % TABS.length].key)
      }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1} className="tab-btn" onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'share' && (
        <div role="tabpanel" id="panel-share" aria-labelledby="tab-share" className="share-panel">
          <p className="muted">Print this code or save it as an image for tables, signs and invitations. Guests scan it to open the photos of this event.</p>
          <EventQr event={event} />
        </div>
      )}

      {tab === 'photos' && (
        <div role="tabpanel" id="panel-photos" aria-labelledby="tab-photos">
          <GuestPhotos eventId={id} uploadsOn={event.guestUploadsEnabled && event.guestUploadLimit > 0} onOpenSettings={() => setTab('event')} />
        </div>
      )}

      <div role="tabpanel" id="panel-event" aria-labelledby="tab-event" hidden={tab !== 'event'} className="event-layout two">
        <div className="event-main">
          <div className="section-title">
            <h2>Cameras</h2>
          </div>
          <p className="muted">Each camera becomes a folder in the guest gallery, so name it for what it shoots.</p>
          {event.cameraAccessExpired ? (
            <p className="notice-warn" role="status">Camera logins for this event stopped working on {formatDay(accessUntil(event.eventDate))}. Create a new event to add cameras for another date.</p>
          ) : (
            <p className="notice-info">Camera logins work until the end of {formatDay(accessUntil(event.eventDate))}, 3 days after the event.</p>
          )}
          {!closed && atCameraLimit && (
            <p className="notice-info" role="status">
              Trial events support 1 camera. Buy a pack to create full events with more cameras.{' '}
              <button type="button" className="primary" onClick={openBuy}>Buy credits</button>
            </p>
          )}
          <ul className="event-list">
            {!closed && (
              <li>
                <button type="button" className="event-row new-row" onClick={() => setAdding(true)} disabled={atCameraLimit}>
                  <span className="new-plus" aria-hidden="true">+</span>
                  <span>Add camera</span>
                </button>
              </li>
            )}
            {cameras.map((c) => (
              <li key={c.id}>
                <div className="event-row camera-row">
                  <EventBadge name="camera" />
                  <span className="row-text">
                    <strong>{c.name}</strong>
                    <small className="mono">{c.username}</small>
                  </span>
                  <span className="camera-actions">
                    <button type="button" onClick={() => showLogin(c)} disabled={pending !== null}>{pending === `login:${c.id}` && <Spinner />}Show details</button>
                    <button type="button" className="danger" onClick={() => removeCamera(c)} disabled={pending !== null}>{pending === `cam:${c.id}` && <Spinner />}{pending === `cam:${c.id}` ? 'Deleting…' : 'Delete'}</button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {cameras.length === 0 && event.cameraAccessExpired && <p className="empty">No cameras were added to this event.</p>}
          <div className="danger-zone">
            <button className="danger" onClick={removeEvent} disabled={pending !== null}>{pending === 'delete' && <Spinner />}{pending === 'delete' ? 'Deleting…' : 'Delete event'}</button>
          </div>
        </div>

        <aside className="event-side">
        <SettingsPanel key={`${event.visibility}|${event.accessPassword}|${event.main}|${event.guestUploadsEnabled}|${event.guestUploadLimit}|${event.faceSearchEnabled}`} event={event} onSave={saveSettings} />
        </aside>
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a camera">
        <AddCameraForm onAdd={addCamera} onClose={() => setAdding(false)} />
      </Modal>
      <Modal open={cred !== null} onClose={() => setCred(null)} title={cred ? (cred.fresh ? `${cred.data.name} is ready to connect` : `${cred.data.name} login`) : ''}>
        {cred && (
          <Credentials cred={cred.data} until={accessUntil(event.eventDate)} fresh={cred.fresh}
            onReset={event.cameraAccessExpired ? null : resetLogin} resetting={pending === 'reset'} onClose={() => setCred(null)} />
        )}
      </Modal>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit event">
        <EditEventForm event={event} onSave={saveDetails} onClose={() => setEditing(false)} />
      </Modal>
    </section>
  )
}
