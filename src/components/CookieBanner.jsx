import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onReopen, saveConsent, useConsent } from '../consent.js'

/**
 * Cookie and storage notice. The site runs no ads or analytics, so the only real choice is whether to load
 * Google sign-in. "Allow" and "Not now" are equally easy to press, and the choice can be changed later.
 */
export default function CookieBanner() {
  const consent = useConsent()
  const [reopened, setReopened] = useState(false)
  useEffect(() => onReopen(() => setReopened(true)), [])

  if (consent && !reopened) return null

  function choose(google) {
    saveConsent(google)
    setReopened(false)
  }

  return (
    <section className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title">
      <div className="cookie-text">
        <h2 id="cookie-title">Your privacy</h2>
        <p>
          We use only what the site needs to work and remember your choices in your browser. There are no ads and no analytics.
          Signing in uses Google: loading it tells Google you visited and lets Google set its own cookies.
          {' '}<Link to="/privacy">Read the privacy policy</Link>.
        </p>
        {consent && <p className="cookie-current" role="status">Now: Google sign-in is {consent.google ? 'allowed' : 'off'}.</p>}
      </div>
      <div className="cookie-actions">
        <button type="button" onClick={() => choose(false)}>Not now</button>
        <button type="button" className="primary" onClick={() => choose(true)}>Allow Google sign-in</button>
      </div>
    </section>
  )
}
