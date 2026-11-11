import { useState } from 'react'
import { readError } from '../accents.js'
import { useAuth } from '../auth.jsx'
import { PACKS, describePlan, perEvent, savings } from '../credits.js'
import { useCredits } from './CreditsContext.jsx'
import { Spinner } from './Loaders.jsx'
import Modal from './Modal.jsx'

const euro = (n) => `€${Number.isInteger(n) ? n : n.toFixed(2)}`
const BEST = 10 // the pack that is highlighted as the best value

const free = describePlan('trial')
const full = describePlan('full')

// What a purchased credit gives over the free one. `was` is the free credit, `now` is what a pack gives.
const UPGRADES = [
  { label: 'Photos per event', was: free.photos.toLocaleString('en'), now: full.photos.toLocaleString('en') },
  { label: 'Storage per event', was: '4 GB', now: '40 GB' },
  { label: 'Online for', was: `${free.days} days`, now: `${full.days} days` },
  { label: 'Cameras per event', was: `${free.cameras}`, now: 'Unlimited' },
]
const UNLOCKS = ['Your own page look and colour', 'Your logo on your page and gallery', 'Photo editor for your guests']

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
      <p className="pack-lead">
        One credit creates one event. You have <strong>{total} {total === 1 ? 'credit' : 'credits'}</strong>.
      </p>
      <ul className="packs">
        {PACKS.map((p) => {
          const save = savings(p.pack)
          const best = p.pack === BEST
          return (
            <li key={p.pack} className={`pack${best ? ' best' : ''}`}>
              {best && <span className="pack-flag">Best value</span>}
              <div className="pack-credits">
                <strong>{p.credits}</strong>
                <span>{p.credits === 1 ? 'credit' : 'credits'}</span>
              </div>
              <div className="pack-price">
                <strong>{euro(p.price)}</strong>
                <span className="muted">{euro(perEvent(p.pack))} per event</span>
              </div>
              <p className={`pack-save${save.amount ? '' : ' none'}`}>
                {save.amount ? <>Save {euro(save.amount)} <span>({save.percent}% off)</span></> : 'One event, no commitment'}
              </p>
              <button type="button" className={best ? 'primary' : ''} onClick={() => buy(p.pack)} disabled={busy !== null}>
                {busy === p.pack && <Spinner />}
                {busy === p.pack ? 'Opening…' : `Buy ${p.credits === 1 ? '1 credit' : `${p.credits} credits`}`}
              </button>
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="error">{error}</p>}

      <section className="pack-includes" aria-labelledby="pack-includes-title">
        <h3 id="pack-includes-title">Every credit you buy includes</h3>
        <table className="upgrade">
          <thead>
            <tr><th scope="col"><span className="sr-only">Feature</span></th><th scope="col">Free credit</th><th scope="col">Bought credit</th></tr>
          </thead>
          <tbody>
            {UPGRADES.map((u) => (
              <tr key={u.label}><th scope="row">{u.label}</th><td>{u.was}</td><td><strong>{u.now}</strong></td></tr>
            ))}
          </tbody>
        </table>
        <ul className="unlocks">
          {UNLOCKS.map((u) => <li key={u}>{u}</li>)}
        </ul>
        <p className="muted pack-note">Buying any pack unlocks the page look, the logo and the guest editor on your whole account, not only on one event.</p>
      </section>

      <p className="muted pack-note">
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
    <Modal open={open} onClose={onClose} title="Buy credits" wide>
      <Packs onClose={onClose} />
    </Modal>
  )
}
