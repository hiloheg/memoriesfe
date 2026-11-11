// Frame themes a photographer can choose for their page. One theme decorates the profile picture, the header,
// the tags and the photo space together. The keys are the ones the backend accepts; App.css draws each one (.fr-<key>).
export const FRAMES = [
  { key: 'none', name: 'None' },
  { key: 'neon', name: 'Neon' },
  { key: 'gold', name: 'Gold' },
  { key: 'holo', name: 'Holo' },
  { key: 'pixel', name: 'Pixel' },
  { key: 'paper', name: 'Paper print' },
]

export const frameClass = (key) => `fr-${FRAMES.some((f) => f.key === key) ? key : 'none'}`
