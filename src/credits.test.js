import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PACKS, confirmSummary, daysLeft, describePlan, eventStatus, expiryDate, lockedMessage, perEvent, planToSpend, shouldResumePolling, shouldStopPolling, shouldWarn } from './credits.js'

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

test('the confirmation names the credit, the dates and the limits', () => {
  const today = new Date('2026-12-01T00:00:00Z')
  const full = confirmSummary({ plan: 'full', eventDate: '2026-12-20', today, balanceTotal: 3 })
  assert.equal(full.title, 'This uses 1 credit')
  assert.ok(full.lines.includes('You have 3 credits'), full.lines.join('|'))
  assert.ok(full.lines.some((l) => l.includes('3000 photos') && l.includes('90 days')), full.lines.join('|'))
  assert.ok(full.lines.some((l) => l.includes('20 Dec 2026')), full.lines.join('|'))
  assert.ok(full.lines.some((l) => l.includes('1 Mar 2027')), full.lines.join('|'))
  assert.match(full.note, /fixed/)
  const one = confirmSummary({ plan: 'full', eventDate: '2026-12-20', today, balanceTotal: 1 })
  assert.ok(one.lines.includes('You have 1 credit'), one.lines.join('|'))
})

test('a trial event says it is a trial and has one camera', () => {
  const t = confirmSummary({ plan: 'trial', eventDate: '2026-12-20', today: new Date('2026-12-01T00:00:00Z'), balanceTotal: 1 })
  assert.ok(t.lines.some((l) => l.includes('Trial') && l.includes('300 photos') && l.includes('1 camera') && l.includes('30 days')), t.lines.join('|'))
  assert.ok(t.lines.some((l) => l.includes('31 Dec 2026')), t.lines.join('|'))
})

test('a purchased credit is spent before the free one', () => {
  assert.equal(planToSpend({ trial: 1, full: 2, total: 3 }), 'full')
  assert.equal(planToSpend({ trial: 1, full: 0, total: 1 }), 'trial')
  assert.equal(planToSpend({ trial: 0, full: 0, total: 0 }), null)
})

test('event status: online, warning, expired and purged', () => {
  const now = new Date('2026-12-01T10:00:00Z')
  const day = (n) => new Date(now.getTime() + n * 86400000).toISOString()
  const base = { plan: 'full', purgedAt: null, expired: false }
  assert.deepEqual(eventStatus({ ...base, expiresAt: day(41), purgeAfter: day(55) }, now), { kind: 'active', text: 'Online for 41 more days' })
  assert.deepEqual(eventStatus({ ...base, expiresAt: day(1), purgeAfter: day(15) }, now).kind, 'warning')
  assert.equal(eventStatus({ ...base, expiresAt: day(1), purgeAfter: day(15) }, now).text, 'Expires in 1 day. Download what you need')
  assert.equal(eventStatus({ ...base, plan: 'trial', expiresAt: day(10), purgeAfter: day(24) }, now).kind, 'active', 'a trial event warns only in its last 7 days')
  const expired = eventStatus({ ...base, expired: true, expiresAt: day(-1), purgeAfter: new Date('2026-12-14T00:00:00Z').toISOString() }, now)
  assert.equal(expired.kind, 'expired')
  assert.equal(expired.text, 'Expired. Photos are deleted on 14 Dec 2026')
  const purged = eventStatus({ ...base, expired: true, expiresAt: day(-20), purgeAfter: day(-6), purgedAt: new Date('2026-11-20T03:30:00Z').toISOString() }, now)
  assert.deepEqual(purged, { kind: 'purged', text: 'Photos deleted on 20 Nov 2026' })
  assert.equal(eventStatus({ plan: null, expiresAt: null, purgedAt: null, expired: false }, now), null, 'an event without a plan shows nothing')
})

test('a locked answer from the server becomes a plain message', () => {
  assert.equal(lockedMessage('locked: Buy any pack to change the look of your page'), 'Buy any pack to change the look of your page')
  assert.equal(lockedMessage('Something else'), null)
  assert.equal(lockedMessage(undefined), null)
})

test('coming back from the checkout tab starts the check again, for up to half an hour after opening it', () => {
  const opened = 1_000_000
  assert.equal(shouldResumePolling(null, opened), false, 'no purchase was started')
  assert.equal(shouldResumePolling(opened, opened + 5 * 60000), true)
  assert.equal(shouldResumePolling(opened, opened + 30 * 60000), true)
  assert.equal(shouldResumePolling(opened, opened + 31 * 60000), false)
})
