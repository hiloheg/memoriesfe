import { useState } from 'react'
import { readError } from '../accents.js'
import { useAuth } from '../auth.jsx'
import { PACKS, perEvent } from '../credits.js'
import { useCredits } from './CreditsContext.jsx'
import { Spinner } from './Loaders.jsx'
import Modal from './Modal.jsx'

const euro = (n) => `€${Number.isInteger(n) ? n : n.toFixed(2)}`

function Packs({ onClose }) {
  const { apiFetch } = useAuth()
  const { data, startPolling } = useCredits()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const total = data?.balance.total ?? 0

  async function buy(pack) {
    setBusy(pack)
    setError(null)
    // Open the tab now, while the click still counts, and send it to the checkout once we have the link.
    const tab = window.open('about:blank', '_blank')
    try {
      const r = await apiFetch(`/api/v1/credits/checkout?pack=${pack}`)
      if (!r.ok) throw new Error(await readError(r, `Could not open the checkout (${r.status})`))
      const { url } = await r.json()
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        window.location.href = url
      }
      startPolling()
      onClose()
    } catch (e) {
      if (tab) tab.close()
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <p>
        One credit creates one event. You have <strong>{total} {total === 1 ? 'credit' : 'credits'}</strong>.
      </p>
      <ul className="packs">
        {PACKS.map((p) => (
          <li key={p.pack} className="pack">
            <div>
              <strong>{p.credits} {p.credits === 1 ? 'credit' : 'credits'}</strong>
              <span className="muted"> {euro(perEvent(p.pack))} per event</span>
            </div>
            <button type="button" className="primary" onClick={() => buy(p.pack)} disabled={busy !== null}>
              {busy === p.pack && <Spinner />}
              {busy === p.pack ? 'Opening…' : `Buy for ${euro(p.price)}`}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="error">{error}</p>}
      <p className="muted pack-note">
        Buying any pack also unlocks your page look, your logo and the photo editor for your guests.
        Prices exclude VAT. Payment is handled securely by Lemon Squeezy. Your credits appear here as soon as the payment is confirmed.
      </p>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </>
  )
}

/** Dialog with the three credit packs. Opened from the header chip or from any screen that needs a credit. */
export default function BuyCreditsDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Buy credits">
      <Packs onClose={onClose} />
    </Modal>
  )
}
