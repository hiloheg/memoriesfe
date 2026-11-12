import { useCallback, useEffect, useRef, useState } from 'react'

const Camera = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
  </svg>
)
const ScanFace = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M9 10v1M15 10v1M9.5 15c.7.7 1.5 1 2.5 1s1.8-.3 2.5-1" />
  </svg>
)
const Person = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5" />
  </svg>
)

/**
 * Chips to filter photos by who took them: one chip per camera and per guest.
 * Pick as many as you like; nothing picked shows everything. Hidden when there is nothing to choose between.
 * `mine` ({ offered, active, count, onFind, onClear }) puts "My photos" first: it opens the face scan, and once a scan is applied it
 * turns into the "Included myself" chip that clears it.
 * When the chips are wider than the screen they scroll sideways: the ends fade out and, with a mouse, arrows appear.
 */
export default function TagFilter({ tags, selected, onChange, mine }) {
  const bar = useRef(null)
  const [edge, setEdge] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const el = bar.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setEdge((old) => (old.left === left && old.right === right ? old : { left, right }))
  }, [])
  const shown = tags.length >= 2 || Boolean(mine?.offered) || Boolean(mine?.active)
  useEffect(() => {
    const el = bar.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, shown, tags.length, mine?.active, selected.size])
  if (!shown) return null

  function toggle(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }
  function nudge(dir) {
    const el = bar.current
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: calm ? 'auto' : 'smooth' })
  }
  return (
    <div className="tag-bar" data-left={edge.left || undefined} data-right={edge.right || undefined}>
      <nav className="tabs tag-filter" aria-label="Filter photos by camera or guest" ref={bar} onScroll={measure}>
        {mine?.active ? (
          <button type="button" className="tab tag-mine" aria-pressed="true" onClick={mine.onClear} title="Show all the photos again">
            <ScanFace />
            Included myself <small>{mine.count}</small>
            <span aria-hidden="true" className="tag-x">×</span>
          </button>
        ) : mine?.offered && (
          <button type="button" className="tab tag-mine tag-find" onClick={mine.onFind} title="Scan your face to see only the photos you are in">
            <ScanFace />
            My photos
          </button>
        )}
        {tags.map((t) => (
          <button key={t.id} type="button" className={`tab tag-${t.kind}`} aria-pressed={selected.has(t.id)} onClick={() => toggle(t.id)}
            title={t.kind === 'guest' ? `Photos added by ${t.label}` : `Photos from the camera ${t.label}`}>
            {t.kind === 'guest' ? <Person /> : <Camera />}
            {t.label} <small>{t.count}</small>
          </button>
        ))}
        {selected.size > 0 && <button type="button" className="tab tag-clear" onClick={() => onChange(new Set())}>Clear</button>}
      </nav>
      {edge.left && <button type="button" className="tag-nudge tag-nudge-left" aria-label="Show earlier tags" tabIndex={-1} onClick={() => nudge(-1)}>‹</button>}
      {edge.right && <button type="button" className="tag-nudge tag-nudge-right" aria-label="Show more tags" tabIndex={-1} onClick={() => nudge(1)}>›</button>}
    </div>
  )
}
