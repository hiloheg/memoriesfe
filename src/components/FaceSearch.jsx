import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchFace } from '../faceSearch.js'
import Modal from './Modal.jsx'
import { Spinner } from './Loaders.jsx'

const API_URL = import.meta.env.VITE_API_URL
const MAX_SIDE = 1000

/** Scales a camera frame or a chosen picture down to a JPEG that is quick to send. */
function toJpeg(source, width, height) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read the picture. Try again.'))), 'image/jpeg', 0.85))
}

/**
 * "Find my photos": the guest agrees to a face scan, looks into the camera (or picks a picture), and gets the photos they appear in.
 * The picture is sent once and not kept. `searchOptions` is { slug, eventSlug, password }; `onFound(result)` gets the server's answer.
 */
export default function FaceSearch({ open, onClose, onFound, searchOptions }) {
  return (
    <Modal open={open} onClose={onClose} title="Find my photos">
      {open && <Scanner onClose={onClose} onFound={onFound} searchOptions={searchOptions} />}
    </Modal>
  )
}

function Scanner({ onClose, onFound, searchOptions }) {
  const [agreed, setAgreed] = useState(false)
  const [phase, setPhase] = useState('consent') // consent -> camera -> scanning
  const [error, setError] = useState(null)
  const [still, setStill] = useState(null) // object URL of the picture being scanned
  const video = useRef(null)
  const stream = useRef(null)

  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => () => { stopCamera() }, [])
  useEffect(() => () => { if (still) URL.revokeObjectURL(still) }, [still])

  async function startCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot open the camera. Choose a picture of yourself instead.')
      setPhase('camera')
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      setPhase('camera')
    } catch {
      setError('The camera is blocked. Allow it in your browser, or choose a picture of yourself instead.')
      setPhase('camera')
    }
  }

  // The video element appears only in the camera phase, so connect the stream once it exists.
  useEffect(() => {
    if (phase === 'camera' && video.current && stream.current) {
      video.current.srcObject = stream.current
      video.current.play().catch(() => {})
    }
  }, [phase])

  async function send(blob) {
    setError(null)
    setStill(URL.createObjectURL(blob))
    setPhase('scanning')
    stopCamera()
    try {
      const result = await searchFace({ apiUrl: API_URL, ...searchOptions, selfie: blob })
      onFound(result)
      onClose()
    } catch (e) {
      setError(e.message)
      setStill(null)
      await startCamera()
    }
  }

  async function takePicture() {
    const v = video.current
    if (!v || !v.videoWidth) return
    try {
      send(await toJpeg(v, v.videoWidth, v.videoHeight))
    } catch (e) {
      setError(e.message)
    }
  }

  async function chosen(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const bitmap = await createImageBitmap(file)
      const blob = await toJpeg(bitmap, bitmap.width, bitmap.height)
      bitmap.close?.()
      send(blob)
    } catch {
      setError('We could not read that picture. Choose another one.')
    }
  }

  if (phase === 'consent') {
    return (
      <>
        <p>Take a quick picture of your face and we will show only the photos you are in.</p>
        <ul className="face-points">
          <li>Your picture is not saved. It is used once, then deleted.</li>
          <li>It is only compared with the photos of this event.</li>
          <li>Please take it with only you in the picture.</li>
        </ul>
        <label className="check">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I agree to a scan of my face to find my photos. <Link to="/privacy#faces" target="_blank">How this works</Link></span>
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" disabled={!agreed} onClick={startCamera}>Continue</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={phase === 'scanning' ? 'face-frame scanning' : 'face-frame'}>
        {phase === 'scanning' && still
          ? <img src={still} alt="" />
          : <video ref={video} muted playsInline aria-label="Your camera" />}
        <span className="face-line" aria-hidden="true" />
      </div>
      {phase === 'scanning'
        ? <p role="status" className="face-status"><Spinner /> Looking for you…</p>
        : <p className="muted face-status">Put your face inside the oval, in good light.</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="modal-actions face-actions">
        <label className={phase === 'scanning' ? 'btn disabled' : 'btn'} aria-disabled={phase === 'scanning'}>
          Choose a picture
          <input type="file" accept="image/*" hidden disabled={phase === 'scanning'} onChange={chosen} />
        </label>
        <button type="button" className="primary" disabled={phase === 'scanning' || !stream.current} onClick={takePicture}>Scan my face</button>
      </div>
    </>
  )
}
