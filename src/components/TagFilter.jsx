const Camera = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
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
 * `mine` ({ active, count, onClear }) adds the "Included myself" chip while a face search is applied.
 */
export default function TagFilter({ tags, selected, onChange, mine }) {
  if (tags.length < 2 && !mine?.active) return null
  function toggle(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }
  return (
    <nav className="tabs tag-filter" aria-label="Filter photos by camera or guest">
      {tags.map((t) => (
        <button key={t.id} type="button" className={`tab tag-${t.kind}`} aria-pressed={selected.has(t.id)} onClick={() => toggle(t.id)}
          title={t.kind === 'guest' ? `Photos added by ${t.label}` : `Photos from the camera ${t.label}`}>
          {t.kind === 'guest' ? <Person /> : <Camera />}
          {t.label} <small>{t.count}</small>
        </button>
      ))}
      {mine?.active && (
        <button type="button" className="tab tag-mine" aria-pressed="true" onClick={mine.onClear} title="Show all the photos again">
          <Person />
          Included myself <small>{mine.count}</small>
          <span aria-hidden="true" className="tag-x">×</span>
        </button>
      )}
      {selected.size > 0 && <button type="button" className="tab tag-clear" onClick={() => onChange(new Set())}>Clear</button>}
    </nav>
  )
}
