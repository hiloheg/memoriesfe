import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PACKS, daysLeft, describePlan, expiryDate, perEvent, shouldStopPolling, shouldWarn } from './credits.js'

test('the three packs and what each event costs', () => {
  assert.deepEqual(PACKS.map((p) => [p.pack, p.credits, p.price]), [[1, 1, 19], [5, 5, 85], [10, 10, 150]])
  assert.equal(perEvent(1), 19)
  assert.equal(perEvent(5), 17)
  assert.equal(perEvent(10), 15)
})

test('plans: trial is 300 photos for 30 days, full is 3000 photos for 90 days', () => {
  assert.deepEqual(describePlan('trial'), { photos: 300, days: 30, cameras: 1 })
  assert.deepEqual(describePlan('full'), { photos: 3000, days: 90, cameras: null })
})

test('an event stays online for the days of its plan', () => {
  const from = new Date('2026-12-01T00:00:00Z')
  assert.equal(expiryDate('full', from).toISOString().slice(0, 10), '2027-03-01')
  assert.equal(expiryDate('trial', from).toISOString().slice(0, 10), '2026-12-31')
})

test('days left counts whole days and never goes below zero', () => {
  const now = new Date('2026-12-01T00:00:00Z')
  assert.equal(daysLeft(new Date(now.getTime() + 41 * 86400000).toISOString(), now), 41)
  assert.equal(daysLeft(new Date(now.getTime() + 3600000).toISOString(), now), 1, 'part of a day counts as a day')
  assert.equal(daysLeft(new Date(now.getTime() - 86400000).toISOString(), now), 0)
})

test('the warning starts 14 days before a full event closes and 7 before a trial one', () => {
  assert.equal(shouldWarn('full', 14), true)
  assert.equal(shouldWarn('full', 15), false)
  assert.equal(shouldWarn('trial', 7), true)
  assert.equal(shouldWarn('trial', 8), false)
})

test('polling for new credits stops when the balance changes or after a minute', () => {
  assert.equal(shouldStopPolling(2, 3, 5000), true)
  assert.equal(shouldStopPolling(2, 2, 5000), false)
  assert.equal(shouldStopPolling(2, 2, 60000), true)
})
