// Google Analytics 4, loaded only after the visitor allows statistics in the cookie banner (see consent.js).
// Until then nothing here contacts Google and no cookie is set.
const env = import.meta.env ?? {}

// The measurement ID is public (it is in every page that uses Analytics). Production falls back to ours; set
// VITE_GA_MEASUREMENT_ID to another ID, or to an empty value to turn statistics off altogether.
export const MEASUREMENT_ID = env.VITE_GA_MEASUREMENT_ID ?? (env.PROD ? 'G-2CMX4RVC8T' : '')

const FIXED_PAGES = new Set(['/', '/privacy', '/terms', '/refunds', '/profile', '/share', '/transactions'])

/**
 * The page as it is reported to Google. Addresses such as /e/<secret> or /<photographer>/<event> identify a private
 * gallery or a person, so only the kind of page is ever sent, never the real address.
 */
export function templatePath(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const path = '/' + parts.join('/')
  if (FIXED_PAGES.has(path)) return path
  if (parts[0] === 'events' && parts.length === 2) return '/events/[id]'
  if (parts[0] === 'e' && parts.length === 2) return '/e/[token]'
  if (parts.length === 1) return '/[profile]'
  if (parts.length === 2) return '/[profile]/[event]'
  return '/[other]'
}

/** The names of the Google Analytics cookies in a `document.cookie` string, so they can be removed when statistics are switched off. */
export function analyticsCookieNames(cookieString) {
  return cookieString
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((name) => name === '_ga' || name === '_gid' || name.startsWith('_ga_') || name.startsWith('_gat'))
}

let started = false
let lastPath = null

function gtag() {
  window.dataLayer.push(arguments) // gtag.js needs the arguments object itself, not an array
}

/** The page we came from, only when it was another site: inside this site it could be a private address. */
function outsideReferrer() {
  try {
    const ref = document.referrer && new URL(document.referrer)
    return ref && ref.origin !== window.location.origin ? ref.origin + '/' : ''
  } catch {
    return ''
  }
}

/** Loads Analytics (once) and lets it send. Safe to call again. */
export function startAnalytics() {
  if (!MEASUREMENT_ID || typeof document === 'undefined') return false
  window[`ga-disable-${MEASUREMENT_ID}`] = false
  if (started) return true
  started = true
  window.dataLayer = window.dataLayer || []
  // Advertising features stay off whatever the visitor chooses: Analytics is used for counting visits only.
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' })
  gtag('js', new Date())
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false, // single-page app: pages are reported by trackPage with a safe address
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_flags: 'SameSite=Lax;Secure',
  })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`
  document.head.appendChild(script)
  return true
}

/** Reports a page view with the generic page name instead of the real address. */
export function trackPage(pathname) {
  if (!started || !MEASUREMENT_ID) return
  const path = templatePath(pathname)
  if (path === lastPath) return
  lastPath = path
  const location = window.location.origin + path
  // Also set for anything Analytics measures on its own, so a real address never leaves the browser.
  gtag('set', { page_location: location, page_path: path, page_title: path, page_referrer: outsideReferrer() })
  gtag('event', 'page_view', { page_location: location, page_path: path, page_title: path, page_referrer: outsideReferrer() })
}

/** Stops sending and removes the Analytics cookies. Call when the visitor switches statistics off. */
export function stopAnalytics() {
  if (!MEASUREMENT_ID || typeof document === 'undefined') return
  window[`ga-disable-${MEASUREMENT_ID}`] = true
  lastPath = null
  const host = window.location.hostname.split('.')
  const domains = ['']
  for (let i = 0; i < host.length - 1; i++) domains.push(`; domain=${host.slice(i).join('.')}`)
  for (const name of analyticsCookieNames(document.cookie)) {
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`
  }
}
