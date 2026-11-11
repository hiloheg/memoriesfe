import { Link } from 'react-router-dom'
import { reopenConsent } from '../consent.js'
import { LEGAL } from '../legal.js'
import LegalIdentity from './LegalIdentity.jsx'

// The ANPC SAL pictogram. If the file is ever removed the footer shows the same link as text, so the build never depends on it.
const sal = Object.values(import.meta.glob('../assets/anpc-sal.svg', { eager: true, query: '?url', import: 'default' }))[0]

/** Who we are, the legal pages and the consumer-protection links. Shown at the bottom of the photographer area and the sign-in page. */
export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <LegalIdentity />
      <nav className="legal-links" aria-label="Legal">
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy policy</Link>
        <Link to="/refunds">Refunds and withdrawal</Link>
        <a href={LEGAL.anpcUrl} target="_blank" rel="noopener noreferrer">{LEGAL.anpcLabel}<span className="sr-only"> (opens in a new tab)</span></a>
        <a href={LEGAL.salUrl} target="_blank" rel="noopener noreferrer">{LEGAL.salLabel}<span className="sr-only"> (opens in a new tab)</span></a>
        <button type="button" className="linklike" onClick={reopenConsent}>Cookie settings</button>
      </nav>
      <a className="legal-sal" href={LEGAL.salUrl} target="_blank" rel="noopener noreferrer">
        {sal
          ? <img src={sal} width="250" height="62" alt={LEGAL.salLabel} />
          : LEGAL.salLabel}
      </a>
    </footer>
  )
}
