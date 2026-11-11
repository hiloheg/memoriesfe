import { useCredits } from './CreditsContext.jsx'

/** Shown on a screen whose features need a purchase: says what is locked and offers the buy dialog. Renders nothing once unlocked. */
export default function LockedNotice({ locked, children }) {
  const { openBuy } = useCredits()
  if (!locked) return null
  return (
    <div className="locked-notice" role="status">
      <p>{children} Buy any pack to unlock it.</p>
      <button type="button" className="primary" onClick={openBuy}>Buy credits</button>
    </div>
  )
}
