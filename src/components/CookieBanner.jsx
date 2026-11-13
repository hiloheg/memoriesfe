import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isDecided, onReopen, saveConsent, useConsent } from '../consent.js'

/**
 * Cookie and storage notice, shown once on every page until the visitor chooses. A bar across the full width at the bottom, its content centred,
 * with a short text that points to the cookie policy and two equal buttons; "Choose" opens a switch for each optional thing (Google sign-in, statistics), both off
 * until allowed. The choice can be changed later from "Cookie settings".
 */
export default function CookieBanner() {
  const consent = useConsent()
  const [reopened, setReopened] = useState(false)
  const [detail, setDetail] = useState(false)
  const [google, setGoogle] = useState(Boolean(consent?.google))
  const [analytics, setAnalytics] = useState(Boolean(consent?.analytics))
  useEffect(() => onReopen(() => {
    setGoogle(Boolean(consent?.google))
    setAnalytics(Boolean(consent?.analytics))
    setDetail(true) // from "Cookie settings" the visitor wants to see and change the switches
    setReopened(true)
  }), [consent])

  if (isDecided(consent) && !reopened) return null

  function choose(g, a) {
    saveConsent({ google: g, analytics: a })
    setReopened(false)
    setDetail(false)
  }

  return (
    <section className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title">
      <div className="ck-inner">
      <div className="ck-text">
      <div className="ck-head">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" /><path d="M12 3l3.5 6M20.2 7.5L13.5 9M20.2 16.5L15.5 11.5M12 21l-3.5-6M3.8 16.5L10.5 15M3.8 7.5l4.7 5" />
        </svg>
        <h2 id="cookie-title">We use cookies</h2>
      </div>
      <p className="ck-lead">
        Essential cookies and browser storage keep the site working and are always on. Cookies for Google sign-in and for visit statistics
        are set only if you allow them. There are no ads. Read our <Link to="/privacy#storage">Cookie policy</Link> for every cookie and how long it lasts.
      </p>

      {detail && (
        <ul className="ck-list">
          <li>
            <label className="ck-row">
              <span className="ck-name">Essential<small>Keeps you signed in and remembers your choices. Needed for the site to work.</small></span>
              <input type="checkbox" role="switch" className="ck-switch" checked disabled readOnly />
            </label>
          </li>
          <li>
            <label className="ck-row">
              <span className="ck-name">Google sign-in<small>Needed to sign in or add photos. Google sets its own cookies when it loads.</small></span>
              <input type="checkbox" role="switch" className="ck-switch" checked={google} onChange={(e) => setGoogle(e.target.checked)} />
            </label>
          </li>
          <li>
            <label className="ck-row">
              <span className="ck-name">Statistics<small>Google Analytics cookies count visits and pages. Private photo links are never sent.</small></span>
              <input type="checkbox" role="switch" className="ck-switch" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            </label>
          </li>
        </ul>
      )}

      </div>

      <div className="ck-actions">
        <button type="button" className="primary" onClick={() => choose(false, false)}>Reject all</button>
        <button type="button" className="primary" onClick={() => choose(true, true)}>Accept all</button>
        {detail
          ? <button type="button" className="ck-more" onClick={() => choose(google, analytics)}>Save my choices</button>
          : <button type="button" className="quiet ck-more" aria-expanded="false" onClick={() => setDetail(true)}>Choose what to allow</button>}
      </div>
      </div>
    </section>
  )
}
