import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import CookieBanner from '../components/CookieBanner.jsx'
import Logo from '../components/Logo.jsx'
import { reopenConsent } from '../consent.js'

// Who is responsible for the data. The contact details come from the build settings so they can be kept up to date
// without editing this page (see .env.example). A privacy policy must give a way to reach the company.
const COMPANY = 'HILOHE GIGI PFA'
const CUI = '54766547'
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL
const ADDRESS = import.meta.env.VITE_COMPANY_ADDRESS
const UPDATED = '10 November 2026'

function Contact() {
  return (
    <>
      {CONTACT_EMAIL
        ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        : <strong className="legal-missing">[contact email: set VITE_CONTACT_EMAIL]</strong>}
    </>
  )
}

/** Privacy policy and cookie notice (GDPR, Regulation (EU) 2016/679). Public, no sign-in. */
export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy policy | imemories'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="legal">
      <header className="legal-bar">
        <Link to="/" className="logo-link" aria-label="Go to the imemories home page"><Logo label={false} /></Link>
      </header>

      <main className="legal-body">
        <h1>Privacy policy</h1>
        <p className="muted">Last updated {UPDATED}. imemories (Instant Memories) lets photographers share event photos with their guests.</p>

        <nav className="legal-toc" aria-label="On this page">
          <a href="#who">Who we are</a>
          <a href="#roles">Two roles</a>
          <a href="#data">What we process</a>
          <a href="#storage">Cookies and storage</a>
          <a href="#sharing">Who else sees data</a>
          <a href="#keep">How long we keep it</a>
          <a href="#rights">Your rights</a>
          <a href="#photos">If you are in a photo</a>
          <a href="#security">Security</a>
        </nav>

        <section id="who">
          <h2>Who we are</h2>
          <p>
            The data controller is <strong>{COMPANY}</strong>, a sole trader (persoană fizică autorizată) registered in Romania, tax ID (CUI) <strong>{CUI}</strong>.
            {ADDRESS && <> Address: {ADDRESS}.</>}
          </p>
          <p>Contact for anything about your data: <Contact />.</p>
        </section>

        <section id="roles">
          <h2>Two roles</h2>
          <p>
            For the <strong>photographer's account</strong> (sign-in, page, events), we decide why and how data is used, so we are the controller.
          </p>
          <p>
            For the <strong>photos</strong> a photographer uploads, the photographer decides who is photographed and who can see the photos.
            The photographer is the controller of those photos and we are their processor: we store and show them on the photographer's instructions, and for no other purpose.
          </p>
        </section>

        <section id="data">
          <h2>What we process, why, and on what basis</h2>
          <div className="legal-table" role="region" aria-label="Data we process" tabIndex={0}>
            <table>
              <thead>
                <tr><th>Who</th><th>Data</th><th>Why</th><th>Legal basis</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Photographers</td>
                  <td>Google account ID, email, name and picture address from Google when you sign in.</td>
                  <td>To sign you in and to run your account.</td>
                  <td>Contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td>Photographers</td>
                  <td>What you put on your page: name, page address, tagline, bio, website, follow links, picture and logo you upload, colours and patterns.</td>
                  <td>To show your public page. It is public by your choice.</td>
                  <td>Contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td>Photographers</td>
                  <td>Events (name, date, icon, visibility, password if protected) and cameras (name, FTP username and password).</td>
                  <td>To run events and let cameras upload. Passwords are stored encrypted.</td>
                  <td>Contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td>Photographers' guests</td>
                  <td>The photos, which may show people.</td>
                  <td>To store and show them to the people the photographer shares them with.</td>
                  <td>The photographer decides (we are the processor, Art. 28)</td>
                </tr>
                <tr>
                  <td>Guests who add photos</td>
                  <td>Your Google account ID, your Google name, the photos you add and when you added them.</td>
                  <td>To let you add photos to an event, show your name next to them, and count your uploads against the limit the event creator set.</td>
                  <td>Your request to upload (Art. 6(1)(b)); for the photos, the event creator decides (we are the processor, Art. 28)</td>
                </tr>
                <tr>
                  <td>Everyone who visits</td>
                  <td>Your IP address and basic technical details (browser, time, page) in server logs.</td>
                  <td>To deliver the site, keep it secure and fix faults.</td>
                  <td>Legitimate interests (Art. 6(1)(f))</td>
                </tr>
                <tr>
                  <td>Anyone who writes to us</td>
                  <td>Your message and email address.</td>
                  <td>To answer you.</td>
                  <td>Legitimate interests (Art. 6(1)(f))</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>We do not sell personal data, show ads, build advertising profiles or use analytics trackers. Guests do not need an account to view photos. Adding photos needs a Google sign-in.</p>
        </section>

        <section id="storage">
          <h2>Cookies and browser storage</h2>
          <p>
            We do not set cookies of our own. We keep a few small items in your browser, only for the site to work. These are strictly necessary or something you asked for, so they do not need your consent:
          </p>
          <div className="legal-table" role="region" aria-label="Browser storage" tabIndex={0}>
            <table>
              <thead><tr><th>Name</th><th>What it is for</th><th>Where, and how long</th></tr></thead>
              <tbody>
                <tr><td><code>memories.idToken</code></td><td>Keeps a photographer signed in.</td><td>Session storage, until you close the tab or sign out</td></tr>
                <tr><td><code>memories.guestToken</code></td><td>Keeps you signed in with Google while you add photos to an event.</td><td>Session storage, until you close the tab or sign out</td></tr>
                <tr><td><code>memories.follow.*</code></td><td>Remembers which follow buttons you opened on a photographer's page, so you do not have to repeat them.</td><td>Local storage, until you clear your browser data</td></tr>
                <tr><td><code>memories.eventPassword.*</code></td><td>Remembers the password you typed for a protected event.</td><td>Session storage, until you close the tab</td></tr>
                <tr><td><code>memories.privacyAgreed</code></td><td>Remembers that you agreed to this policy on a photographer's page, so you are not asked again.</td><td>Local storage, until you clear your browser data</td></tr>
                <tr><td><code>memories.consent</code></td><td>Remembers your choice about Google sign-in.</td><td>Local storage, until you clear your browser data</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Google sign-in.</strong> Photographers sign in with Google. Google's sign-in code is loaded only after you allow it (in the banner, or by pressing "Sign in with Google").
            Loading it tells Google, an independent controller, that you visited, and Google may set its own cookies. See
            {' '}<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's privacy policy</a>.
            Guests who only view photos never load Google.
          </p>
          <p>
            <strong>Fonts</strong> are served from this site, not from a font provider, so viewing a page does not send your address to anyone else.
          </p>
          <p>
            <button type="button" onClick={reopenConsent}>Change your cookie settings</button>
          </p>
        </section>

        <section id="sharing">
          <h2>Who else sees data</h2>
          <p>We use these providers, who process data for us under data processing terms:</p>
          <ul>
            <li><strong>Google Ireland Limited</strong>: sign-in (it is also an independent controller for your Google account).</li>
            <li><strong>Neon</strong>: the database that holds account, event and camera records.</li>
            <li><strong>Cloudflare</strong>: storage for the photos and your uploaded picture.</li>
            <li>Our hosting provider, which runs this site and its server.</li>
          </ul>
          <p>
            If a provider handles data outside the European Economic Area, we rely on the EU-US Data Privacy Framework or on the European Commission's Standard Contractual Clauses.
            We may also share data when the law requires it.
          </p>
        </section>

        <section id="keep">
          <h2>How long we keep it</h2>
          <ul>
            <li><strong>Account, page, events, cameras and photos:</strong> until you delete them. Deleting an event or a camera deletes its photos from storage. Deleting your account deletes everything above.</li>
            <li><strong>Camera logins</strong> stop working 3 days after the event date, and are removed when you delete the camera or event.</li>
            <li><strong>Server logs:</strong> no longer than 30 days.</li>
            <li><strong>Messages to us:</strong> as long as needed to answer you, and then up to the time the law requires.</li>
          </ul>
        </section>

        <section id="rights">
          <h2>Your rights</h2>
          <p>Under the GDPR you can ask us to give you access to your data, correct it, delete it, limit how we use it, or send it to you in a portable form. You can object to processing based on legitimate interests, and you can withdraw consent at any time.</p>
          <p>
            Photographers can do the main ones themselves: in <strong>My page, Account</strong> you can download your data and delete your account.
            For anything else, write to <Contact />. We answer within one month.
          </p>
          <p>
            If you think we handled your data wrongly, you can complain to the Romanian data protection authority,
            ANSPDCP (<a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">dataprotection.ro</a>), or to the authority in your own country.
          </p>
        </section>

        <section id="guest-photos">
          <h2>Photos added by guests</h2>
          <p>
            When the event creator allows it, guests can sign in with Google and add their own photos to an event. The photos appear in the gallery straight away, with the guest's Google name shown next to them.
            Anyone who can open the event can see that name.
          </p>
          <p>
            Only the event creator can remove a guest's photo. We keep your Google name, account ID and upload times for as long as the event exists, and delete them with it.
            To have your name and photos removed earlier, write to <Contact /> from the Google account you used.
          </p>
        </section>

        <section id="photos">
          <h2>If you are in a photo</h2>
          <p>
            Photos belong to the photographer who shared them. If you appear in a photo and want it removed, ask the photographer first.
            You can also write to us at <Contact /> with the link to the page and we will pass the request on, and remove the photo when the photographer cannot or will not.
          </p>
          <p>
            When you download a photo you can crop and adjust it first. Editing happens on your device and the edited image is not uploaded anywhere. The logo that may be added to a photo is provided by the photographer.
          </p>
        </section>

        <section id="security">
          <h2>Security</h2>
          <p>
            Traffic is encrypted with HTTPS. Photos are kept in private storage and shown through short-lived links. Camera and event passwords are stored encrypted.
            Only the photographer can change an event, and protected events need their password before any photo is shown.
          </p>
        </section>

        <p className="muted">
          We may update this policy. The date at the top shows the latest version; for important changes we will tell photographers when they sign in.
        </p>
      </main>

      <footer className="legal-foot">
        <Link to="/">Back to imemories</Link>
        <button type="button" className="linklike" onClick={reopenConsent}>Cookie settings</button>
      </footer>
      <CookieBanner />
    </div>
  )
}
