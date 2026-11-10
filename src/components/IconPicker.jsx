import { EVENT_ICONS } from '../eventIconList.js'
import { EventIcon } from '../eventIcons.jsx'

/** Grid of icons to choose from; works with keyboard (arrow keys) because it is a radio group. */
export default function IconPicker({ value, onChange, name = 'event-icon' }) {
  return (
    <fieldset className="icon-grid">
      <legend className="field-label">Icon</legend>
      {EVENT_ICONS.map((icon) => (
        <label key={icon.key} className="icon-opt">
          <input type="radio" name={name} value={icon.key} checked={value === icon.key} onChange={() => onChange(icon.key)} />
          <span>
            <EventIcon name={icon.key} />
            {icon.label}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
