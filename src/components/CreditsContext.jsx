/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { shouldResumePolling, shouldStopPolling } from '../credits.js'
import BuyCreditsDialog from './BuyCreditsDialog.jsx'

const CreditsContext = createContext(null)

/**
 * One place that knows the credit balance for the whole photographer area: the header chip, the new-event dialog and the
 * locked screens all read it. It reloads when the tab comes back into view, and `startPolling` keeps checking for a minute
 * after a purchase (the payment confirmation can arrive a few seconds after the buyer is back).
 */
export function CreditsProvider({ children }) {
  const { apiFetch, user, setUser } = useAuth()
  const [data, setData] = useState(null) // { balance: { trial, full, total }, unlocked, history }
  const [buyOpen, setBuyOpen] = useState(false)
  const timer = useRef(null)
  const total = useRef(null)
  const checkoutOpenedAt = useRef(null) // when a checkout tab was last opened; null if none
  const unlockedSeen = useRef(user?.unlocked)

  const reload = useCallback(async () => {
    try {
      const r = await apiFetch('/api/v1/credits')
      if (!r.ok) return null
      const d = await r.json()
      total.current = d.balance.total
      setData(d)
      return d
    } catch {
      return null
    }
  }, [apiFetch])

  // The profile in `user` also says whether the account is unlocked; keep it in step after a purchase.
  useEffect(() => {
    if (data && user && user.unlocked !== data.unlocked && unlockedSeen.current !== data.unlocked) {
      unlockedSeen.current = data.unlocked
      setUser({ ...user, unlocked: data.unlocked })
    }
  }, [data, user, setUser])

  useEffect(() => () => clearInterval(timer.current), [])

  const watch = useCallback(async () => {
    clearInterval(timer.current)
    const before = total.current ?? (await reload())?.balance.total // the balance we are waiting to change
    const started = Date.now()
    timer.current = setInterval(async () => {
      const d = await reload()
      const after = d ? d.balance.total : before
      if (shouldStopPolling(before, after, Date.now() - started)) {
        clearInterval(timer.current)
        if (after !== before) checkoutOpenedAt.current = null // the purchase arrived: no need to keep watching on every return
      }
    }, 3000)
  }, [reload])

  /** Call right after the checkout tab is opened. */
  const startPolling = useCallback(() => {
    checkoutOpenedAt.current = Date.now()
    return watch()
  }, [watch])

  useEffect(() => {
    reload()
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      // Back from the checkout tab: the payment confirmation can still be on its way, so keep checking for a while.
      if (shouldResumePolling(checkoutOpenedAt.current)) watch()
      else reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload, watch])

  const value = useMemo(
    () => ({ data, reload, startPolling, openBuy: () => setBuyOpen(true) }),
    [data, reload, startPolling],
  )

  return (
    <CreditsContext.Provider value={value}>
      {children}
      <BuyCreditsDialog open={buyOpen} onClose={() => setBuyOpen(false)} />
    </CreditsContext.Provider>
  )
}

/** { data, reload, startPolling, openBuy }; `data` is null until the first answer. */
export function useCredits() {
  return useContext(CreditsContext)
}
