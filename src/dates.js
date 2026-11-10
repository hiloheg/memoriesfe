/** Camera logins stop working this many days after the event (the backend enforces the same rule). */
export const CAMERA_ACCESS_DAYS = 3

const pad = (n) => String(n).padStart(2, '0')
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** "2026-10-12" as a local date (no timezone shift). */
function parseDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayIso() {
  return toIso(new Date())
}

export function formatDay(iso) {
  return parseDay(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Last day camera logins work for an event on the given day. */
export function accessUntil(iso) {
  const d = parseDay(iso)
  d.setDate(d.getDate() + CAMERA_ACCESS_DAYS)
  return toIso(d)
}
