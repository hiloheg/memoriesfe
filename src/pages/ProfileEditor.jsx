import { FRAMES, frameClass } from '../frames.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACCENTS, SOCIAL_COLORS, readError, squareJpeg } from '../accents.js'
import { lockedMessage } from '../credits.js'
import LockedNotice from '../components/LockedNotice.jsx'
import { useAuth } from '../auth.jsx'
import Backdrop from '../components/Backdrop.jsx'
import { Spinner } from '../components/Loaders.jsx'
import YourData from '../components/YourData.jsx'
import Modal from '../components/Modal.jsx'
import LogoFit from '../components/LogoFit.jsx'
import ProfileHero from '../components/ProfileHero.jsx'
import { Avatar } from '../components/UserMenu.jsx'
import { COLORS, DEFAULT_BACKGROUND, EFFECTS, GRADIENTS, PATTERNS, themeVars } from '../backgrounds.js'
import { labelFromUrl } from '../social.js'

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'links', label: 'Links' },
  { key: 'look', label: 'Look' },
  { key: 'logo', label: 'Logo' },
  { key: 'account', label: 'Account' },
]

/** Editable copy of the saved profile. */
function draftFrom(user) {
  return {
    name: user.name, slug: user.slug, tagline: user.tagline, bio: user.bio, accent: user.accent,
    website: user.website, instagram: user.instagram, followGate: user.followGate,
    links: (user.links || []).map((l) => ({ key: l.id, label: l.label, url: l.url })),
    bg: { ...DEFAULT_BACKGROUND, ...(user.background || {}) },
  }
}

/** What the backend expects; also used to tell whether anything changed. */
function requestFrom(d) {
  return {
    name: d.name, slug: d.slug, tagline: d.tagline, bio: d.bio, accent: d.accent,
    website: d.website, instagram: d.instagram, followGate: d.followGate,
    links: d.links.filter((l) => l.label.trim() || l.url.trim()).map((l) => ({ label: l.label, url: l.url })),
    bgKind: d.bg.kind, bgValue: d.bg.value, bgPattern: d.bg.pattern, bgEffect: d.bg.effect, bgFrame: d.bg.frame, bgSocial: d.bg.social,
  }
}

/** A tiny profile (picture, tag, photo) drawn in the frame, inside a radio option. */
function FrameOption({ frame, checked, onChange }) {
  return (
    <label className="look-opt">
      <input type="radio" name="frame" checked={checked} onChange={onChange} />
      <span>
        <span className={`look-preview fr-sample ${frameClass(frame.key)}`}>
          <span className="profile-avatar"><span className="avatar-dot" /></span>
          <span className="tag-filter"><span className="tab" aria-pressed="true" /><span className="tab" /></span>
          <span className="photo"><span className="sample-img" /></span>
        </span>
        {frame.name}
      </span>
    </label>
  )
}

/** Color of the follow buttons on the page: the page accent, black, white or one of the accent colors. */
function SocialColorControls({ draft, setBg }) {
  const value = draft.bg.social || ''
  return (
    <fieldset className="field">
      <legend className="field-label">Social button color</legend>
      <div className="swatches" role="radiogroup" aria-label="Social button color">
        <label className="swatch-match" title="Use the accent color of your page">
          <input type="radio" name="social" checked={value === ''} onChange={() => setBg({ social: '' })} />
          <span className="dot" />
          Match accent
        </label>
        {SOCIAL_COLORS.map((c) => (
          <label key={c.value} className={c.value === '#ffffff' ? 'swatch light' : 'swatch'} title={c.name}>
            <input type="radio" name="social" value={c.value} checked={value === c.value} onChange={() => setBg({ social: c.value })} />
            <span style={{ background: c.value }} />
            <span className="sr-only">{c.name}</span>
          </label>
        ))}
      </div>
      <small className="muted">The color of your follow buttons, so they stand out on your page.</small>
    </fieldset>
  )
}

function FrameControls({ draft, setBg }) {
  return (
    <fieldset className="field">
      <legend className="field-label">Frame</legend>
      <div className="look-grid" role="radiogroup" aria-label="Frame">
        {FRAMES.map((f) => <FrameOption key={f.key} frame={f} checked={draft.bg.frame === f.key} onChange={() => setBg({ frame: f.key })} />)}
      </div>
      <small className="muted">Frames your picture, header, tags and photos in one style.</small>
    </fieldset>
  )
}

/** A small preview of the choice (a background, pattern or effect) inside a radio option. */
function LookOption({ name, label, checked, onChange, bg, accent }) {
  return (
    <label className="look-opt">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>
        <span className="look-preview" style={themeVars({ accent, background: bg })}>
          <Backdrop bg={bg} contained />
        </span>
        {label}
      </span>
    </label>
  )
}

function BackgroundControls({ draft, setBg }) {
  const { bg, accent } = draft
  const list = bg.kind === 'color' ? COLORS : GRADIENTS
  const choose = (kind) => setBg(kind === 'default' ? { kind, value: '' } : { kind, value: (kind === 'color' ? COLORS : GRADIENTS)[0].key })
  return (
    <>
      <fieldset className="field">
        <legend className="field-label">Background</legend>
        <div className="segmented" role="radiogroup" aria-label="Background type">
          {[['default', 'Default'], ['color', 'Color'], ['gradient', 'Gradient']].map(([kind, label]) => (
            <label key={kind}>
              <input type="radio" name="bg-kind" checked={bg.kind === kind} onChange={() => choose(kind)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {bg.kind !== 'default' && (
          <div className="look-grid" role="radiogroup" aria-label={bg.kind === 'color' ? 'Background color' : 'Gradient'}>
            {list.map((p) => (
              <LookOption key={p.key} name="bg-value" label={p.name} checked={bg.value === p.key}
                onChange={() => setBg({ value: p.key })} bg={{ kind: bg.kind, value: p.key, pattern: 'none', effect: 'none' }} accent={accent} />
            ))}
          </div>
        )}
        {bg.kind === 'default' && <small className="muted">The clean page that follows each visitor's light or dark setting.</small>}
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">Pattern</legend>
        <div className="look-grid" role="radiogroup" aria-label="Pattern">
          {PATTERNS.map((p) => (
            <LookOption key={p.key} name="bg-pattern" label={p.name} checked={bg.pattern === p.key}
              onChange={() => setBg({ pattern: p.key })} bg={{ ...bg, pattern: p.key, effect: 'none' }} accent={accent} />
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">Effect</legend>
        <div className="look-grid" role="radiogroup" aria-label="Effect">
          {EFFECTS.map((p) => (
            <LookOption key={p.key} name="bg-effect" label={p.name} checked={bg.effect === p.key}
              onChange={() => setBg({ effect: p.key })} bg={{ ...bg, pattern: 'none', effect: p.key }} accent={accent} />
          ))}
        </div>
        {bg.effect === 'aurora' && <small className="muted">Aurora moves slowly. It stays still for visitors who prefer reduced motion.</small>}
      </fieldset>
    </>
  )
}

/** What visitors will see, with the chosen background, color and links. */
function PreviewCard({ draft, picture }) {
  const profile = { ...draft, picture, background: draft.bg }
  const buttons = draft.links.filter((l) => l.url && l.label)
  return (
    <div className={`look-frame ${frameClass(draft.bg.frame)}`} style={themeVars(profile)}>
      <Backdrop bg={draft.bg} contained />
      <div className="look-content">
        <ProfileHero profile={profile} />
        {buttons.length > 0 && (
          <div className="preview-follow social-card">
            <p className="preview-follow-title">{draft.followGate ? `Follow ${(draft.name || 'you').split(' ')[0]} to see the photos` : 'Follow buttons'}</p>
            <div className="profile-links">
              {buttons.map((l) => <span key={l.key} className="chip">{l.label}</span>)}
            </div>
          </div>
        )}
        <div className="mini-tags tag-filter"><span className="tab" aria-pressed="true">All</span><span className="tab">Ceremony</span><span className="tab">Party</span></div>
        <div className="photo-stream mini-stream">
          <span className="photo"><span className="sample-img" /></span>
          <span className="photo"><span className="sample-img" /></span>
          <span className="photo"><span className="sample-img" /></span>
        </div>
        <div className="mini-tiles">
          <div className="mini-tile">Your first event</div>
          <div className="mini-tile">Another event</div>
        </div>
      </div>
    </div>
  )
}

/** Edit the public page and account: five tabs, a live preview and one save bar. */
export default function ProfileEditor() {
  const { user, setUser, apiFetch, logout } = useAuth()
  const locked = user.unlocked === false // the look and the logo come with the first purchase
  const fileInput = useRef(null)
  const [tab, setTab] = useState('profile')
  const [slugLocked, setSlugLocked] = useState(true)
  const slugInput = useRef(null)
  const [saved, setSaved] = useState(() => draftFrom(user))
  const [draft, setDraft] = useState(saved)
  useEffect(() => { setSlugLocked(true) }, [saved.slug]) // locks again once a new address is saved
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoInput = useRef(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const dirty = JSON.stringify(requestFrom(draft)) !== JSON.stringify(requestFrom(saved))
  const host = new URL(user.shareUrl).host

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))
  const setBg = (patch) => setDraft((d) => ({ ...d, bg: { ...d.bg, ...patch } }))
  const addLink = () => setDraft((d) => ({ ...d, links: [...d.links, { key: crypto.randomUUID(), label: '', url: '' }] }))
  const removeLink = (key) => setDraft((d) => ({ ...d, links: d.links.filter((l) => l.key !== key) }))
  const changeLabel = (key, label) => setDraft((d) => ({ ...d, links: d.links.map((l) => (l.key === key ? { ...l, label } : l)) }))
  // Typing a link fills in the button name, until the photographer writes their own.
  const changeUrl = (key, url) =>
    setDraft((d) => ({
      ...d,
      links: d.links.map((l) => {
        if (l.key !== key) return l
        const wasAuto = !l.label || l.label === labelFromUrl(l.url)
        return { ...l, url, label: wasAuto ? labelFromUrl(url) : l.label }
      }),
    }))

  async function save(e) {
    e?.preventDefault()
    setBusy(true)
    setStatus(null)
    const r = await apiFetch('/api/v1/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestFrom(draft)),
    })
    setBusy(false)
    if (!r.ok) {
      const message = await readError(r, `Could not save (${r.status})`)
      return setStatus({ kind: 'error', text: lockedMessage(message) ?? message })
    }
    const next = await r.json()
    setUser((u) => ({ ...u, ...next }))
    const fresh = draftFrom({ ...user, ...next })
    setSaved(fresh)
    setDraft(fresh)
    setStatus({ kind: 'ok', text: 'Saved. Your page is live.' })
  }

  function discard() {
    setDraft(saved)
    setStatus(null)
  }

  async function upload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setStatus(null)
    try {
      const blob = await squareJpeg(file)
      const body = new FormData()
      body.append('file', blob, 'photo.jpg')
      const r = await apiFetch('/api/v1/profile/avatar', { method: 'POST', body })
      if (!r.ok) throw new Error(await readError(r, `Could not upload the photo (${r.status})`))
      const next = await r.json()
      setUser((u) => ({ ...u, picture: next.picture, customPicture: next.customPicture }))
      setStatus({ kind: 'ok', text: 'Photo updated.' })
    } catch (err) {
      setStatus({ kind: 'error', text: err.message || 'Could not use that image. Try a JPEG or PNG.' })
    }
    setPhotoBusy(false)
  }

  async function useGooglePhoto() {
    setPhotoBusy(true)
    const r = await apiFetch('/api/v1/profile/avatar', { method: 'DELETE' })
    setPhotoBusy(false)
    if (!r.ok) return setStatus({ kind: 'error', text: await readError(r, `Could not change the photo (${r.status})`) })
    const next = await r.json()
    setUser((u) => ({ ...u, picture: next.picture, customPicture: next.customPicture }))
    setStatus({ kind: 'ok', text: 'Using your Google photo.' })
  }

  async function uploadLogo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLogoBusy(true)
    setStatus(null)
    try {
      const body = new FormData()
      body.append('file', file, file.name)
      const r = await apiFetch('/api/v1/profile/logo', { method: 'POST', body })
      if (!r.ok) throw new Error(await readError(r, `Could not upload the logo (${r.status})`))
      const next = await r.json()
      setUser((u) => ({ ...u, logo: next.logo }))
      setStatus({ kind: 'ok', text: 'Logo updated.' })
    } catch (err) {
      setStatus({ kind: 'error', text: lockedMessage(err.message) ?? (err.message || 'Could not use that image. Try a PNG.') })
    }
    setLogoBusy(false)
  }

  async function removeLogo() {
    setLogoBusy(true)
    const r = await apiFetch('/api/v1/profile/logo', { method: 'DELETE' })
    setLogoBusy(false)
    if (!r.ok) return setStatus({ kind: 'error', text: await readError(r, `Could not remove the logo (${r.status})`) })
    const next = await r.json()
    setUser((u) => ({ ...u, logo: next.logo }))
    setStatus({ kind: 'ok', text: 'Logo removed.' })
  }

  function onTabKey(e) {
    const i = TABS.findIndex((t) => t.key === tab)
    if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].key)
    if (e.key === 'ArrowLeft') setTab(TABS[(i - 1 + TABS.length) % TABS.length].key)
  }

  return (
    <section>
      <div className="page-head">
        <h1>My page</h1>
        <p className="muted">This is what guests see when they scan your QR code. <a href={user.shareUrl} target="_blank" rel="noreferrer">View your page</a></p>
      </div>

      <div className="editor">
        <form className="editor-form" onSubmit={save}>
          <div className="tabs-bar" role="tablist" aria-label="Settings" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`panel-${t.key}`}
                tabIndex={tab === t.key ? 0 : -1} className="tab-btn" onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>

          <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" hidden={tab !== 'profile'} className="panel-stack">
            <div className="field">
              <span className="field-label">Photo</span>
              <div className="photo-row">
                <Avatar user={{ name: draft.name, email: user.email, picture: user.picture }} size={84} />
                <div className="photo-actions">
                  <button type="button" onClick={() => fileInput.current?.click()} disabled={photoBusy}>{photoBusy && <Spinner />}{photoBusy ? 'Uploading…' : 'Upload photo'}</button>
                  {user.customPicture && <button type="button" className="quiet" onClick={useGooglePhoto} disabled={photoBusy}>Use Google photo</button>}
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
                </div>
              </div>
              <small className="muted">JPEG, PNG or WebP. It is cropped to a square and saved right away.</small>
            </div>

            <label className="field">
              <span className="field-label">Name</span>
              <input value={draft.name} onChange={set('name')} maxLength={60} required />
            </label>

            <label className="field">
              <span className="field-label">Page address</span>
              <span className="address">
                <span className="address-prefix">{host}/</span>
                <input ref={slugInput} value={draft.slug} readOnly={slugLocked} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} maxLength={30} required aria-describedby="slug-hint" />
                <button type="button" className={slugLocked ? 'address-lock' : 'address-lock open'} aria-pressed={!slugLocked}
                  title={slugLocked ? 'Locked. Press to edit the address' : 'Unlocked. Press to lock it again'}
                  aria-label={slugLocked ? 'Unlock page address' : 'Lock page address'}
                  onClick={() => { setSlugLocked((v) => !v); if (slugLocked) setTimeout(() => slugInput.current?.focus(), 0) }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                    <rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor" />
                    <path d={slugLocked ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 7.5-2'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
              <small id="slug-hint" className="muted">{slugLocked ? 'Locked so you do not change it by mistake. ' : ''}3 to 30 letters, numbers or hyphens. Changing it breaks QR codes you already printed.</small>
            </label>

            <label className="field">
              <span className="field-label">Tagline</span>
              <input value={draft.tagline} onChange={set('tagline')} maxLength={80} placeholder="Wedding and event photographer in Cluj" />
            </label>

            <label className="field">
              <span className="field-label">About you</span>
              <textarea value={draft.bio} onChange={set('bio')} maxLength={400} rows={4} placeholder="A few lines guests will read before they see the photos." />
              <small className="muted">{draft.bio.length} of 400</small>
            </label>
          </div>

          <div role="tabpanel" id="panel-links" aria-labelledby="tab-links" hidden={tab !== 'links'} className="panel-stack">
            <label className="field">
              <span className="field-label">Website</span>
              <input type="url" value={draft.website} onChange={set('website')} maxLength={200} placeholder="https://your-site.com" />
            </label>

            <fieldset className="field">
              <legend className="field-label">Follow buttons</legend>
              <p className="muted">Add the pages you want visitors to follow, up to 5. Each one shows as a button on your page.</p>
              {draft.links.length > 0 && (
                <ul className="link-rows">
                  {draft.links.map((l, i) => (
                    <li key={l.key}>
                      <input aria-label={`Button ${i + 1} name`} value={l.label} onChange={(e) => changeLabel(l.key, e.target.value)} maxLength={30} placeholder="Instagram" />
                      <input aria-label={`Button ${i + 1} link`} type="url" value={l.url} onChange={(e) => changeUrl(l.key, e.target.value)} maxLength={300} placeholder="https://instagram.com/yourname" />
                      <button type="button" className="danger" onClick={() => removeLink(l.key)} aria-label={`Remove button ${i + 1}`}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              {draft.links.length < 5 && <div><button type="button" onClick={addLink}>{draft.links.length === 0 ? 'Add a follow button' : 'Add another button'}</button></div>}
              {draft.links.length > 0 && (
                <label className="check">
                  <input type="checkbox" checked={draft.followGate} onChange={(e) => setDraft((d) => ({ ...d, followGate: e.target.checked }))} />
                  <span>Hide my events until visitors have opened every button</span>
                </label>
              )}
            </fieldset>
          </div>

          <div role="tabpanel" id="panel-look" aria-labelledby="tab-look" hidden={tab !== 'look'} className="panel-stack">
            <LockedNotice locked={locked}>Your page shows the default look. Choosing your own look, adding your logo and letting guests edit photos before they download come with your first pack.</LockedNotice>
            <fieldset className="locked-fields" disabled={locked}>
            <fieldset className="field">
              <legend className="field-label">Accent color</legend>
              <div className="swatches" role="radiogroup" aria-label="Accent color">
                {ACCENTS.map((a) => (
                  <label key={a.value} className="swatch" title={a.name}>
                    <input type="radio" name="accent" value={a.value} checked={draft.accent === a.value} onChange={set('accent')} />
                    <span style={{ background: a.value }} />
                    <span className="sr-only">{a.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <BackgroundControls draft={draft} setBg={setBg} />
            <FrameControls draft={draft} setBg={setBg} />
            <SocialColorControls draft={draft} setBg={setBg} />
            </fieldset>
          </div>

          <div role="tabpanel" id="panel-logo" aria-labelledby="tab-logo" hidden={tab !== 'logo'} className="panel-stack">
            <LockedNotice locked={locked}>Your logo is not added to downloaded photos yet.</LockedNotice>
            <div className="field">
              <span className="field-label">Your logo</span>
              <div className="photo-row">
                <span className="logo-preview">{user.logo && <img src={user.logo} alt="Your logo" />}</span>
                <div className="photo-actions">
                  <button type="button" onClick={() => logoInput.current?.click()} disabled={logoBusy || locked}>{logoBusy && <Spinner />}{logoBusy ? 'Uploading…' : user.logo ? 'Replace logo' : 'Upload logo'}</button>
                  {user.logo && <button type="button" className="quiet" onClick={removeLogo} disabled={logoBusy}>Remove logo</button>}
                  <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadLogo} />
                </div>
              </div>
              <small className="muted">Saved right away. It is not part of the Save bar below.</small>
              {user.logo && <LogoFit key={user.logo} url={user.logo} />}
              <ul className="logo-tips muted">
                <li>Best: a transparent PNG about <strong>800 × 240 px</strong>, wide (roughly 3:1).</li>
                <li>At least 400 px wide. At most 2000 px per side and 2 MB.</li>
                <li>It sits in the bottom-right corner of each camera photo people download, at 18% of the photo's width. Keep it simple and readable when small: no thin lines or tiny text.</li>
              </ul>
            </div>
          </div>

          <div role="tabpanel" id="panel-account" aria-labelledby="tab-account" hidden={tab !== 'account'} className="panel-stack">
            <div className="field">
              <span className="field-label">Signed in with Google</span>
              <p>{user.email}</p>
              <small className="muted">You sign in with your Google account, so there is no password to manage here.</small>
            </div>
            <div className="field">
              <span className="field-label">Your page link</span>
              <p className="address-url-line">{user.shareUrl.replace(/^https?:\/\//, '')}</p>
              <div className="photo-actions">
                <button type="button" onClick={() => { navigator.clipboard?.writeText(user.shareUrl); setCopied(true) }}>{copied ? 'Link copied' : 'Copy link'}</button>
                <Link className="btn" to="/share">Open QR code</Link>
              </div>
            </div>
            <div className="field">
              <span className="field-label">Sign out</span>
              <div><button type="button" onClick={logout}>Sign out of imemories</button></div>
            </div>
            <YourData />
          </div>

          <div className="savebar">
            <span className={dirty ? 'savebar-state dirty' : 'savebar-state'} role="status">
              {status ? <span className={status.kind === 'error' ? 'error' : ''}>{status.text}</span> : dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
            <div className="savebar-actions">
              <button type="button" className="only-narrow" onClick={() => setPreviewOpen(true)}>Preview</button>
              {dirty && <button type="button" className="quiet" onClick={discard}>Discard</button>}
              <button type="submit" className="primary" disabled={busy || !dirty}>{busy && <Spinner />}{busy ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </form>

        <aside className="editor-preview" aria-label="Preview of your page">
          <PreviewCard draft={draft} picture={user.picture} />
          <p className="preview-note">Preview. Save to publish your changes.</p>
        </aside>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview">
        <PreviewCard draft={draft} picture={user.picture} />
        <div className="modal-actions"><button type="button" className="primary" onClick={() => setPreviewOpen(false)}>Back to settings</button></div>
      </Modal>
    </section>
  )
}
