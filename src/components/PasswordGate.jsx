import { useState } from 'react'

function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Asks a guest for the password of a protected event. `message` explains a wrong or missing password. */
export default function PasswordGate({ eventName, message, onSubmit }) {
  const [value, setValue] = useState('')
  function submit(e) {
    e.preventDefault()
    onSubmit(value)
  }
  return (
    <form className="password-gate" onSubmit={submit}>
      <Lock />
      <h2>{eventName ? `${eventName} is protected` : 'This event is protected'}</h2>
      <p className="muted">Enter the password the photographer gave you to see the photos.</p>
      <label className="field">
        <span className="sr-only">Password</span>
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Password" autoComplete="off" required autoFocus />
      </label>
      {message && <p role="alert" className="error">{message}</p>}
      <button type="submit" className="primary">See the photos</button>
    </form>
  )
}
