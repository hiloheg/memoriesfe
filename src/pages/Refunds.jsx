import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage.jsx'
import { LEGAL } from '../legal.js'

// DRAFT: written from the product rules, to be reviewed by a Romanian lawyer before launch.

/** Refunds and the right of withdrawal. Public, no sign-in. */
export default function Refunds() {
  const mail = LEGAL.email
  return (
    <LegalPage title="Refunds and withdrawal" updated="11 November 2026" intro="How to get your money back and when you can change your mind.">
      <section>
        <h2>Changing your mind (14 days)</h2>
        <p>
          If you buy as a consumer, you can withdraw from a purchase within 14 days without giving a reason.
          Credits you have not used are refunded in full.
        </p>
      </section>

      <section>
        <h2>Credits you have used</h2>
        <p>
          Creating an event starts the service straight away. Before it uses a credit, the app asks you to confirm and tells you what the event includes.
          By confirming, you ask us to start the service immediately and you accept that, once an event has been created, you can no longer withdraw from that credit.
          A used credit is refunded only if the service did not work as described.
        </p>
      </section>

      <section>
        <h2>How to ask</h2>
        <p>
          Write to {mail ? <a href={`mailto:${mail}`}>{mail}</a> : <strong className="legal-missing">[contact email: set VITE_CONTACT_EMAIL]</strong>} from
          the address you used to buy, with your order number from the Lemon Squeezy receipt.
          Refunds go back to the original payment method through Lemon Squeezy. The refunded credits are removed from your account.
        </p>
      </section>

      <section>
        <h2>Problems and complaints</h2>
        <p>
          Tell us first and we will try to fix it. You can also use the alternative dispute resolution (SAL) platform of ANPC:{' '}
          <a href={LEGAL.salUrl} target="_blank" rel="noopener noreferrer">{LEGAL.salUrl}</a>. See also our <Link to="/terms">terms</Link>.
        </p>
      </section>
    </LegalPage>
  )
}
