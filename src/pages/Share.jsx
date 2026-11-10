import { useAuth } from '../auth.jsx'
import ProfileQr from '../components/ProfileQr.jsx'

/** The photographer's QR code on its own page: big, with copy and print. */
export default function Share() {
  const { user } = useAuth()
  return (
    <section>
      <div className="page-head">
        <h1>Share your photos</h1>
        <p className="muted">Print this card or send the link. Guests scan the code and land on your page{user.links?.length > 0 && user.followGate ? ', follow your buttons' : ''} and open your events.</p>
      </div>
      <div className="share-page">
        <ProfileQr user={user} />
      </div>
    </section>
  )
}
