import { useEffect, useMemo, useRef, useState } from 'react'
import '../tutorial.css'
import { QR } from '../qr.js'

const STEP_SECONDS = 7

const STEPS = [
  { title: 'Create an event', text: 'Name, date and icon, then choose who can see it: everyone, only people with the password, or just those with the link.' },
  { title: 'Add a camera', text: 'Each angle gets its own FTP login that works until 3 days after the event. Its photos land straight in your gallery.' },
  { title: 'Share your QR code', text: 'One code with your name on it opens your page. Pick a main event to show its photos right away.' },
  { title: 'Guests scan and scroll', text: 'The newest photos come first, and guests open and download what they like. No account needed.' },
]

const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7C12 6.1 13.600 5 15.600 5 19 5 21.100 8.400 19.600 11.800 19.500 11.900 12 21 12 21Z'
const SPARKLE = 'M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z'

function SceneCreate() {
  return (
    <div className="t-scene t-create">
      <div className="t-modal">
        <div className="t-modal-title">New event</div>
        <div className="t-label">Event name</div>
        <div className="t-input"><span className="t-typed">Ana and Mihai</span></div>
        <div className="t-label">Event date</div>
        <div className="t-chip">12 Jun 2026</div>
        <div className="t-icons">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i === 2 ? 't-icon pick' : 't-icon'}>
              {i === 2 && <svg viewBox="0 0 24 24" aria-hidden="true"><path d={HEART} fill="currentColor" /></svg>}
            </span>
          ))}
        </div>
        <div className="t-seg"><span className="on">Public</span><span>Protected</span><span>Private</span></div>
        <div className="t-btn">Create event</div>
      </div>
      <div className="t-tile">
        <span className="t-icon pick"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={HEART} fill="currentColor" /></svg></span>
        <strong>Ana and Mihai</strong>
        <small>12 Jun 2026</small>
      </div>
    </div>
  )
}

function SceneCamera() {
  const tones = ['#f2b8a2', '#a9d4cf', '#f6d78b']
  return (
    <div className="t-scene t-camera">
      <div className="t-flow">
        <div className="t-cam" aria-hidden="true">
          <svg viewBox="0 0 64 52"><rect x="3" y="12" width="58" height="36" rx="8" fill="currentColor" /><rect x="20" y="4" width="22" height="10" rx="3" fill="currentColor" /><circle cx="32" cy="30" r="12" fill="var(--paper)" /><circle cx="32" cy="30" r="7" fill="var(--accent)" /></svg>
          <span>Ceremony</span>
        </div>
        <div className="t-track">
          {tones.map((c, i) => <span key={i} className="t-ph" style={{ '--i': i, background: c }} />)}
        </div>
        <div className="t-cloud" aria-hidden="true">
          <svg viewBox="0 0 64 44"><path d="M16 40a12 12 0 0 1-1.500-23.900A16 16 0 0 1 45 12.500 13 13 0 0 1 48 40Z" fill="currentColor" /></svg>
          <div className="t-stack">{tones.map((c, i) => <span key={i} style={{ '--i': i, background: c }} />)}</div>
        </div>
      </div>
      <div className="t-creds">
        <div><span>Host</span><b className="t-line" style={{ '--i': 0 }}>ftp.imemories.eu</b></div>
        <div><span>User</span><b className="t-line" style={{ '--i': 1 }}>cam_k3x9m2qa</b></div>
        <div><span>Password</span><b className="t-line" style={{ '--i': 2 }}>••••••••••••</b></div>
        <div className="t-until">Works until 15 Jun</div>
      </div>
    </div>
  )
}

function SceneQr() {
  const qr = QR
  return (
    <div className="t-scene t-qr">
      <div className="t-qr-card">
        <div className="t-qr-frame">
          <svg viewBox={`-1 -1 ${qr.n + 2} ${qr.n + 2}`} shapeRendering="crispEdges" aria-hidden="true">
            <path d={qr.d} fill="#12161c" />
            <path d={qr.finders} fill="#12161c" fillRule="evenodd" />
          </svg>
          <span className="t-qr-name">Ana Pop</span>
          <span className="t-scan" />
        </div>
        <div className="t-url">imemories.eu/ana-pop</div>
      </div>
      <div className="t-phone-scan" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d={SPARKLE} fill="currentColor" /></svg>
        <b>Opened</b>
      </div>
    </div>
  )
}

const GUEST = [
  { h: 70, bg: '#f2b8a2' }, { h: 54, bg: '#a9d4cf' }, { h: 54, bg: '#cfc3ee' },
  { h: 70, bg: '#f6d78b' }, { h: 60, bg: '#bcd9b6' }, { h: 60, bg: '#9ec3ee' },
]

function SceneGuest() {
  return (
    <div className="t-scene t-guest">
      <div className="t-phone">
        <div className="t-phone-title">Photos - Ana and Mihai <small>12 Jun 2026</small></div>
        <div className="t-grid">
          {[0, 1].map((c) => (
            <div key={c}>
              {GUEST.filter((_, i) => i % 2 === c).map((g, j) => {
                const index = j * 2 + c
                return (
                  <span key={index} className={index === 0 ? 't-shot fresh' : 't-shot'} style={{ height: g.h, background: g.bg, '--i': index }}>
                    {index === 0 && <em>New</em>}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SCENES = [SceneCreate, SceneCamera, SceneQr, SceneGuest]

/**
 * The how-it-works tutorial as a short looping animation: one scene per step.
 * A step lasts as long as its progress bar; the bar finishing moves to the next step,
 * so pausing (button, or hovering the scene) stops the bar and the scene together.
 */
export default function Tutorial() {
  const [step, setStep] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hover, setHover] = useState(false)
  const root = useRef(null)
  const reduced = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  // Nothing plays until the tutorial scrolls into view, so the first step is seen from its start.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { setStarted(true); io.disconnect() }
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const Scene = SCENES[step]
  const stopped = paused || hover
  const autoplay = started && !reduced

  return (
    <section className="tutorial" ref={root} aria-labelledby="tutorial-title">
      <div className="tut-head">
        <h2 id="tutorial-title">See how it works</h2>
        <p className="muted">From your first event to guests scrolling through photos.</p>
      </div>

      <div className={`tut${stopped ? ' stopped' : ''}`}>
        <div className="tut-stage" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <div className="tut-scene" aria-hidden="true">
            {started ? <Scene key={step} /> : null}
          </div>
          {autoplay && (
            <button type="button" className="tut-pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? 'Play the tutorial' : 'Pause the tutorial'}>
              {paused
                ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>}
            </button>
          )}
        </div>

        <ol className="tut-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className={i === step ? 'on' : i < step ? 'done' : ''}>
              <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
                <span className="tut-num">{i + 1}</span>
                <span className="tut-copy">
                  <strong>{s.title}</strong>
                  <span className="tut-text">{s.text}</span>
                </span>
                <span className="tut-bar" aria-hidden="true">
                  {i === step && autoplay && (
                    <span className="tut-fill" key={step} style={{ animationDuration: `${STEP_SECONDS}s` }}
                      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setStep((n) => (n + 1) % STEPS.length) }} />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="tut-caption" aria-live="polite">
          <strong>{STEPS[step].title}</strong>
          <p>{STEPS[step].text}</p>
        </div>
      </div>
    </section>
  )
}
