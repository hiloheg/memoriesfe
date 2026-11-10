import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

// 1x1 white pixel: tells the QR renderer to clear the modules under the name, so the code stays scannable.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
const SIZE = 240

/** The photographer's QR code (high error correction) with their Google account name in the middle. */
export default function ProfileQr({ user }) {
  const [copied, setCopied] = useState(false)
  return (
    <aside className="table-card-wrap" aria-label="Your QR code">
      <div className="table-card">
        <div className="qr-frame qr-named">
          <QRCodeSVG
            value={user.shareUrl}
            size={SIZE}
            level="H"
            marginSize={0}
            imageSettings={{ src: BLANK, width: 108, height: 54, excavate: true }}
          />
          <span className="qr-name">{user.name}</span>
        </div>
        <p className="scan">Guests scan this to see your photos</p>
      </div>
      <div className="table-card-actions">
        <button onClick={() => { navigator.clipboard?.writeText(user.shareUrl); setCopied(true) }}>{copied ? 'Link copied' : 'Copy link'}</button>
        <button onClick={() => window.print()}>Print card</button>
      </div>
      <a className="share-url address-url" href={user.shareUrl} target="_blank" rel="noreferrer">{user.shareUrl.replace(/^https?:\/\//, '')}</a>
      <Link className="btn" to="/profile">Edit your page</Link>
    </aside>
  )
}
