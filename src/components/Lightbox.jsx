import { useCallback, useEffect, useState } from 'react'
import { FadeImage, SparkleLoader } from './Loaders.jsx'

/** Full-size photo with the sparkle loader until it has arrived. */
function LightboxImage({ url }) {
  const [ready, setReady] = useState(false)
  return (
    <>
      {!ready && <span className="lb-loader"><SparkleLoader size={40} /></span>}
      <FadeImage src={url} onLoaded={() => setReady(true)} onClick={(e) => e.stopPropagation()} />
    </>
  )
}

/** Photo viewer: arrows, keyboard and swipe. `index` is null when closed. */
export default function Lightbox({ photos, index, onIndex, onClose, onNearEnd }) {
  const [touchX, setTouchX] = useState(null)
  const count = photos.length

  const step = useCallback((d) => {
    if (index === null || count === 0) return
    onIndex((index + d + count) % count)
  }, [index, count, onIndex])

  useEffect(() => {
    if (index === null) return
    if (onNearEnd && index >= count - 3) onNearEnd()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, step, onClose, onNearEnd])

  const current = index === null ? null : photos[index]
  if (!current) return null

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1) } setTouchX(null) }}>
      <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
        <span>{index + 1} of {count}</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <a className="btn" href={current.url} download={current.name} target="_blank" rel="noreferrer">Download</a>
          <button onClick={onClose}>Close</button>
        </span>
      </div>
      <LightboxImage key={current.url} url={current.url} />
      {count > 1 && (
        <>
          <button className="lb-nav lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1) }}>‹</button>
          <button className="lb-nav lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1) }}>›</button>
        </>
      )}
    </div>
  )
}
