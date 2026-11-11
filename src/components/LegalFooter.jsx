import { Link } from 'react-router-dom'
import { reopenConsent } from '../consent.js'
import { LEGAL } from '../legal.js'
import LegalIdentity from './LegalIdentity.jsx'

// The ANPC SAL pictogram. If the file is ever removed the footer shows the same link as text, so the build never depends on it.
const sal = Object.values(import.meta.glob('../assets/anpc-sal.svg', { eager: true, query: '?url', import: 'default' }))[0]

/**
 * Who we are, the legal pages and the consumer-protection links, as one small strip at the bottom of the photographer area.
 * The full ANPC names are the tooltip and the screen-reader name of their links; the pictogram says "alternative dispute resolution" itself.
 */
export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div className="legal-row">
        <nav className="legal-links" aria-label="Legal">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/refunds">Refunds</Link>
          <a href={LEGAL.anpcUrl} target="_blank" rel="noopener noreferrer" title={LEGAL.anpcLabel} aria-label={`${LEGAL.anpcLabel} (opens in a new tab)`}>ANPC</a>
          <button type="button" className="linklike" onClick={reopenConsent}>Cookie settings</button>
        </nav>
        <a className="legal-sal" href={LEGAL.salUrl} target="_blank" rel="noopener noreferrer" title={LEGAL.salLabel} aria-label={`${LEGAL.salLabel} (opens in a new tab)`}>
          {sal ? <img src={sal} width="186" height="46" alt="" /> : 'Alternative dispute resolution (SAL)'}
        </a>
      </div>
      <LegalIdentity />
    </footer>
  )
}
