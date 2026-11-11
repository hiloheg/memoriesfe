import { useEffect, useMemo, useRef, useState } from 'react'
import { PRESETS, LOOKS, cropRect, shouldStamp } from './editorMath.js'
import { loadImage, renderEdit, exportJpeg } from './renderEdit.js'

const PREVIEW_MAX = 1600 // long edge of the bitmap used for the live preview
const ZOOM_MAX = 4
const FAIL = 'Could not prepare this photo. Download the original instead.'

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)
const finite = (n, fallback) => (Number.isFinite(n) ? n : fallback)

const ICONS = {
  crop: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M2 6h14a2 2 0 0 1 2 2v14" /></svg>,
  look: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><circle cx="15" cy="9" r="5.5" /><circle cx="12" cy="15" r="5.5" /></svg>,
  adjust: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>,
}

/** A small square of the photo with one look applied, like the iPhone's filter strip. */
function LookThumb({ bitmap, look }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c || !bitmap) return
    const S = 96
    c.width = S
    c.height = S
    const ctx = c.getContext('2d')
    const side = Math.min(bitmap.width, bitmap.height)
    if ('filter' in ctx) ctx.filter = look.filter || 'none'
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, S, S)
  }, [bitmap, look])
  return <canvas ref={ref} aria-hidden="true" />
}

/** The outline of a format, drawn in a 40px box so wide and tall shapes read at a glance. */
function shapeStyle(ratio) {
  return ratio >= 1 ? { width: 40, height: Math.round(40 / ratio) } : { height: 40, width: Math.round(40 * ratio) }
}

/** A smaller copy of the photo for fast redraws while dragging. */
async function makePreview(bitmap) {
  const long = Math.max(bitmap.width, bitmap.height)
  if (!long) throw new Error('Cannot edit an image with zero size')
  if (long <= PREVIEW_MAX) return null // the photo itself is small enough
  const s = PREVIEW_MAX / long
  return createImageBitmap(bitmap, {
    resizeWidth: Math.max(1, Math.round(bitmap.width * s)),
    resizeHeight: Math.max(1, Math.round(bitmap.height * s)),
    resizeQuality: 'high',
    imageOrientation: 'from-image',
  })
}

/**
 * Crop, zoom and filter a photo on the visitor's device, then save it as a JPEG.
 * photo: { url, name, kind }; logoUrl: '' when the photographer has no logo.
 */
export default function PhotoEditor({ photo, logoUrl = '', onClose }) {
  const [assets, setAssets] = useState(null) // { full, preview, logo } once loaded
  const [failed, setFailed] = useState(false)
  const [logoMissing, setLogoMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tool, setTool] = useState('crop') // crop | look | adjust
  const [presetKey, setPresetKey] = useState('original')
  const [lookKey, setLookKey] = useState('original')
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 }) // fractions of the photo
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const canvasRef = useRef(null)
  const dialogRef = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const stampUrl = shouldStamp(photo, logoUrl) ? logoUrl : ''
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey])

  // Load the photo (and the logo when it will be stamped); close every bitmap when done.
  useEffect(() => {
    let cancelled = false
    const made = []
    setAssets(null)
    setFailed(false)
    setLogoMissing(false)
    ;(async () => {
      try {
        const full = await loadImage(photo.url)
        if (cancelled) { full.close?.(); return }
        made.push(full)
        if (!full.width || !full.height) throw new Error('zero size')
        const small = await makePreview(full)
        if (cancelled) { small?.close?.(); return }
        if (small) made.push(small)
        let logo = null
        if (stampUrl) {
          try {
            logo = await loadImage(stampUrl)
            if (cancelled) { logo.close?.(); return }
            made.push(logo)
          } catch (e) {
            console.error(e)
            logo = null // a missing logo should not block saving the photo
            if (!cancelled) setLogoMissing(true)
          }
        }
        if (cancelled) return
        setAssets({ full, preview: small ?? full, logo })
      } catch (e) {
        console.error(e)
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      made.forEach((b) => b.close?.())
    }
  }, [photo.url, stampUrl])

  // Redraw the preview whenever a setting changes.
  useEffect(() => {
    if (!assets || !canvasRef.current) return
    const src = assets.preview
    try {
      renderEdit({
        photo: src, logo: assets.logo, preset, zoom: finite(zoom, 1),
        cx: finite(center.x, 0.5) * src.width, cy: finite(center.y, 0.5) * src.height,
        lookKey, brightness, contrast, target: canvasRef.current,
      })
    } catch (e) {
      console.error(e)
      setFailed(true)
    }
  }, [assets, preset, zoom, center, lookKey, brightness, contrast])

  // Esc closes the editor; focus moves in and goes back out; Tab stays inside.
  useEffect(() => {
    const before = document.activeElement
    dialogRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key === 'Tab' && dialogRef.current) {
        const items = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href], input')]
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (before instanceof HTMLElement && before.isConnected) before.focus()
    }
  }, [onClose])

  const setZoomSafe = (z) => setZoom(clamp(finite(z, 1), 1, ZOOM_MAX))

  // Wheel zoom needs a non-passive listener so the page behind does not scroll.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      setZoom((z) => clamp(finite(z, 1) * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 1, ZOOM_MAX))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [assets])

  function currentCrop() {
    const src = assets.preview
    return cropRect(preset.ratio ?? src.width / src.height, src.width, src.height, finite(zoom, 1),
      finite(center.x, 0.5) * src.width, finite(center.y, 0.5) * src.height)
  }
  const dist = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  function onPointerDown(e) {
    if (!assets) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    gesture.current = pointers.current.size === 2 ? { pinch: dist(), zoom } : null
  }
  function onPointerMove(e) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || !assets) return
    const next = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, next)
    if (pointers.current.size >= 2) {
      const g = gesture.current
      const d = dist()
      if (g && g.pinch > 0 && d > 0) setZoomSafe(g.zoom * (d / g.pinch))
      return
    }
    const box = e.currentTarget.getBoundingClientRect()
    if (!box.width || !box.height) return
    const crop = currentCrop()
    const src = assets.preview
    const dx = ((next.x - prev.x) * crop.w) / box.width
    const dy = ((next.y - prev.y) * crop.h) / box.height
    setCenter((c) => ({
      x: clamp(finite(c.x, 0.5) - dx / src.width, 0, 1),
      y: clamp(finite(c.y, 0.5) - dy / src.height, 0, 1),
    }))
  }
  function onPointerUp(e) {
    pointers.current.delete(e.pointerId)
    gesture.current = null
  }
  function nudge(dx, dy) {
    if (!assets) return
    const crop = currentCrop()
    const src = assets.preview
    setCenter((c) => ({
      x: clamp(finite(c.x, 0.5) + (dx * crop.w * 0.1) / src.width, 0, 1),
      y: clamp(finite(c.y, 0.5) + (dy * crop.h * 0.1) / src.height, 0, 1),
    }))
  }
  function onCanvasKey(e) {
    const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (m) { e.preventDefault(); nudge(...m) }
  }

  function choosePreset(key) {
    setPresetKey(key)
    setZoom(1)
    setCenter({ x: 0.5, y: 0.5 })
  }

  async function save() {
    if (!assets || saving) return
    setSaving(true)
    try {
      const out = document.createElement('canvas')
      const src = assets.full
      renderEdit({
        photo: src, logo: assets.logo, preset, zoom: finite(zoom, 1),
        cx: finite(center.x, 0.5) * src.width, cy: finite(center.y, 0.5) * src.height,
        lookKey, brightness, contrast, target: out,
      })
      const blob = await exportJpeg(out)
      if (!alive.current) return
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `${(photo.name || 'photo').replace(/\.[^./\\]+$/, '')}-${preset.key}.jpg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 10000)
      onClose()
    } catch (e) {
      console.error(e)
      if (!alive.current) return
      setFailed(true)
      setSaving(false)
    }
  }

  const TOOLS = [['crop', 'Crop', ICONS.crop], ['look', 'Looks', ICONS.look], ['adjust', 'Adjust', ICONS.adjust]]
  const srcRatio = assets ? assets.preview.width / assets.preview.height : 1
  const pct = (v) => { const n = Math.round((v - 1) * 100); return n > 0 ? `+${n}` : String(n) }

  return (
    <div className="photo-editor" role="dialog" aria-modal="true" aria-label="Edit photo" ref={dialogRef} tabIndex={-1}>
      <div className="pe-bar">
        <button type="button" onClick={onClose}>Cancel</button>
        {assets && !failed && (
          <button type="button" className="pe-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        )}
      </div>

      {failed ? (
        <div className="pe-fail" role="alert">
          <p>{FAIL}</p>
          <a className="btn" href={photo.url} target="_blank" rel="noreferrer" download={photo.name}>Download the original</a>
        </div>
      ) : !assets ? (
        <div className="pe-stage" aria-busy="true"><p className="pe-wait" role="status">Preparing your photo...</p></div>
      ) : (
        <>
          <div className="pe-stage">
            <canvas
              ref={canvasRef}
              className="pe-canvas"
              tabIndex={0}
              aria-label="Preview. Drag or use the arrow keys to move the photo, scroll or use the Zoom slider to zoom."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onCanvasKey}
            />
          </div>
          {logoMissing && <p className="pe-note" role="status">Logo unavailable — the photo will be saved without it.</p>}

          <div className="pe-panel" role="tabpanel" aria-label={TOOLS.find((t) => t[0] === tool)[1]}>
            {tool === 'crop' && (
              <>
                <div className="pe-strip" role="group" aria-label="Format">
                  {PRESETS.map((p) => (
                    <button key={p.key} type="button" className={`pe-tile${p.key === presetKey ? ' on' : ''}`} aria-pressed={p.key === presetKey} onClick={() => choosePreset(p.key)}>
                      <span className="pe-thumb"><span className="pe-shape" style={shapeStyle(p.ratio ?? srcRatio)} /></span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
                <div className="pe-rows">
                  <label className="pe-row">Zoom<input type="range" min="1" max={ZOOM_MAX} step="0.01" value={zoom} onChange={(e) => setZoomSafe(Number(e.target.value))} /><output>{zoom.toFixed(1)}x</output></label>
                </div>
              </>
            )}
            {tool === 'look' && (
              <div className="pe-strip" role="group" aria-label="Look">
                {LOOKS.map((l) => (
                  <button key={l.key} type="button" className={`pe-tile${l.key === lookKey ? ' on' : ''}`} aria-pressed={l.key === lookKey} onClick={() => setLookKey(l.key)}>
                    <span className="pe-thumb"><LookThumb bitmap={assets.preview} look={l} /></span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
            {tool === 'adjust' && (
              <div className="pe-rows">
                <label className="pe-row">Brightness<input type="range" min="0.5" max="1.5" step="0.01" value={brightness} onChange={(e) => setBrightness(finite(Number(e.target.value), 1))} /><output>{pct(brightness)}</output></label>
                <label className="pe-row">Contrast<input type="range" min="0.5" max="1.5" step="0.01" value={contrast} onChange={(e) => setContrast(finite(Number(e.target.value), 1))} /><output>{pct(contrast)}</output></label>
                <button type="button" className="pe-reset" onClick={() => { setBrightness(1); setContrast(1) }} disabled={brightness === 1 && contrast === 1}>Reset</button>
              </div>
            )}
          </div>

          <div className="pe-tabs" role="tablist" aria-label="Editing tools">
            {TOOLS.map(([key, label, icon]) => (
              <button key={key} type="button" role="tab" className="pe-tab" aria-selected={tool === key} onClick={() => setTool(key)}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
