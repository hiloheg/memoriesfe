import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { startAnalytics, stopAnalytics, trackPage } from '../analytics.js'
import { useConsent } from '../consent.js'

/** Runs Google Analytics only while the visitor allows statistics; switching it off stops it and removes its cookies. */
export default function Analytics() {
  const allowed = useConsent()?.analytics === true
  const { pathname } = useLocation()

  useEffect(() => {
    if (!allowed) {
      stopAnalytics()
      return
    }
    if (startAnalytics()) trackPage(pathname)
  }, [allowed, pathname])

  return null
}
