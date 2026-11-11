import LegalPage from '../components/LegalPage.jsx'
import LegalIdentity from '../components/LegalIdentity.jsx'
import { LEGAL } from '../legal.js'

// DRAFT: written from the product rules, to be reviewed by a Romanian lawyer before launch.

/** Terms and conditions of the service. Public, no sign-in. */
export default function Terms() {
  return (
    <LegalPage title="Terms and conditions" updated="11 November 2026" intro="These terms apply when you use imemories (Instant Memories) to share event photos.">
      <section>
        <h2>Who we are</h2>
        <LegalIdentity />
      </section>

      <section>
        <h2>The service</h2>
        <p>
          imemories lets a photographer create an event, connect one or more cameras that upload photos over FTP or SFTP, and share a QR code.
          Guests open the gallery without an app, download photos and, when the photographer allows it, add their own.
          The service is meant for professional use by photographers.
        </p>
      </section>

      <section>
        <h2>Credits and prices</h2>
        <ul>
          <li>One credit creates one event. Every Google account receives one free credit once.</li>
          <li>Packs: 1 credit for €19, 5 credits for €85, 10 credits for €150. Prices are shown without VAT; the checkout shows the final price.</li>
          <li>Payment is handled by Lemon Squeezy, which sells the credits as merchant of record and issues the receipt.</li>
          <li>Credits do not expire.</li>
          <li>Your first purchase unlocks your page look, your logo on downloaded camera photos, and the photo editor for your guests.</li>
        </ul>
      </section>

      <section>
        <h2>What an event includes</h2>
        <ul>
          <li><strong>Trial event</strong> (made with the free credit): up to 300 photos, 1 camera, online for 30 days.</li>
          <li><strong>Full event</strong> (made with a purchased credit): up to 3,000 photos, as many cameras as you need, online for 90 days.</li>
          <li>When the online time ends, the gallery closes. The photos, camera logins and guests’ names and photos are deleted afterwards (14 days later for new events). Only the details of the event stay: its name, date and icon.</li>
          <li>Download what you need before the gallery closes.</li>
        </ul>
      </section>

      <section>
        <h2>Your content and your guests</h2>
        <p>
          You are responsible for the photos you upload and for having the right to share them, including the consent of the people in them where the law requires it.
          Guests who add photos are asked to sign in with Google and are responsible for what they add.
          We may remove content that is illegal or breaks these terms.
        </p>
      </section>

      <section>
        <h2>Availability and responsibility</h2>
        <p>
          We work to keep the service available but cannot promise it will never be interrupted.
          To the extent the law allows, we are not responsible for losses caused by interruptions or by photos deleted when an event ends.
          Nothing here limits rights that the law does not allow to be limited.
        </p>
      </section>

      <section>
        <h2>Changes, law and complaints</h2>
        <p>
          We may change these terms; the date at the top shows the latest version. Romanian law applies.
          Consumers can also use the alternative dispute resolution (SAL) platform of ANPC: <a href={LEGAL.salUrl} target="_blank" rel="noopener noreferrer">{LEGAL.salUrl}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
