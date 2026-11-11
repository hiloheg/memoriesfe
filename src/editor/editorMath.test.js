import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESETS, LOOKS, outputSize, minZoomCrop, cropRect, logoRect, shouldStamp, filterString,
} from './editorMath.js'

const preset = (key) => PRESETS.find((p) => p.key === key)

test('outputSize', () => {
  assert.deepEqual(outputSize(preset('ig-story'), 4000, 3000), { width: 1080, height: 1920 })
  assert.deepEqual(outputSize(preset('ig-story'), 800, 600), { width: 337, height: 600 })
  assert.deepEqual(outputSize(preset('ig-square'), 800, 600), { width: 600, height: 600 })
  assert.deepEqual(outputSize(preset('original'), 1200, 800), { width: 1200, height: 800 })
  assert.deepEqual(outputSize(preset('original'), 8000, 4000), { width: 4000, height: 2000 })
})

test('cropRect', () => {
  const r = 9 / 16
  const min = minZoomCrop(r, 4000, 3000)
  assert.deepEqual(min, { w: 1687, h: 3000 })
  const c1 = cropRect(r, 4000, 3000, 1, 2000, 1500)
  assert.equal(c1.w, min.w)
  assert.equal(c1.h, min.h)
  const c2 = cropRect(r, 4000, 3000, 2, 2000, 1500)
  assert.equal(c2.w, Math.round(min.w / 2))
  assert.equal(c2.h, min.h / 2)
  const e = cropRect(r, 4000, 3000, 2, 0, 0)
  assert.equal(e.x, 0)
  assert.equal(e.y, 0)
  const e2 = cropRect(r, 4000, 3000, 2, 99999, 99999)
  assert.equal(e2.x, 4000 - e2.w)
  assert.equal(e2.y, 3000 - e2.h)
})

test('logoRect', () => {
  assert.deepEqual(logoRect(1000, 1000, 400, 100), { x: 1000 - 30 - 180, y: 1000 - 30 - 45, w: 180, h: 45 })
  const t = logoRect(1000, 1000, 100, 1000)
  assert.equal(t.h, 120)
  assert.equal(t.w, 12)
  assert.equal(logoRect(1000, 1000, 0, 0), null)
})

test('shouldStamp', () => {
  assert.equal(shouldStamp({ kind: 'guest' }, 'x.png'), false)
  assert.equal(shouldStamp({ kind: 'camera' }, 'x.png'), true)
  assert.equal(shouldStamp({ kind: 'camera' }, ''), false)
})

test('filterString', () => {
  const s = filterString(LOOKS[0], 1, 1)
  assert.ok(s.includes('brightness(1)'))
  assert.ok(s.includes('contrast(1)'))
  assert.ok(filterString(LOOKS.find((l) => l.key === 'bw'), 1.2, 0.8).startsWith('grayscale(1)'))
})
