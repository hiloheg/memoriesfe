import { shouldStamp } from './editorMath.js'
import { loadImage, renderEdit, exportJpeg } from './renderEdit.js'

/** Hand a blob to the browser as a file download. */
export function saveBlob(blob, filename) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 10000)
}

/**
 * One-tap download, no editor. A camera photo of a photographer with a logo keeps its size (up to 4000 px) and gets the
 * logo; anything else is saved byte for byte as the original file.
 * Throws when the photo cannot be fetched (the caller falls back to opening the original).
 */
export async function quickDownload(photo, logoUrl) {
  const name = photo.name || 'photo.jpg'
  if (!shouldStamp(photo, logoUrl)) {
    const res = await fetch(photo.url, { mode: 'cors', cache: 'reload' })
    if (!res.ok) throw new Error(`Could not load the photo (${res.status})`)
    saveBlob(await res.blob(), name)
    return
  }
  const [image, logo] = await Promise.all([loadImage(photo.url), loadImage(logoUrl).catch(() => null)])
  try {
    const out = document.createElement('canvas')
    renderEdit({ photo: image, logo, preset: 'original', zoom: 1, lookKey: 'original', target: out })
    saveBlob(await exportJpeg(out), `${name.replace(/\.[^./\\]+$/, '')}.jpg`)
  } finally {
    image.close?.()
    logo?.close?.()
  }
}
