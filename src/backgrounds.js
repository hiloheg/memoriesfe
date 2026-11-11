import { accentStyle } from './accents.js'

/*
 * Page backgrounds. The backend stores only the keys below (and validates them),
 * so any key added here must also be added to ProfileController on the backend.
 * `tone` says whether the background is light or dark, so the page can switch its text and card colors.
 */
export const COLORS = [
  { key: 'snow', name: 'Snow', css: '#ffffff', tone: 'light' },
  { key: 'mist', name: 'Mist', css: '#eef2f6', tone: 'light' },
  { key: 'sand', name: 'Sand', css: '#f3ece0', tone: 'light' },
  { key: 'blush', name: 'Blush', css: '#fbe6ec', tone: 'light' },
  { key: 'mint', name: 'Mint', css: '#e0f3ea', tone: 'light' },
  { key: 'sky', name: 'Sky', css: '#e1ecfa', tone: 'light' },
  { key: 'lavender', name: 'Lavender', css: '#ebe4fa', tone: 'light' },
  { key: 'midnight', name: 'Midnight', css: '#10162b', tone: 'dark' },
  { key: 'forest', name: 'Forest', css: '#0f2a22', tone: 'dark' },
  { key: 'charcoal', name: 'Charcoal', css: '#1a1d23', tone: 'dark' },
]

export const GRADIENTS = [
  { key: 'dawn', name: 'Dawn', css: 'linear-gradient(135deg, #fde2e4 0%, #e8e9f3 50%, #d9e8fb 100%)', tone: 'light' },
  { key: 'peach', name: 'Peach', css: 'linear-gradient(160deg, #ffd9c2 0%, #ffc2d6 100%)', tone: 'light' },
  { key: 'meadow', name: 'Meadow', css: 'linear-gradient(160deg, #e3f5d6 0%, #c9ecd3 55%, #b6e0e0 100%)', tone: 'light' },
  { key: 'ocean', name: 'Ocean', css: 'linear-gradient(160deg, #d7ecfb 0%, #bfe0f6 55%, #e3f4ff 100%)', tone: 'light' },
  { key: 'orchid', name: 'Orchid', css: 'linear-gradient(160deg, #f1dcff 0%, #ffd6ea 100%)', tone: 'light' },
  { key: 'twilight', name: 'Twilight', css: 'linear-gradient(160deg, #1c1a4a 0%, #3a1f5e 55%, #6a2d5b 100%)', tone: 'dark' },
  { key: 'deepsea', name: 'Deep sea', css: 'linear-gradient(160deg, #081f3a 0%, #0b3a4e 55%, #126566 100%)', tone: 'dark' },
  { key: 'ember', name: 'Ember', css: 'linear-gradient(160deg, #2a0f1e 0%, #5a1a2b 55%, #a33a3c 100%)', tone: 'dark' },
]

export const PATTERNS = [
  { key: 'none', name: 'None' },
  { key: 'dots', name: 'Dots' },
  { key: 'grid', name: 'Grid' },
  { key: 'lines', name: 'Lines' },
  { key: 'checks', name: 'Checks' },
  { key: 'waves', name: 'Waves' },
  { key: 'confetti', name: 'Confetti' },
]

export const EFFECTS = [
  { key: 'none', name: 'None' },
  { key: 'grain', name: 'Grain' },
  { key: 'glow', name: 'Glow' },
  { key: 'aurora', name: 'Aurora' },
  { key: 'vignette', name: 'Vignette' },
]

export const DEFAULT_BACKGROUND = { kind: 'default', value: '', pattern: 'none', effect: 'none', frame: 'none', social: '' }

/** 'light', 'dark', or 'neutral' (the plain default page, which follows the visitor's system theme). */
export function toneOf(bg) {
  if (!bg || bg.kind === 'default') return 'neutral'
  const list = bg.kind === 'color' ? COLORS : GRADIENTS
  return list.find((p) => p.key === bg.value)?.tone ?? 'light'
}

/** CSS `background` for the base layer. */
export function baseCss(bg) {
  if (!bg || bg.kind === 'default') return 'var(--mist)'
  const list = bg.kind === 'color' ? COLORS : GRADIENTS
  return list.find((p) => p.key === bg.value)?.css ?? 'var(--mist)'
}

const LINE = { light: 'rgba(18,22,28,0.10)', dark: 'rgba(255,255,255,0.13)', neutral: 'rgba(128,128,128,0.18)' }
const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

/** Inline style for the pattern layer, drawn in a line color that suits the background tone. */
export function patternStyle(key, tone) {
  const c = LINE[tone] ?? LINE.neutral
  switch (key) {
    case 'dots':
      return { backgroundImage: `radial-gradient(${c} 1.5px, transparent 1.8px)`, backgroundSize: '22px 22px' }
    case 'grid':
      return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: '30px 30px' }
    case 'lines':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0 1px, transparent 1px 14px)` }
    case 'checks':
      return { backgroundImage: `conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0)`, backgroundSize: '36px 36px' }
    case 'waves':
      return {
        backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="24"><path d="M0 12 Q16 0 32 12 T64 12" fill="none" stroke="${c}" stroke-width="1.4"/></svg>`),
        backgroundSize: '64px 24px',
      }
    case 'confetti':
      return {
        backgroundImage: svgUrl(
          `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" fill="${c}">` +
            '<circle cx="22" cy="30" r="3.2"/><rect x="82" y="16" width="10" height="3.4" rx="1.7" transform="rotate(30 87 18)"/>' +
            '<circle cx="128" cy="62" r="2.6"/><rect x="38" y="92" width="10" height="3.4" rx="1.7" transform="rotate(-40 43 94)"/>' +
            '<circle cx="104" cy="122" r="3.2"/><rect x="8" y="128" width="9" height="3.4" rx="1.7" transform="rotate(60 12 130)"/>' +
            '<circle cx="64" cy="58" r="2"/></svg>',
        ),
        backgroundSize: '150px 150px',
      }
    default:
      return {}
  }
}

/** Follow button color: --social and the text color on it. Nothing set means the page accent. */
function socialVars(hex) {
  if (!hex) return {}
  return { '--social': hex, '--on-social': hex.toLowerCase() === '#ffffff' ? '#12161c' : '#ffffff' }
}

/** CSS variables for a themed page: accent color, and text/card colors that match a light or dark background. */
export function themeVars(profile) {
  return { ...baseThemeVars(profile), ...socialVars(profile.background?.social) }
}

function baseThemeVars(profile) {
  const accent = profile.accent
  const base = accentStyle(accent)
  const tone = toneOf(profile.background)
  if (tone === 'light') {
    return {
      ...base,
      '--ink': '#12161c', '--ink-soft': '#4a5565', '--paper': 'rgba(255,255,255,0.74)', '--line': 'rgba(18,22,28,0.14)',
      '--mist': 'transparent', '--tint': `color-mix(in srgb, ${accent} 14%, rgba(255,255,255,0.74))`,
      colorScheme: 'light',
    }
  }
  if (tone === 'dark') {
    return {
      ...base,
      '--ink': '#f2f4f7', '--ink-soft': '#b9c2cf', '--paper': 'rgba(18,22,30,0.55)', '--line': 'rgba(255,255,255,0.18)',
      '--mist': 'transparent', '--accent-strong': `color-mix(in srgb, ${accent} 45%, #ffffff)`,
      '--tint': `color-mix(in srgb, ${accent} 32%, rgba(18,22,30,0.55))`,
      colorScheme: 'dark',
    }
  }
  return base
}
