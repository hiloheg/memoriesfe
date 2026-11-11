import { PRESETS, LOOKS, outputSize, cropRect, logoRect, filterString } from './editorMath.js'

const MAX_EDGE = 4000

/**
 * Fetch an image with CORS (bypassing a cached no-CORS response for the same URL)
 * and decode it to an ImageBitmap.
 */
export async function loadImage(url) {
  const res = await fetch(url, { mode: 'cors', cache: 'reload' })
  if (!res.ok) throw new Error(`Could not load the image (${res.status})`)
  const blob = await res.blob()
  const opts = { imageOrientation: 'from-image' }
  // Keep huge originals from exhausting memory (notably on iOS): decode at most MAX_EDGE on the long edge.
  const probe = await createImageBitmap(blob, opts)
  const long = Math.max(probe.width, probe.height)
  if (long <= MAX_EDGE) return probe
  const s = MAX_EDGE / long
  const w = Math.max(1, Math.round(probe.width * s))
  const h = Math.max(1, Math.round(probe.height * s))
  probe.close?.()
  return createImageBitmap(blob, { ...opts, resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })
}

/** Draw the cropped, filtered photo (and the logo, if any) onto `target`. */
export function renderEdit({ photo, logo, preset, zoom = 1, cx, cy, lookKey, brightness = 1, contrast = 1, target }) {
  const srcW = photo?.width ?? photo?.naturalWidth ?? 0
  const srcH = photo?.height ?? photo?.naturalHeight ?? 0
  if (!srcW || !srcH) throw new Error('Cannot render an image with zero size')

  const p = typeof preset === 'string' ? PRESETS.find((x) => x.key === preset) : preset
  if (!p) throw new Error('Unknown preset')
  const look = LOOKS.find((l) => l.key === lookKey) ?? LOOKS[0]

  const frameRatio = p.ratio ?? srcW / srcH
  const { width, height } = outputSize(p, srcW, srcH)
  if (!width || !height) throw new Error('Cannot render an image with zero size')
  const crop = cropRect(frameRatio, srcW, srcH, zoom, cx ?? srcW / 2, cy ?? srcH / 2)

  target.width = width
  target.height = height
  const ctx = target.getContext('2d')
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'

  // ctx.filter is missing on older Safari; skip filters there rather than crash.
  ctx.filter = 'filter' in ctx ? filterString(look, brightness, contrast) || 'none' : 'none'
  ctx.drawImage(photo, crop.x, crop.y, crop.w, crop.h, 0, 0, width, height)
  if ('filter' in ctx) ctx.filter = 'none'

  if (logo) {
    const r = logoRect(width, height, logo.width, logo.height)
    if (r) ctx.drawImage(logo, r.x, r.y, r.w, r.h)
  }
}

export function exportJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      canvas.width = 0 // free the pixel buffer (iOS caps total canvas memory)
      canvas.height = 0
      if (b) resolve(b)
      else reject(new Error('Could not export the image'))
    }, 'image/jpeg', 0.92)
  })
}
