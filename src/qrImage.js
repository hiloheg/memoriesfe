const SPARKLE = 'M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z'
const SIZE = 1024 // pixels of the QR itself
const MARGIN = 96 // white border around it (the quiet zone scanners need)

function loadSvg(svg) {
  const clone = svg.cloneNode(true)
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not draw the QR code')) }
    img.src = url
  })
}

/** Draws "imemories" with the sparkle over the i, fitted inside a box centred at (cx, cy). Returns nothing. */
function drawLogo(ctx, { cx, cy, maxW, maxH, family, sparkle }) {
  let size = maxH
  const set = () => { ctx.font = `800 ${size}px ${family}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.045 * size}px` }
  set()
  const width = ctx.measureText('ımemories').width
  size = Math.min(size, size * (maxW / width))
  set()
  const total = ctx.measureText('ımemories').width
  const iWidth = ctx.measureText('ı').width
  const left = cx - total / 2
  const baseline = cy + size * 0.3
  ctx.fillStyle = '#12161c'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillText('ımemories', left, baseline)
  const s = size * 0.4
  ctx.save()
  ctx.translate(left + iWidth / 2 - s / 2, baseline - size * 0.98)
  ctx.scale(s / 24, s / 24)
  ctx.fillStyle = sparkle
  ctx.fill(new Path2D(SPARKLE))
  ctx.restore()
}

/**
 * Saves the QR code inside `root` as a PNG: the code on white with a quiet border, and the imemories logo
 * (plus the name, when given) in the cleared middle. `hole` is the cleared area as a share of the code.
 */
export async function saveQrImage(root, { filename, hole, caption }) {
  const svg = root.querySelector('svg')
  const logo = root.querySelector('.logo')
  if (!svg) throw new Error('No QR code to save')
  const img = await loadSvg(svg)
  const family = logo ? getComputedStyle(logo).fontFamily : 'sans-serif'
  try { await document.fonts.load(`800 40px ${family}`) } catch { /* fall back to whatever is available */ }
  const sparkle = (logo && getComputedStyle(logo).getPropertyValue('--sparkle').trim()) || '#0e7c6b'

  const total = SIZE + MARGIN * 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = total
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, total, total)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, MARGIN, MARGIN, SIZE, SIZE)

  const w = SIZE * hole.w
  const h = SIZE * hole.h
  const cx = total / 2
  const cy = total / 2
  ctx.fillStyle = '#fff'
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h)
  if (caption) {
    drawLogo(ctx, { cx, cy: cy - h * 0.22, maxW: w * 0.8, maxH: h * 0.3, family, sparkle })
    let size = h * 0.3
    ctx.fillStyle = '#12161c'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${size}px ${family}`
    const text = ctx.measureText(caption).width
    if (text > w * 0.86) { size *= (w * 0.86) / text; ctx.font = `800 ${size}px ${family}` }
    ctx.fillText(caption, cx, cy + h * 0.24, w * 0.86)
  } else {
    drawLogo(ctx, { cx, cy, maxW: w * 0.86, maxH: h * 0.5, family, sparkle })
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create the image')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A file-name friendly version of a title: "Ana & Mihai!" becomes "ana-mihai". */
export function fileSafe(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'qr'
}
