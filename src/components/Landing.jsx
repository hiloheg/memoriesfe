import LegalIdentity from './LegalIdentity.jsx'
import { LEGAL } from '../legal.js'
import { useEffect, useRef, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { Link } from 'react-router-dom'
import { allowGoogle, reopenConsent, useConsent } from '../consent.js'
import '../landing.css'
import { QR } from '../qr.js'
import Logo from './Logo.jsx'
import Tutorial from './Tutorial.jsx'

// The ANPC SAL pictogram; if the file is ever removed the footer shows the same link as text.
const SAL_IMG = Object.values(import.meta.glob('../assets/anpc-sal.svg', { eager: true, query: '?url', import: 'default' }))[0]

const SPARKLE ='M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z'

/** Tracks a media query, so the Google button can match the colour scheme and the screen. */
function useMedia(query) {
  const [matches, setMatches] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia(query)
    const on = () => setMatches(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.500c3.540 0 6.710 1.220 9.210 3.600l6.850-6.850C35.900 2.380 30.470 0 24 0 14.620 0 6.510 5.380 2.560 13.220l7.980 6.190C12.430 13.720 17.740 9.500 24 9.500z" />
      <path fill="#4285F4" d="M46.980 24.550c0-1.570-.15-3.090-.38-4.550H24v9.020h12.940c-.58 2.960-2.260 5.480-4.780 7.180l7.730 6c4.510-4.180 7.090-10.360 7.090-17.650z" />
      <path fill="#FBBC05" d="M10.530 28.590c-.48-1.450-.76-2.990-.76-4.590s.27-3.140.76-4.590l-7.980-6.190C.92 16.460 0 20.120 0 24c0 3.880.92 7.540 2.560 10.780l7.970-6.190z" />
      <path fill="#34A853" d="M24 48c6.480 0 11.930-2.130 15.890-5.810l-7.730-6c-2.150 1.450-4.920 2.300-8.160 2.300-6.260 0-11.570-4.220-13.470-9.910l-7.980 6.190C6.510 42.620 14.620 48 24 48z" />
    </svg>
  )
}

/**
 * The one way in: Google sign-in. Google's script is only loaded once the visitor allows it (the cookie banner,
 * or pressing this button): until then this is our own button and nothing contacts Google.
 */
function GoogleSignIn({ onLogin, size = 'medium' }) {
  const consent = useConsent()
  const dark = useMedia('(prefers-color-scheme: dark)')
  const tiny = useMedia('(max-width: 389px)')

  if (!consent?.google) {
    return (
      <button type="button" className={`lp-google ${size}`} onClick={() => allowGoogle()} title="This loads Google sign-in">
        <GoogleMark />
        <span className={tiny && size === 'medium' ? 'sr-only' : undefined}>Sign in with Google</span>
      </button>
    )
  }
  return (
    <GoogleLogin
      onSuccess={(res) => onLogin(res.credential)}
      onError={() => alert('Google sign-in failed. Try again.')}
      type={tiny && size === 'medium' ? 'icon' : 'standard'}
      text="signin_with"
      size={size}
      shape="pill"
      theme={dark ? 'filled_black' : 'outline'}
    />
  )
}

// Illustrated stand-ins for event photos, used on the polaroids in the hero.
const SCENES = [
  { bg: '#f2b8a2', art: <><circle cx="62" cy="38" r="17" fill="#fbe3c8" /><path d="M0 100V70C25 52 50 64 100 46V100Z" fill="#c75d4a" /></> },
  { bg: '#a9d4cf', art: <><circle cx="38" cy="50" r="24" fill="none" stroke="#fff" strokeWidth="7" /><circle cx="62" cy="50" r="24" fill="none" stroke="#0e7c6b" strokeWidth="7" /></> },
  { bg: '#cfc3ee', art: <><path d="M18 100V50a32 32 0 0 1 64 0v50Z" fill="#7d68c9" /><path d="M34 100V56a16 16 0 0 1 32 0v44Z" fill="#efeaff" /></> },
  { bg: '#f6d78b', art: <><path d="M0 100L34 36L58 76L74 52L100 100Z" fill="#d8962a" /><circle cx="78" cy="24" r="10" fill="#fff6dd" /></> },
]

/** Where each photo lands on the phone, as a share of the stage. */
const SLOTS = [
  { l: '52.5%', t: '29%' }, { l: '72.5%', t: '29%' },
  { l: '52.5%', t: '53%' }, { l: '72.5%', t: '53%' },
]

/**
 * The hero's one big moment: the camera flashes, a polaroid flies off it and lands on a guest's phone.
 * It loops; with reduced motion the photos simply sit on the phone.
 */
function HeroStage() {
  return (
    <div className="lp-stage" role="img" aria-label="A camera flashes and its photos land on a guest's phone, newest first">
      <div className="lp-stage-inner" aria-hidden="true">
        <div className="lp-phone">
          <div className="lp-phone-title">Photos - Ana and Mihai<small>12 Jun 2026</small></div>
          <div className="lp-phone-blank"><span /><span /><span /><span /></div>
        </div>

        <div className="lp-cam">
          <span className="lp-flash" />
          <svg viewBox="0 0 120 92">
            <rect x="4" y="22" width="112" height="66" rx="14" fill="currentColor" />
            <rect x="34" y="8" width="38" height="18" rx="6" fill="currentColor" />
            <rect x="12" y="30" width="22" height="9" rx="4.500" fill="var(--lp-amber)" />
            <circle cx="64" cy="56" r="25" fill="var(--lp-bg)" />
            <circle cx="64" cy="56" r="17" fill="var(--lp-teal)" />
            <circle cx="58" cy="50" r="5" fill="#fff" opacity=".55" />
          </svg>
        </div>

        {SLOTS.map((s, i) => (
          <div key={i} className="lp-photo" style={{ '--l': s.l, '--t': s.t, '--i': i, '--r': `${[-5, 4, 3, -4][i]}deg` }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
              <rect width="100" height="100" fill={SCENES[i].bg} />
              {SCENES[i].art}
            </svg>
            {i === SLOTS.length - 1 && <em>New</em>}
          </div>
        ))}
      </div>
    </div>
  )
}

const EVENT_KINDS = ['Weddings', 'Baptisms', 'Birthdays', 'Conferences', 'Concerts', 'Graduations', 'Corporate parties', 'Sports days', 'Trips']

function Ticker() {
  const items = [...EVENT_KINDS, ...EVENT_KINDS]
  return (
    <div className="lp-ticker" aria-label="Made for weddings, baptisms, birthdays, conferences, concerts and more">
      <ul aria-hidden="true">
        {items.map((k, i) => (
          <li key={i}>
            {k}
            <svg viewBox="0 0 24 24"><path d={SPARKLE} fill="currentColor" /></svg>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Signed-out front page: what the product does, and the Google sign-in at the top right. */
function LandingPage({ error, notice, onLogin }) {
  const [nudge, setNudge] = useState(false)
  const root = useRef(null)

  // A soft light follows the pointer on screens that have one; it is off with reduced motion.
  useEffect(() => {
    const el = root.current
    if (!el || typeof matchMedia !== 'function') return
    if (matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return
    let frame = 0
    const move = (e) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`)
        el.style.setProperty('--my', `${e.clientY}px`)
        el.classList.add('pointing')
      })
    }
    const leave = () => el.classList.remove('pointing')
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])

  function start() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setNudge(true)
    setTimeout(() => setNudge(false), 2400)
  }

  return (
    <div className="lp" ref={root}>
      <div className="lp-bg" aria-hidden="true">
        <span className="lp-blob b1" /><span className="lp-blob b2" /><span className="lp-blob b3" />
        <span className="lp-spot" />
      </div>
      <header className="lp-nav">
        <div className="lp-nav-in">
          <a href="/" className="lp-brand" aria-label="imemories home"><Logo label={false} /></a>
          <nav className="lp-links" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
          </nav>
          <div className={nudge ? 'lp-signin nudge' : 'lp-signin'}>
            <GoogleSignIn onLogin={onLogin} />
          </div>
        </div>
      </header>

      {(notice || error) && (
        <div className="lp-messages">
          {notice && <p role="status" className="notice">{notice}</p>}
          {error && <p role="alert" className="error">{error}</p>}
        </div>
      )}

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <h1>Guests get the photos before the party ends.</h1>
            <p className="lp-lede">
              Connect your cameras over FTP, put one QR code on the tables, and every shot lands on your guests' phones, newest first.
            </p>
            <div className="lp-cta">
              <button type="button" className="lp-btn" onClick={start}>Sign in to start</button>
              <a href="#how" className="lp-link">See how it works</a>
            </div>
            <ul className="lp-facts">
              <li>Works with any camera that can send FTP or SFTP</li>
              <li>Guests need no app and no account</li>
            </ul>
          </div>
          <HeroStage />
        </section>

        <Ticker />

        <div id="how" className="lp-how"><Tutorial /></div>

        <section id="features" className="lp-features" aria-labelledby="features-title">
          <h2 id="features-title">Everything an event photographer needs, and nothing to install</h2>
          <div className="lp-bento">
            <article className="lp-tile amber wide">
              <h3>Every camera, one gallery</h3>
              <p>Give each photographer or angle its own login. Their photos arrive in the same gallery, mixed together, newest first.</p>
              <div className="lp-chips" aria-hidden="true"><span>Ceremony</span><span>Dinner</span><span>Dance floor</span><span>Drone</span></div>
            </article>

            <article className="lp-tile mint">
              <h3>One QR code, with your name</h3>
              <p>It belongs to you, not to one event. Print it once and use it every time.</p>
              <div className="lp-mini-qr" aria-hidden="true">
                <svg viewBox={`-1 -1 ${QR.n + 2} ${QR.n + 2}`} shapeRendering="crispEdges"><path d={QR.d} fill="#16132b" /><path d={QR.finders} fill="#16132b" fillRule="evenodd" /></svg>
                <b>Ana Pop</b>
              </div>
            </article>

            <article className="lp-tile lilac">
              <h3>You choose who sees what</h3>
              <p>Public events show on your page. Protected ones ask for a password. Private ones only open from their link.</p>
              <div className="lp-seg" aria-hidden="true"><span>Public</span><span className="on"><Lock />Protected</span><span>Private</span></div>
            </article>

            <article className="lp-tile pink">
              <h3>Logins that clean up after themselves</h3>
              <p>Camera logins stop working 3 days after the event, so nothing is left open.</p>
            </article>

            <article className="lp-tile ink wide">
              <h3>Your page, your style</h3>
              <p>Pick a main event to show its photos straight away, choose colours and patterns, and ask visitors to follow you before they see the photos.</p>
            </article>

            <article className="lp-tile plain">
              <h3>Delete means gone</h3>
              <p>Remove an event or a camera and its photos are deleted from the cloud too.</p>
            </article>
          </div>
        </section>

        <section className="lp-final" aria-labelledby="final-title">
          <div className="lp-final-card">
            <h2 id="final-title">Your next event, live on every phone.</h2>
            <p>Sign in with Google and make your first event in a minute.</p>
            <div className="lp-final-cta">
              <GoogleSignIn onLogin={onLogin} size="large" />
            </div>
            <p className="lp-fine">We never see your Google password.</p>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <Logo label={false} />
        <p>imemories, short for Instant Memories.</p>
        <nav className="lp-legal" aria-label="Legal">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/refunds">Refunds and withdrawal</Link>
          <a href={LEGAL.anpcUrl} target="_blank" rel="noopener noreferrer" title={LEGAL.anpcLabel} aria-label={`${LEGAL.anpcLabel} (opens in a new tab)`}>ANPC</a>
          <button type="button" className="linklike" onClick={reopenConsent}>Cookie settings</button>
        </nav>
        <div className="lp-foot-row">
          <LegalIdentity />
          <a className="lp-sal" href={LEGAL.salUrl} target="_blank" rel="noopener noreferrer" title={LEGAL.salLabel} aria-label={`${LEGAL.salLabel} (opens in a new tab)`}>
            {SAL_IMG ? <img src={SAL_IMG} width="186" height="46" alt="" /> : 'Alternative dispute resolution (SAL)'}
          </a>
        </div>
      </footer>
    </div>
  )
}

/** Wraps the page in Google's provider only after the visitor allowed Google sign-in. */
export default function Landing(props) {
  const consent = useConsent()
  const page = <LandingPage {...props} />
  if (!consent?.google) return page
  return <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>{page}</GoogleOAuthProvider>
}
