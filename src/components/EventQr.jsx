import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatDay } from '../dates.js'
import { fileSafe, saveQrImage } from '../qrImage.js'
import Logo from './Logo.jsx'

// 1x1 white pixel: tells the QR renderer to clear the modules under the logo, so the code stays scannable.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

/**
 * The QR code of one event, laid out as a card that can be printed for tables, signs or invitations.
 * Print shows only this card (see the print rules in App.css).
 */
export default function EventQr({ event }) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const codeRef = useRef(null)
  const address = event.shareUrl.replace(/^https?:\/\//, '')

  async function save() {
    setSaving(true)
    setFailed(false)
    try {
      await saveQrImage(codeRef.current, { filename: `${fileSafe(event.name)}-qr.png`, hole: { w: 140 / 320, h: 56 / 320 } })
    } catch {
      setFailed(true)
    }
    setSaving(false)
  }

  return (
    <section className="event-qr" aria-label="QR code for this event">
      <div className="event-qr-card">
        <h2 className="event-qr-name">{event.name}</h2>
        <p className="event-qr-date">{formatDay(event.eventDate)}</p>
        <div className="event-qr-code" ref={codeRef}>
          <QRCodeSVG
            value={event.shareUrl}
            size={320}
            level="H"
            marginSize={0}
            role="img"
            aria-label={`QR code that opens the photos of ${event.name}`}
            imageSettings={{ src: BLANK, width: 140, height: 56, excavate: true }}
          />
          <span className="event-qr-logo"><Logo label={false} /></span>
        </div>
        <p className="event-qr-scan">Scan to see the photos</p>
        <p className="event-qr-url">{address}</p>
      </div>
      <div className="event-qr-actions">
        <button type="button" className="primary" onClick={() => window.print()}>Print QR code</button>
        <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save as image'}</button>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(event.shareUrl); setCopied(true) }}>{copied ? 'Link copied' : 'Copy link'}</button>
      </div>
      {failed && <p role="alert" className="error">Could not save the image. Try again, or use Print and choose Save as PDF.</p>}
      {event.visibility === 'protected' && (
        <p className="muted event-qr-hint">Guests are asked for the event password after scanning. It is not printed on the card.</p>
      )}
    </section>
  )
}
