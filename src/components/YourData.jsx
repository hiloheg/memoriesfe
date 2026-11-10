import { useState } from 'react'
import { Link } from 'react-router-dom'
import { readError } from '../accents.js'
import { useAuth } from '../auth.jsx'
import { Spinner } from './Loaders.jsx'
import Modal from './Modal.jsx'

function DeleteForm({ onClose }) {
  const { apiFetch, logout } = useAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function erase(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const r = await apiFetch('/api/v1/me', { method: 'DELETE' })
    if (!r.ok) {
      setBusy(false)
      return setError(await readError(r, `Could not delete the account (${r.status}). Try again.`))
    }
    logout()
  }

  return (
    <form className="modal-form" onSubmit={erase}>
      <p>This permanently deletes your page, all your events, all camera logins and every photo stored for them. It cannot be undone.</p>
      <label className="field">
        <span className="field-label">Type DELETE to confirm</span>
        <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoFocus disabled={busy} />
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions">
        <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="danger" disabled={busy || text.trim() !== 'DELETE'}>{busy && <Spinner />}{busy ? 'Deleting…' : 'Delete my account'}</button>
      </div>
    </form>
  )
}

/** GDPR self-service: a copy of your data (access, portability) and deleting the account (erasure). */
export default function YourData() {
  const { apiFetch } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function download() {
    setBusy(true)
    setError(null)
    const r = await apiFetch('/api/v1/me/export')
    if (!r.ok) {
      setBusy(false)
      return setError(await readError(r, `Could not prepare your data (${r.status})`))
    }
    const blob = new Blob([JSON.stringify(await r.json(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imemories-my-data.json'
    a.click()
    URL.revokeObjectURL(url)
    setBusy(false)
  }

  return (
    <div className="field">
      <span className="field-label">Your data</span>
      <small className="muted">Download a copy of what we keep about you, or delete your account and everything in it. <Link to="/privacy">Privacy policy</Link></small>
      <div className="photo-actions">
        <button type="button" onClick={download} disabled={busy}>{busy && <Spinner />}{busy ? 'Preparing…' : 'Download my data'}</button>
        <button type="button" className="danger" onClick={() => setDeleting(true)}>Delete my account</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete your account?">
        <DeleteForm onClose={() => setDeleting(false)} />
      </Modal>
    </div>
  )
}
