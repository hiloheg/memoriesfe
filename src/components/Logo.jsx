const SPARKLE = 'M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z'

function Sparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={SPARKLE} fill="currentColor" />
    </svg>
  )
}

/** Text logo: "imemories" (short for Instant Memories), with a sparkle as the dot of the i. */
export default function Logo({ label = true }) {
  return (
    <span className="logo" role={label ? 'img' : undefined} aria-label={label ? 'imemories, Instant Memories' : undefined}>
      <span className="logo-i" aria-hidden="true">
        ı<Sparkle className="logo-spark logo-spark-main" />
      </span>
      <span aria-hidden="true">memories</span>
      <Sparkle className="logo-spark logo-spark-small" />
    </span>
  )
}
