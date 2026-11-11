// Credits, event plans and expiry: pure helpers (the backend enforces the same rules).

/** The packs sold in Lemon Squeezy. Prices are in euro, before VAT. */
export const PACKS = [
  { pack: 1, credits: 1, price: 19 },
  { pack: 5, credits: 5, price: 85 },
  { pack: 10, credits: 10, price: 150 },
]

const DAY = 86400000
const round2 = (n) => Math.round(n * 100) / 100

/** Price of one event in a pack. */
export function perEvent(pack) {
  const p = PACKS.find((x) => x.pack === pack)
  return round2(p.price / p.credits)
}

/** What a plan gives: photos, days online, and how many cameras (null = no limit). */
export function describePlan(plan) {
  return plan === 'trial'
    ? { photos: 300, days: 30, cameras: 1 }
    : { photos: 3000, days: 90, cameras: null }
}

/** The moment an event created at `from` closes. */
export function expiryDate(plan, from = new Date()) {
  return new Date(from.getTime() + describePlan(plan).days * DAY)
}

/** Whole days left until `expiresAt` (an ISO date-time); part of a day counts as a day, past dates are 0. */
export function daysLeft(expiresAt, now = new Date()) {
  const left = new Date(expiresAt).getTime() - now.getTime()
  return left <= 0 ? 0 : Math.ceil(left / DAY)
}

/** True when the photographer should be reminded to download the photos. */
export function shouldWarn(plan, days) {
  return days <= (plan === 'trial' ? 7 : 14)
}

/** After opening the checkout we reload the balance until it changes, for at most a minute. */
export function shouldStopPolling(before, after, elapsedMs) {
  return after !== before || elapsedMs >= 60000
}

/** The plan the next event will get: a purchased credit is spent before the free one; null when there is nothing to spend. */
export function planToSpend(balance) {
  if (balance.full > 0) return 'full'
  if (balance.trial > 0) return 'trial'
  return null
}

const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** The text of the last step before a credit is used: what it costs, what the event gets, and the dates. */
export function confirmSummary({ plan, eventDate, today = new Date(), balanceTotal }) {
  const p = describePlan(plan)
  const what = plan === 'trial'
    ? `Trial event: up to ${p.photos} photos, ${p.cameras} camera, online for ${p.days} days`
    : `Full event: up to ${p.photos} photos, online for ${p.days} days`
  return {
    title: 'This uses 1 credit',
    lines: [
      `You have ${balanceTotal} ${balanceTotal === 1 ? 'credit' : 'credits'}`,
      what,
      `Event date: ${longDate.format(new Date(`${eventDate}T00:00:00Z`))}`,
      `Online until: ${longDate.format(expiryDate(plan, today))}`,
    ],
    note: 'The online-until date is fixed once the credit is used. You can still change the event name and icon later.',
  }
}

export function formatLongDate(value) {
  return longDate.format(new Date(value))
}

/** What the dashboard says about how long an event stays online; null for an event without a plan. */
export function eventStatus(event, now = new Date()) {
  if (event.purgedAt) return { kind: 'purged', text: `Photos deleted on ${formatLongDate(event.purgedAt)}` }
  if (event.expired) return { kind: 'expired', text: `Expired. Photos are deleted on ${formatLongDate(event.purgeAfter)}` }
  if (!event.plan || !event.expiresAt) return null
  const days = daysLeft(event.expiresAt, now)
  if (shouldWarn(event.plan, days)) return { kind: 'warning', text: `Expires in ${days} ${days === 1 ? 'day' : 'days'}. Download what you need` }
  return { kind: 'active', text: `Online for ${days} more ${days === 1 ? 'day' : 'days'}` }
}
