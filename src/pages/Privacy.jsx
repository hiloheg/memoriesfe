import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { reopenConsent } from '../consent.js'

// Who is responsible for the data. The contact details come from the build settings so they can be kept up to date
// without editing this page (see .env.example). A privacy policy must give a way to reach the company.
const COMPANY = 'HILOHE GIGI PFA'
const CUI = '54766547'
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL
const ADDRESS = import.meta.env.VITE_COMPANY_ADDRESS
const UPDATED = '13 November 2026'

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
    // A link such as /privacy#faces lands on its section; otherwise start at the top.
    const target = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
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
          <a href="#storage">Cookie policy</a>
          <a href="#sharing">Who else sees data</a>
          <a href="#keep">How long we keep it</a>
          <a href="#rights">Your rights</a>
          <a href="#faces">Finding your photos by face</a>
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
                  <td>Guests who scan their face</td>
                  <td>The picture you take or choose, and a set of numbers measured from your face in it. Both exist only while we compare them, and are not saved.</td>
                  <td>To show you the photos of the event you appear in, when you press "Find my photos".</td>
                  <td>Your explicit consent (Art. 6(1)(a) and Art. 9(2)(a)), given before every scan</td>
                </tr>
                <tr>
                  <td>People in photos of events with face search on</td>
                  <td>A set of numbers measured from each face found in the event's photos. It is not a name and is not linked to any account.</td>
                  <td>Only to compare with a guest's own scan inside that same event. Not used for anything else.</td>
                  <td>The photographer decides when to switch it on (we are the processor, Art. 28). See "Finding your photos by face".</td>
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
          <p>We do not sell personal data, show ads or build advertising profiles. Visit statistics (Google Analytics) are collected only if you allow them in the cookie banner. Guests do not need an account to view photos. Adding photos needs a Google sign-in.</p>
        </section>

        <section id="storage">
          <h2>Cookie policy: cookies and browser storage</h2>
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
                <tr><td><code>memories.consent</code></td><td>Remembers your choices about Google sign-in and statistics.</td><td>Local storage, until you clear your browser data</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Optional: statistics (Google Analytics).</strong> If, and only if, you choose "Accept all" or tick "Statistics" in the cookie banner, we load Google Analytics 4 to count visits and see which pages are used,
            so we can improve the site. Until you allow it, Google Analytics is not loaded, nothing is sent to Google and no Analytics cookie is set. It sets these cookies on this site:
          </p>
          <div className="legal-table" role="region" aria-label="Statistics cookies" tabIndex={0}>
            <table>
              <thead><tr><th>Name</th><th>What it is for</th><th>How long</th></tr></thead>
              <tbody>
                <tr><td><code>_ga</code></td><td>Tells one browser from another, to count visitors.</td><td>2 years</td></tr>
                <tr><td><code>_ga_2CMX4RVC8T</code></td><td>Keeps the state of your visit, to count sessions.</td><td>2 years</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            What is sent: a random identifier, the page type (for example "a photo gallery", never the real address of a gallery, a photographer's page or an event, so private links are never shared),
            the browser, device type, language, approximate location (the city, worked out from the IP address, which Google Analytics does not store) and the time of the visit.
            We do not use Google's advertising features or link the data to your account or your photos.
            Legal basis: your consent (Art. 6(1)(a) GDPR and Law 506/2004). Google acts as our processor for this data under its data processing terms, and may handle it in the United States under the EU-US Data Privacy Framework or Standard Contractual Clauses.
            We keep the data for 14 months at most. You can withdraw consent at any time with "Cookie settings"; the cookies are then removed and nothing more is sent. Refusing has no effect on what you can do on the site.
          </p>
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
            <li><strong>Google Ireland Limited</strong>: sign-in (it is also an independent controller for your Google account) and, only if you allow statistics, Google Analytics.</li>
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
            <li><strong>Face measurements of event photos</strong> (only when face search is on): deleted with the event's photos, or earlier if the photographer deletes the photo or the event. They are never kept after the event ends.</li>
            <li><strong>A guest's own scan:</strong> not kept. The picture and its measurements are discarded as soon as the search finishes.</li>
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

        <section id="faces">
          <h2>Finding your photos by face</h2>
          <p>
            Photographers with a purchased credit can switch on "Find my photos" for an event. It is off unless the photographer turns it on.
            When it is on, a guest can scan their own face to see only the photos they appear in, shown as "Included myself".
            Measurements of faces are biometric data, a special category under the GDPR, so we handle them with extra care.
          </p>
          <ul>
            <li><strong>Your consent comes first.</strong> Before every scan you must tick a box agreeing to it. If you do not agree, nothing is scanned and you can still see all the photos.</li>
            <li><strong>Your scan is not kept.</strong> The picture and the measurements from it are used once, in memory, to compare with the faces found in that event's photos, and are then discarded. We do not save them, log them or send them to anyone.</li>
            <li><strong>Only inside one event.</strong> Faces are compared only with the photos of the event you are looking at. We do not build a list of people, match across events, name anyone, or link a face to an account.</li>
            <li><strong>Everything runs on our own server.</strong> No face data is sent to an outside face recognition service.</li>
            <li><strong>Photos of other people.</strong> To make the search work, the event's photos are scanned once and a set of measurements is kept for each face found. They are deleted with the event's photos (see "How long we keep it"). The photographer is the controller of the photos and decides to switch this on, and is responsible for having the right basis to do so, including telling the people they photograph where the law requires it. We are their processor.</li>
          </ul>
          <p>
            <strong>Your choices.</strong> You can withdraw consent at any time by not scanning; there is nothing stored to withdraw from our side for a guest's own scan.
            If you appear in a photo of an event with face search on and do not want your face measured, write to <Contact /> with the link to the event and we will remove the measurements and, with the photographer's agreement, switch the feature off for that event. You can also object to the photographer directly.
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

        <section id="payments">
          <h2>Payments</h2>
          <p>
            Credits are paid through Lemon Squeezy, which processes the payment and issues the receipt as merchant of record.
            We never see card details. We keep a record of your credits (your account id, amounts, dates and order numbers) to know your balance;
            the credit record (your account id, amounts, dates and order numbers) is kept after an account is deleted, for accounting and so that credits cannot be handed out twice.
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
    </div>
  )
}
