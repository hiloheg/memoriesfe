// A photo from the gallery has `url` (the original, for download and the editor) and, when the server could make links,
// `thumb` (small copy for the grid) and `view` (medium copy for the full-screen viewer). The small copies are relative
// to the API address and are made by the server the first time someone asks, so they can fail: callers fall back to `url`.
const BASE = (import.meta.env?.VITE_API_URL ?? '').replace(/\/+$/, '')

const join = (path, base = BASE) => `${base}${path}`

/** Address of the small copy for the grid, or the original when there is none. */
export const smallUrl = (photo, base) => (photo.thumb ? join(photo.thumb, base) : photo.url)

/** Address of the medium copy for the viewer, or the original when there is none. */
export const viewUrl = (photo, base) => (photo.view ? join(photo.view, base) : photo.url)
