import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

function initials(user) {
  const source = user.name && user.name !== 'null' ? user.name : user.email
  return source.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

/** Avatar for the signed-in user; photo from Google when there is one, initials otherwise. */
export function Avatar({ user, size = 36 }) {
  const [broken, setBroken] = useState(false)
  const hasPhoto = user.picture && user.picture !== 'null' && !broken
  return hasPhoto ? (
    <img className="avatar" style={{ width: size, height: size }} src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  ) : (
    <span className="avatar avatar-initials" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">{initials(user)}</span>
  )
}

/** Account menu in the top bar: who is signed in, and the sign-out action. */
export default function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((o) => !o)}>
        <Avatar user={user} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <Link role="menuitem" to="/profile" className="menu-id menu-id-link" onClick={() => setOpen(false)} title="Edit your page">
            <Avatar user={user} size={44} />
            <div>
              <strong>{user.name !== 'null' ? user.name : 'Signed in'}</strong>
              <span>{user.email}</span>
            </div>
          </Link>
          <Link role="menuitem" to="/profile" className="btn menu-item" onClick={() => setOpen(false)}>Edit your page</Link>
          <button role="menuitem" className="menu-item" onClick={logout}>Sign out</button>
        </div>
      )}
    </div>
  )
}
