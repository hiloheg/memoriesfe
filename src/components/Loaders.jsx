import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth.jsx'

const SPARKLE = 'M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z'

/** Small ring spinner for buttons and inline status. Decorative: the text next to it says what is happening. */
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

/** The logo sparkle, pulsing: used when a whole page or a big image is on its way. */
export function SparkleLoader({ size = 44 }) {
  return (
    <svg className="sparkle-loader" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={SPARKLE} fill="currentColor" />
    </svg>
  )
}

/** The one loading bar: a very thin line fixed to the top of the screen. `on` fades it in; it loops until switched off. */
export function TopBar({ on = true }) {
  return (
    <div className={on ? 'top-progress on' : 'top-progress'} role="progressbar" aria-label="Loading" aria-hidden={!on}>
      <span className="loading-bar" aria-hidden="true"><span className="lb-seg" /></span>
    </div>
  )
}

/** Centered loader for a whole screen: the bar and a sentence saying what we are waiting for. */
export function PageLoader({ label }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <SparkleLoader />
      <TopBar />
      <p>{label}</p>
    </div>
  )
}

/** Placeholder tiles shaped like the events grid. */
export function TilesSkeleton({ count = 3 }) {
  return (
    <div aria-busy="true">
      <ul className="events">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}><div className="skeleton tile-skeleton" /></li>
        ))}
      </ul>
    </div>
  )
}

/** Placeholder for the top of a photographer page. */
export function HeroSkeleton() {
  return (
    <div className="profile-hero" aria-busy="true" aria-label="Loading page">
      <div className="skeleton circle-skeleton" />
      <div className="profile-text">
        <div className="skeleton line" style={{ width: '60%', height: 44 }} />
        <div className="skeleton line" style={{ width: '45%' }} />
        <div className="skeleton line" style={{ width: '80%' }} />
      </div>
    </div>
  )
}

/** Placeholder blocks shaped like the photo grid. */
export function PhotoGridSkeleton() {
  const heights = [180, 240, 150, 210, 170, 230, 160, 200]
  return (
    <div aria-busy="true">
      <div className="masonry">
        {heights.map((h, i) => <div key={i} className="skeleton photo-skeleton" style={{ height: h }} />)}
      </div>
    </div>
  )
}

/** Placeholder for an event page. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true">
      <div className="skeleton line" style={{ width: 90, height: 16, marginBottom: 18 }} />
      <div className="skeleton line" style={{ width: '55%', height: 48, marginBottom: 14 }} />
      <div className="skeleton line" style={{ width: '30%', marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 150, marginBottom: 28, maxWidth: 720 }} />
      <div className="skeleton line" style={{ width: '25%', height: 28, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 64, marginBottom: 10, maxWidth: 720 }} />
      <div className="skeleton" style={{ height: 64, maxWidth: 720 }} />
    </div>
  )
}

/**
 * Photo tile that only starts downloading its image when it is about to scroll into view,
 * so a long gallery never fetches everything at once.
 */
export function LazyPhoto({ src, fallback, label, onOpen }) {
  const [near, setNear] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { setNear(true); io.disconnect() }
    }, { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return (
    <button ref={ref} className="photo" onClick={onOpen} aria-label={label}>
      {near && <FadeImage src={src} fallback={fallback} />}
    </button>
  )
}

/** Image that fades in once it has loaded; the box behind it shimmers until then. */
export function FadeImage({ src, fallback, alt = '', onLoaded, ...rest }) {
  const [loaded, setLoaded] = useState(false)
  const [broken, setBroken] = useState(false) // the small copy failed: show the original instead
  const done = () => { setLoaded(true); onLoaded?.() }
  return (
    <img
      {...rest}
      src={broken && fallback ? fallback : src}
      alt={alt}
      className={loaded ? 'fade-img loaded' : 'fade-img'}
      ref={(el) => { if (el?.complete && el.naturalWidth > 0 && !loaded) done() }}
      onLoad={done}
      onError={() => { if (fallback && !broken) setBroken(true) }}
    />
  )
}

/**
 * Thin bar at the top of the screen while the app waits for the backend.
 * It shows after a short delay so fast requests do not flash, and says so if a request is slow.
 */
export function TopProgress() {
  const { pending } = useAuth()
  const [visible, setVisible] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (pending > 0) {
      const show = setTimeout(() => setVisible(true), 150)
      const late = setTimeout(() => setSlow(true), 4000)
      return () => { clearTimeout(show); clearTimeout(late) }
    }
    // Stay a moment after the last request ends, so a quick one still reads as "done".
    const hide = setTimeout(() => { setVisible(false); setSlow(false) }, 300)
    return () => clearTimeout(hide)
  }, [pending])

  return (
    <>
      <TopBar on={visible} />
      {slow && <p className="slow-note" role="status">Still working. This is taking longer than usual.</p>}
    </>
  )
}
