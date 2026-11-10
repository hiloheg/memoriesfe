import { baseCss, patternStyle, toneOf } from '../backgrounds.js'

/**
 * The background of a photographer page: a base (color or gradient), an optional pattern and an optional effect.
 * Fixed behind the whole page by default; `contained` keeps it inside a preview box.
 */
export default function Backdrop({ bg, contained = false }) {
  const tone = toneOf(bg)
  return (
    <div className={contained ? 'bg-layers contained' : 'bg-layers'} data-tone={tone} aria-hidden="true">
      <div className="bg-base" style={{ background: baseCss(bg) }} />
      {bg.pattern !== 'none' && <div className="bg-pattern" style={patternStyle(bg.pattern, tone)} />}
      {bg.effect !== 'none' && <div className={`bg-effect effect-${bg.effect}`} />}
    </div>
  )
}
