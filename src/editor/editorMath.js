// Pure editor geometry. No DOM, no imports.
// Rounding: sizes derived from ratios are floored (never exceed the source);
// derived heights from a preset width are rounded to the nearest integer.

export const PRESETS = [
  { key: 'original', label: 'Original', ratio: null, width: null },
  { key: 'ig-square', label: 'Instagram 1:1', ratio: 1, width: 1080 },
  { key: 'ig-portrait', label: 'Instagram 4:5', ratio: 4 / 5, width: 1080 },
  { key: 'ig-story', label: 'Story 9:16', ratio: 9 / 16, width: 1080 },
  { key: 'fb-post', label: 'Facebook 1.91:1', ratio: 1200 / 630, width: 1200 },
]

export const LOOKS = [
  { key: 'original', label: 'Original', filter: '' },
  { key: 'bw', label: 'B&W', filter: 'grayscale(1)' },
  { key: 'warm', label: 'Warm', filter: 'sepia(0.35) saturate(1.2)' },
  { key: 'cool', label: 'Cool', filter: 'hue-rotate(185deg) saturate(0.9)' },
  { key: 'vivid', label: 'Vivid', filter: 'saturate(1.5) contrast(1.1)' },
]

const EPS = 1e-9

/** Largest source-pixel rectangle of the given ratio inside the source (floored). */
export function minZoomCrop(frameRatio, srcW, srcH) {
  if (srcW / srcH > frameRatio) {
    return { w: Math.floor(srcH * frameRatio + EPS), h: srcH }
  }
  return { w: srcW, h: Math.floor(srcW / frameRatio + EPS) }
}

export function outputSize(preset, srcW, srcH) {
  if (!preset.ratio) {
    const scale = Math.min(1, 4000 / Math.max(srcW, srcH))
    return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) }
  }
  const crop = minZoomCrop(preset.ratio, srcW, srcH)
  if (crop.w <= preset.width) return { width: crop.w, height: crop.h }
  return { width: preset.width, height: Math.round(preset.width / preset.ratio) }
}

export function cropRect(frameRatio, srcW, srcH, zoom, cx, cy) {
  const min = minZoomCrop(frameRatio, srcW, srcH)
  const z = Math.max(1, zoom)
  const w = Math.max(1, Math.round(min.w / z))
  const h = Math.max(1, Math.round(min.h / z))
  const x = Math.min(Math.max(0, Math.round(cx - w / 2)), srcW - w)
  const y = Math.min(Math.max(0, Math.round(cy - h / 2)), srcH - h)
  return { x, y, w, h }
}

export function logoRect(outW, outH, logoW, logoH) {
  if (!logoW || !logoH) return null
  let w = outW * 0.18
  let h = (w * logoH) / logoW
  const maxH = outH * 0.12
  if (h > maxH) {
    h = maxH
    w = (h * logoW) / logoH
  }
  w = Math.round(w)
  h = Math.round(h)
  const margin = Math.round(outW * 0.03)
  return { x: outW - margin - w, y: outH - margin - h, w, h }
}

export function shouldStamp(photo, logoUrl) {
  return Boolean(logoUrl) && photo?.kind !== 'guest'
}

export function filterString(look, brightness = 1, contrast = 1) {
  return [look?.filter, `brightness(${brightness})`, `contrast(${contrast})`]
    .filter(Boolean)
    .join(' ')
}
