import { useSyncExternalStore } from 'react'

// What the visitor chose about the two optional things this site can load: Google sign-in and Google Analytics statistics.
// Nothing optional runs before a choice is saved. The choice is kept in this browser so we do not ask again;
// it can be changed any time from "Cookie settings".
const KEY = 'memories.consent'
const EVENT = 'memories:consent'
const REOPEN = 'memories:consent-open'

let cached
function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function snapshot() {
  // useSyncExternalStore needs a stable object between changes
  const raw = (() => { try { return localStorage.getItem(KEY) } catch { return null } })()
  if (cached?.raw !== raw) cached = { raw, value: read() }
  return cached.value
}

function subscribe(listener) {
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

/** Saves the choice: `google` is true when loading Google sign-in is allowed, `analytics` when statistics are allowed. */
export function saveConsent({ google, analytics }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ google: Boolean(google), analytics: Boolean(analytics), at: new Date().toISOString() }))
  } catch {
    /* storage unavailable: the banner shows again next visit */
  }
  window.dispatchEvent(new Event(EVENT))
}

/** The visitor pressed "Sign in with Google": allow Google and keep whatever they chose about statistics (off if they have not chosen). */
export function allowGoogle() {
  saveConsent({ google: true, analytics: Boolean(snapshot()?.analytics) })
}

/** True once the visitor has made the current choice. An older saved choice that did not cover statistics counts as not made. */
export function isDecided(consent) {
  return typeof consent?.analytics === 'boolean'
}

/** Opens the banner again (the "Cookie settings" links). */
export function reopenConsent() {
  window.dispatchEvent(new Event(REOPEN))
}

export function onReopen(handler) {
  window.addEventListener(REOPEN, handler)
  return () => window.removeEventListener(REOPEN, handler)
}

/** `null` until the visitor has chosen; then { google, at }. */
export function useConsent() {
  return useSyncExternalStore(subscribe, snapshot, () => null)
}
