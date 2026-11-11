import { useState } from 'react'
import { logoRect } from '../editor/editorMath.js'

const SAMPLE = { w: 176, h: 132 } // a 4:3 photo, the most common camera shape

/** Tells the photographer how their logo size will behave, with the real placement drawn on a sample photo. */
function verdict({ w, h }) {
  if (w < 400) return { good: false, text: `${w} × ${h} px is small. It can look soft on large photos. About 800 px wide is ideal.` }
  if (w / h < 2.5) return { good: false, text: `${w} × ${h} px is quite tall. On wide photos it is scaled down to stay under 12% of the photo's height. A wider version (about 3:1) shows larger.` }
  return { good: true, text: `${w} × ${h} px is a good fit.` }
}

/** Mount with key={url} so a new logo is measured again. */
export default function LogoFit({ url }) {
  const [size, setSize] = useState(null)
  const place = size ? logoRect(SAMPLE.w, SAMPLE.h, size.w, size.h) : null
  const v = size ? verdict(size) : null
  return (
    <div className="logo-fit">
      <span className="logo-sample" role="img" aria-label="Your logo on a sample photo">
        <img src={url} alt="" draggable="false"
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={place ? { left: place.x, top: place.y, width: place.w, height: place.h } : { display: 'none' }} />
      </span>
      {v && <p className={`logo-verdict${v.good ? '' : ' warn'}`} role="status"><strong>{v.good ? 'Looks right.' : 'Could be better.'}</strong> {v.text}</p>}
    </div>
  )
}
