import { Link, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import EventDetail from './pages/EventDetail.jsx'
import Events from './pages/Events.jsx'
import PublicGallery from './pages/PublicGallery.jsx'
import Transactions from './pages/Transactions.jsx'
import ProfileEditor from './pages/ProfileEditor.jsx'
import Share from './pages/Share.jsx'
import PublicProfile from './pages/PublicProfile.jsx'
import Landing from './components/Landing.jsx'
import Privacy from './pages/Privacy.jsx'
import Refunds from './pages/Refunds.jsx'
import Terms from './pages/Terms.jsx'
import LegalFooter from './components/LegalFooter.jsx'
import CookieBanner from './components/CookieBanner.jsx'
import Analytics from './components/Analytics.jsx'
import Logo from './components/Logo.jsx'
import { PageLoader, TopProgress } from './components/Loaders.jsx'
import MainNav from './components/MainNav.jsx'
import UserMenu from './components/UserMenu.jsx'
import CreditsChip from './components/CreditsChip.jsx'
import { CreditsProvider } from './components/CreditsContext.jsx'
import './App.css'

function Brand() {
  return (
    <Link to="/" className="brand">
      <Logo />
    </Link>
  )
}

function SignIn() {
  const { error, notice, login } = useAuth()
  return <Landing error={error} notice={notice} onLogin={login} />
}

/** Layout for the photographer area: sign-in screen until signed in, then the top bar and the page. */
function PhotographerShell() {
  const { token, user } = useAuth()

  if (!token) return <SignIn />
  if (!user) return <PageLoader label="Checking your account…" />

  return (
    <CreditsProvider>
    <div className="app">
      <TopProgress />
      <header className="bar-wrap">
        <div className="bar">
          <Brand />
          <MainNav />
          <a className="btn primary visit-btn" href={user.shareUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></svg>
            <span>Visit my page</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <CreditsChip />
          <UserMenu />
        </div>
      </header>
      <div className="shell">
        <Outlet />
      </div>
      <LegalFooter />
    </div>
    </CreditsProvider>
  )
}

function App() {
  return (
    <>
    {/* One banner and one statistics switch for the whole site, so every page (including guest galleries) asks before anything optional loads. */}
    <Analytics />
    <CookieBanner />
    <Routes>
      <Route element={<PhotographerShell />}>
        <Route path="/" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/share" element={<Share />} />
        <Route path="/profile" element={<ProfileEditor />} />
        <Route path="/transactions" element={<Transactions />} />
      </Route>
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/refunds" element={<Refunds />} />
      <Route path="/e/:token" element={<PublicGallery />} />
      <Route path="/:slug" element={<PublicProfile />} />
      <Route path="/:slug/:eventSlug" element={<PublicProfile />} />
    </Routes>
    </>
  )
}

export default App
