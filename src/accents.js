/** Accent colors a photographer can pick for their page (the backend accepts exactly these). */
export const ACCENTS = [
  { name: 'Teal', value: '#0e7c6b' },
  { name: 'Blue', value: '#2f5bd8' },
  { name: 'Violet', value: '#7d4fd6' },
  { name: 'Orange', value: '#c2410c' },
  { name: 'Rose', value: '#be185d' },
  { name: 'Green', value: '#15803d' },
]

/** Colors for the follow buttons: the page accent (empty value), black, white, or one of the accents. */
export const SOCIAL_COLORS = [
  { name: 'Black', value: '#12161c' },
  { name: 'White', value: '#ffffff' },
  ...ACCENTS,
]

/** CSS variables that re-theme a page with the chosen accent. */
export function accentStyle(color) {
  return {
    '--accent': color,
    '--accent-strong': color,
    '--on-accent': '#ffffff',
    '--tint': `color-mix(in srgb, ${color} 14%, var(--paper))`,
  }
}

/** Reads {"message": ...} from a failed response, with a fallback. */
export async function readError(response, fallback) {
  try {
    const body = await response.json()
    return body.message || fallback
  } catch {
    return fallback
  }
}

/** Center-crops an image file to a square and shrinks it, so uploads stay small. Returns a JPEG blob. */
export async function squareJpeg(file, size = 512) {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close?.()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read the image'))), 'image/jpeg', 0.88))
}
