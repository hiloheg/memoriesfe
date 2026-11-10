// Passwords guests typed for protected events, kept for this browser tab only.
const key = (slug, eventSlug) => `memories.eventPassword.${slug}/${eventSlug}`

export function readPassword(slug, eventSlug) {
  try {
    return sessionStorage.getItem(key(slug, eventSlug)) ?? ''
  } catch {
    return ''
  }
}

export function writePassword(slug, eventSlug, value) {
  try {
    if (value) sessionStorage.setItem(key(slug, eventSlug), value)
    else sessionStorage.removeItem(key(slug, eventSlug))
  } catch {
    /* storage unavailable: the guest types it again next time */
  }
}

/** Header the backend reads to open a protected event. */
export function passwordHeaders(password) {
  return password ? { 'X-Event-Password': password } : {}
}
