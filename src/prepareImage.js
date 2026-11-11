const MAX_EDGE = 3000 // pixels on the longest side: plenty for a screen, small enough to upload on mobile data
const QUALITY = 0.88

/** Size that fits inside `max` on the longest side, never bigger than the original. */
export function fitWithin(width, height, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

const isHeic = (file) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)

/**
 * Turns whatever the guest picked into a JPEG that is not larger than 3000px: iPhone HEIC photos are converted,
 * big photos are shrunk. Throws an Error with a message that can be shown as it is.
 */
export async function prepareImage(file) {
  if (!file.type.startsWith('image/') && !isHeic(file)) throw new Error('Choose a photo')
  let source = file
  if (isHeic(file)) {
    try {
      const { default: heic2any } = await import('heic2any')
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
      source = Array.isArray(out) ? out[0] : out
    } catch {
      throw new Error('Could not read that photo. Try taking it again or choose a JPEG.')
    }
  }
  let bitmap
  try {
    bitmap = await createImageBitmap(source) // applies the photo's rotation
  } catch {
    throw new Error('Could not read that photo. Try taking it again or choose a JPEG.')
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new Error('Could not prepare that photo. Try another one.')
  const base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
