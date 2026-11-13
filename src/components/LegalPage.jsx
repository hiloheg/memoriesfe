import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { reopenConsent } from '../consent.js'
import Logo from './Logo.jsx'

/** Shared frame of the plain legal pages (terms, refunds): same header, body and footer as the privacy policy. */
export default function LegalPage({ title, updated, intro, children }) {
  useEffect(() => {
    document.title = `${title} | imemories`
    window.scrollTo(0, 0)
  }, [title])

  return (
    <div className="legal">
      <header className="legal-bar">
        <Link to="/" className="logo-link" aria-label="Go to the imemories home page"><Logo label={false} /></Link>
      </header>
      <main className="legal-body">
        <h1>{title}</h1>
        <p className="muted">Last updated {updated}. {intro}</p>
        {children}
      </main>
      <footer className="legal-foot">
        <Link to="/">Back to imemories</Link>
        <button type="button" className="linklike" onClick={reopenConsent}>Cookie settings</button>
      </footer>
    </div>
  )
}
