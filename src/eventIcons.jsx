/** Icons a photographer can give an event. The keys match the ones the backend accepts. */
import { DEFAULT_ICON } from './eventIconList.js'

const SHAPES = {
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  wedding: (
    <>
      <circle cx="9" cy="14.5" r="5" />
      <circle cx="15" cy="14.5" r="5" />
      <path d="M12 3l1.8 2.2L12 8 10.2 5.2z" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  baptism: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  party: (
    <>
      <path d="M4 20l4-12 8 8z" />
      <path d="M14 5l1-2M18 9l2-1M17 5.5l2-2" />
    </>
  ),
  birthday: (
    <>
      <path d="M5 20h14v-6H5z" />
      <path d="M5 14c2 2 4 2 7 0s5-2 7 0" />
      <path d="M12 11V8M12 6V5.9" />
    </>
  ),
  concert: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="7" cy="18" r="2.5" />
      <circle cx="17" cy="16" r="2.5" />
    </>
  ),
  conference: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </>
  ),
  graduation: (
    <>
      <path d="M2.5 9L12 4.5 21.5 9 12 13.5z" />
      <path d="M6.5 11.5V16c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.5M21.5 9v5" />
    </>
  ),
  sports: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8.5 20h7" />
    </>
  ),
  corporate: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 13h17" />
    </>
  ),
  travel: <path d="M3 13l18-8-6 15-3-6-6-1z" />,
}


/** Outline icon for an event. Unknown keys fall back to the camera. */
export function EventIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {SHAPES[name] ?? SHAPES[DEFAULT_ICON]}
    </svg>
  )
}

/** The icon inside its tinted badge, as used on tiles and headings. */
export function EventBadge({ name, large = false }) {
  return (
    <span className={large ? 'event-icon big' : 'event-icon'}>
      <EventIcon name={name} />
    </span>
  )
}
