const KNOWN = {
  'instagram.com': 'Instagram',
  'facebook.com': 'Facebook',
  'fb.com': 'Facebook',
  'tiktok.com': 'TikTok',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'x.com': 'X',
  'twitter.com': 'X',
  'linkedin.com': 'LinkedIn',
  'pinterest.com': 'Pinterest',
  'threads.net': 'Threads',
  'behance.net': 'Behance',
  'vimeo.com': 'Vimeo',
  'spotify.com': 'Spotify',
}

/** Suggests a button name from a link: instagram.com/ana becomes "Instagram". Empty if the link is not a URL yet. */
export function labelFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').replace(/^m\./, '')
    if (!host.includes('.')) return ''
    return KNOWN[host] ?? host
  } catch {
    return ''
  }
}

const KEY = (slug) => `memories.follow.${slug}`

/** Which follow buttons this visitor already opened (kept in this browser only, keyed by link). */
export function readFollowed(slug) {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY(slug)) || '[]'))
  } catch {
    return new Set()
  }
}

export function writeFollowed(slug, set) {
  try {
    localStorage.setItem(KEY(slug), JSON.stringify([...set]))
  } catch {
    /* storage unavailable: progress lasts until the page is closed */
  }
}

const AGREED = 'memories.privacyAgreed'

/** Whether this visitor ticked the privacy box on a photographer's page (kept in this browser only). */
export function readAgreed() {
  try {
    return localStorage.getItem(AGREED) === '1'
  } catch {
    return false
  }
}

export function writeAgreed() {
  try {
    localStorage.setItem(AGREED, '1')
  } catch {
    /* storage unavailable: the choice lasts until the page is closed */
  }
}
