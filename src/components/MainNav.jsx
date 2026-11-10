import { NavLink, useLocation } from 'react-router-dom'

const icon = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false }

const ICONS = {
  events: (
    <svg {...icon}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>
  ),
  share: (
    <svg {...icon}><rect x="3.5" y="3.5" width="6" height="6" rx="1.5" /><rect x="14.5" y="3.5" width="6" height="6" rx="1.5" /><rect x="3.5" y="14.5" width="6" height="6" rx="1.5" /><path d="M14.5 14.5h2.5v2.5M20.5 14.5v.01M14.5 20.5h.01M17.5 20.5h3v-3" /></svg>
  ),
  page: (
    <svg {...icon}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1-4 4-5.8 7.5-5.8s6.5 1.8 7.5 5.8" /></svg>
  ),
}

/** Main navigation: tabs in the top bar on desktop, a bottom tab bar on phones. */
export default function MainNav() {
  const { pathname } = useLocation()
  const eventsActive = pathname === '/' || pathname.startsWith('/events')
  return (
    <nav className="main-nav" aria-label="Main">
      <NavLink to="/" className={eventsActive ? 'nav-link active' : 'nav-link'} aria-current={eventsActive ? 'page' : undefined}>
        {ICONS.events}<span>Events</span>
      </NavLink>
      <NavLink to="/share" className="nav-link">{ICONS.share}<span>Share</span></NavLink>
      <NavLink to="/profile" className="nav-link">{ICONS.page}<span>My page</span></NavLink>
    </nav>
  )
}
