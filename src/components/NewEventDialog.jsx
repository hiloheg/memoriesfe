import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readError } from '../accents.js'
import { useAuth } from '../auth.jsx'
import { CAMERA_ACCESS_DAYS, todayIso } from '../dates.js'
import { DEFAULT_ICON } from '../eventIconList.js'
import IconPicker from './IconPicker.jsx'
import { Spinner } from './Loaders.jsx'
import Modal from './Modal.jsx'

function NewEventForm({ onClose }) {
  const { apiFetch } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayIso)
  const [icon, setIcon] = useState(DEFAULT_ICON)
  const [visibility, setVisibility] = useState('public')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const r = await apiFetch('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date, icon, visibility, password: visibility === 'protected' ? password : undefined }),
    })
    if (!r.ok) {
      setBusy(false)
      return setError(await readError(r, `Could not create the event (${r.status})`))
    }
    const created = await r.json()
    onClose()
    navigate(`/events/${created.id}`)
  }

  return (
    <form className="modal-form" onSubmit={create}>
      <label className="field">
        <span className="field-label">Event name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ana and Mihai" required maxLength={100} autoFocus />
      </label>
      <label className="field">
        <span className="field-label">Event date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <small className="muted">Camera logins stop working {CAMERA_ACCESS_DAYS} days after this date.</small>
      </label>
      <IconPicker value={icon} onChange={setIcon} name="new-event-icon" />
      <fieldset className="field">
        <legend className="field-label">Visibility</legend>
        <div className="segmented" role="radiogroup" aria-label="Visibility">
          <label><input type="radio" name="new-visibility" checked={visibility === 'public'} onChange={() => setVisibility('public')} /><span>Public</span></label>
          <label><input type="radio" name="new-visibility" checked={visibility === 'protected'} onChange={() => setVisibility('protected')} /><span>Protected</span></label>
          <label><input type="radio" name="new-visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} /><span>Private</span></label>
        </div>
        {visibility === 'protected' && (
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password for guests" aria-label="Password for guests" required minLength={4} maxLength={60} autoComplete="off" />
        )}
        <small className="muted">
          {visibility === 'public' ? 'Listed on your page.' : visibility === 'protected' ? 'Listed on your page, but guests need the password to see the photos.' : 'Not listed on your page. Only people with the direct link can open it.'}
        </small>
      </fieldset>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary" disabled={busy}>{busy && <Spinner />}{busy ? 'Creating…' : 'Create event'}</button>
      </div>
    </form>
  )
}

/** Dialog for creating an event: name, date and icon. Opens the new event when done. */
export default function NewEventDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="New event">
      <NewEventForm onClose={onClose} />
    </Modal>
  )
}
