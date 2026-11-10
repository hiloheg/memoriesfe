/** A believable QR pattern (not scannable): three corner markers plus seeded noise, with room left in the middle for the name. */
function buildQr() {
  const n = 25
  let seed = 7
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const inFinder = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)
  const inMiddle = (x, y) => x > 7 && x < 17 && y > 9 && y < 15
  let d = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (inFinder(x, y) || inMiddle(x, y)) continue
      if (rnd() < 0.47) d += `M${x} ${y}h1v1h-1z`
    }
  }
  const finder = (ox, oy) => `M${ox} ${oy}h7v7h-7zM${ox + 1} ${oy + 1}v5h5v-5zM${ox + 2} ${oy + 2}h3v3h-3z`
  return { n, d, finders: finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) }
}
export const QR = buildQr()

