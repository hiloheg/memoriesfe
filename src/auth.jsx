import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { googleLogout } from '@react-oauth/google'

const API_URL = import.meta.env.VITE_API_URL
const STORAGE_KEY = 'memories.idToken'

const AuthContext = createContext(null)

function readToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeToken(value) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

/**
 * Holds the Google ID token; the backend decides whether it is valid and allowed.
 * `notice` is a friendly message for the sign-in screen (signed out, session expired);
 * `error` is a rejection from the backend (account not allowed, server problem).
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pending, setPending] = useState(0) // backend requests in flight

  const clear = useCallback((message) => {
    writeToken(null)
    googleLogout() // stops Google from silently re-selecting this account
    setToken(null)
    setUser(null)
    setNotice(message ?? null)
  }, [])

  const logout = useCallback(() => clear('You signed out.'), [clear])

  const login = useCallback((idToken) => {
    writeToken(idToken)
    setError(null)
    setNotice(null)
    setToken(idToken)
  }, [])

  // Ask the backend who we are; a rejected token sends the user back to sign in.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`${API_URL}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401) throw new Error('This Google account cannot use Memories, or your session expired. Sign in again.')
        if (!r.ok) throw new Error(`The server returned an error (${r.status}). Try again in a moment.`)
        return r.json()
      })
      .then((u) => !cancelled && setUser(u))
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
        clear()
      })
    return () => {
      cancelled = true
    }
  }, [token, clear])

  const apiFetch = useCallback(
    (path, options = {}) => {
      setPending((n) => n + 1)
      return fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (r.status === 401) clear('Your session expired. Sign in again to continue.')
          return r
        })
        .finally(() => setPending((n) => n - 1))
    },
    [token, clear],
  )

  const value = useMemo(
    () => ({ token, user, setUser, error, notice, pending, login, logout, apiFetch }),
    [token, user, error, notice, pending, login, logout, apiFetch],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
