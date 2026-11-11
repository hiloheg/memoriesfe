import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { fileSafe, saveQrImage } from '../qrImage.js'
import Logo from './Logo.jsx'

// 1x1 white pixel: tells the QR renderer to clear the modules under the name, so the code stays scannable.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
const SIZE = 240

/** The photographer's QR code (high error correction) with their Google account name in the middle. */
export default function ProfileQr({ user }) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const frameRef = useRef(null)

  async function save() {
    setSaving(true)
    try {
      await saveQrImage(frameRef.current, { filename: `${fileSafe(user.name)}-qr.png`, hole: { w: 108 / SIZE, h: 66 / SIZE }, caption: user.name })
    } catch {
      alert('Could not save the image. Try again, or use Print card and choose Save as PDF.')
    }
    setSaving(false)
  }

  return (
    <aside className="table-card-wrap" aria-label="Your QR code">
      <div className="table-card">
        <div className="qr-frame qr-named" ref={frameRef}>
          <QRCodeSVG
            value={user.shareUrl}
            size={SIZE}
            level="H"
            marginSize={0}
            imageSettings={{ src: BLANK, width: 108, height: 66, excavate: true }}
          />
          <span className="qr-name"><Logo label={false} /><b>{user.name}</b></span>
        </div>
        <p className="scan">Guests scan this to see your photos</p>
      </div>
      <div className="table-card-actions">
        <button onClick={() => { navigator.clipboard?.writeText(user.shareUrl); setCopied(true) }}>{copied ? 'Link copied' : 'Copy link'}</button>
        <button onClick={() => window.print()}>Print card</button>
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save as image'}</button>
      </div>
      <a className="share-url address-url" href={user.shareUrl} target="_blank" rel="noreferrer">{user.shareUrl.replace(/^https?:\/\//, '')}</a>
      <Link className="btn" to="/profile">Edit your page</Link>
    </aside>
  )
}
