import { useCallback, useEffect, useRef, useState } from 'react'
import PhotoEditor from '../editor/PhotoEditor.jsx'
import { logoRect, shouldStamp } from '../editor/editorMath.js'
import { quickDownload } from '../editor/quickDownload.js'
import { viewUrl } from '../photoUrls.js'
import { FadeImage, SparkleLoader } from './Loaders.jsx'

/**
 * The photographer's logo drawn over the bottom-right of the photo as it is shown, in the same place and size the
 * saved file gets (logoRect). It follows the photo when the window is resized, and ignores clicks.
 */
function LightboxLogo({ url }) {
  const ref = useRef(null)
  const [natural, setNatural] = useState(null)
  const [box, setBox] = useState(null)

  useEffect(() => {
    const el = ref.current
    const photo = el?.parentElement?.querySelector('img.fade-img')
    if (!el || !photo || !natural) return
    const place = () => {
      const base = el.parentElement.getBoundingClientRect()
      const ir = photo.getBoundingClientRect()
      const r = ir.width && ir.height ? logoRect(ir.width, ir.height, natural.w, natural.h) : null
      setBox(r ? { left: ir.left - base.left + r.x, top: ir.top - base.top + r.y, width: r.w, height: r.h } : null)
    }
    place()
    const watch = new ResizeObserver(place)
    watch.observe(photo)
    window.addEventListener('resize', place)
    return () => { watch.disconnect(); window.removeEventListener('resize', place) }
  }, [natural])

  return (
    <img ref={ref} className="lb-logo" src={url} alt="" draggable="false" aria-hidden="true"
      onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      style={box ? box : { display: 'none' }} />
  )
}

/** Full-size photo with the sparkle loader until it has arrived (and the logo on top once it has). */
function LightboxImage({ url, fallback, logoUrl }) {
  const [ready, setReady] = useState(false)
  return (
    <>
      {!ready && <span className="lb-loader"><SparkleLoader size={40} /></span>}
      <FadeImage src={url} fallback={fallback} onLoaded={() => setReady(true)} onClick={(e) => e.stopPropagation()} />
      {ready && logoUrl && <LightboxLogo url={logoUrl} />}
    </>
  )
}

/** Photo viewer: arrows, keyboard and swipe. `index` is null when closed. */
export default function Lightbox({ photos, index, onIndex, onClose, onNearEnd, logoUrl = '', canEdit = true }) {
  const [touchX, setTouchX] = useState(null)
  const [editing, setEditing] = useState(false)
  const [sheet, setSheet] = useState(false) // the "Download / Edit and download" choice
  const [saving, setSaving] = useState(false)
  const count = photos.length

  const step = useCallback((d) => {
    if (index === null || count === 0) return
    onIndex((index + d + count) % count)
  }, [index, count, onIndex])

  useEffect(() => {
    if (index === null || editing) return
    if (onNearEnd && index >= count - 3) onNearEnd()
    const onKey = (e) => {
      if (e.key === 'Escape') { if (sheet) setSheet(false); else onClose() }
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, step, onClose, onNearEnd, editing, sheet])

  useEffect(() => { if (index === null) { setEditing(false); setSheet(false) } }, [index])

  /** One tap, no editor. If the photo cannot be prepared here, open the original instead. */
  async function download(photo) {
    if (saving) return
    setSaving(true)
    try {
      await quickDownload(photo, logoUrl)
      setSheet(false)
    } catch (e) {
      console.error(e)
      window.open(photo.url, '_blank', 'noopener')
      setSheet(false)
    } finally {
      setSaving(false)
    }
  }
  const closeEditor = useCallback(() => setEditing(false), [])
  const current = index === null ? null : photos[index]
  if (!current) return null

  return (
    <>
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1) } setTouchX(null) }}>
      <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
        <span>{index + 1} of {count}</span>
        <span style={{ display: 'flex', gap: 8 }}>
          {/* Without the editor (the photographer has not unlocked it) Download saves the photo straight away. */}
          <button type="button" aria-haspopup={canEdit ? 'menu' : undefined} aria-expanded={canEdit ? sheet : undefined}
            onClick={() => (canEdit ? setSheet((v) => !v) : download(current))} disabled={!canEdit && saving}>{!canEdit && saving ? 'Preparing...' : 'Download'}</button>
          <button onClick={onClose}>Close</button>
        </span>
      </div>
      <LightboxImage key={current.url} url={viewUrl(current)} fallback={current.url} logoUrl={shouldStamp(current, logoUrl) ? logoUrl : ''} />
      {count > 1 && (
        <>
          <button className="lb-nav lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1) }}>‹</button>
          <button className="lb-nav lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1) }}>›</button>
        </>
      )}
    </div>
    {canEdit && sheet && (
      <div className="lb-sheet-wrap" onClick={() => setSheet(false)}>
        <div className="lb-sheet" role="menu" aria-label="Download options" onClick={(e) => e.stopPropagation()}>
          <button type="button" role="menuitem" onClick={() => download(current)} disabled={saving}>
            <strong>{saving ? 'Preparing...' : 'Download'}</strong>
            <span>{shouldStamp(current, logoUrl) ? 'Original size, with the photographer’s logo' : 'The original photo, as it is'}</span>
          </button>
          <button type="button" role="menuitem" onClick={() => { setSheet(false); setEditing(true) }} disabled={saving}>
            <strong>Edit and download</strong>
            <span>Crop for Instagram or Facebook, add a look</span>
          </button>
          <button type="button" className="lb-sheet-cancel" onClick={() => setSheet(false)}>Cancel</button>
        </div>
      </div>
    )}
    {canEdit && editing && <PhotoEditor photo={current} logoUrl={logoUrl} onClose={closeEditor} />}
    </>
  )
}
