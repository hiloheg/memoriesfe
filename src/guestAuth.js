// A guest's Google sign-in, kept for this browser tab only. It is separate from the photographer's sign-in:
// this token only works for adding photos to an event, never for managing events.
const API_URL = import.meta.env.VITE_API_URL
const KEY = 'memories.guestToken'

export function readGuestToken() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function writeGuestToken(value) {
  try {
    if (value) sessionStorage.setItem(KEY, value)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: the guest signs in again next time */
  }
}

/** fetch to the guest area of the API with the guest's token. */
export function guestFetch(path, { token, ...options }) {
  return fetch(`${API_URL}/api/v1/guest${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  })
}
