import { readError } from './accents.js'
import { passwordHeaders } from './eventAccess.js'

/** A photo is identified by the folder (camera or guest) it is in and its file name there. */
export const matchKey = (folderId, name) => `${folderId}/${name}`

/** The folders with only the photos in `matches`; folders left empty are dropped. `matches` null means no face filter. */
export function filterFolders(folders, matches) {
  if (matches === null || matches === undefined) return folders
  const wanted = new Set(matches.map((m) => matchKey(m.folderId, m.name)))
  return folders
    .map((f) => ({ ...f, photos: f.photos.filter((p) => wanted.has(matchKey(f.id, p.name))) }))
    .filter((f) => f.photos.length > 0)
}

/** The matching photos as one flat list in the shape the profile grid uses (each photo knows its folder), for a face result. */
export function facePhotos(folders, matches) {
  return filterFolders(folders, matches).flatMap((f) => f.photos.map((p) => ({ ...p, byId: f.id, camera: f.name, kind: f.kind })))
}

/** What the gallery shows: the picked camera/guest tags and the face result both have to agree. */
export function visibleFolders(folders, selectedIds, matches) {
  const tagged = selectedIds.size === 0 ? folders : folders.filter((f) => selectedIds.has(f.id))
  return filterFolders(tagged, matches)
}

/**
 * Sends a selfie to find the guest's photos of one event. The guest has agreed to the scan before this is called.
 * Resolves to { matches: [{ folderId, name, score }], indexed, total }; rejects with a message fit to show.
 */
export async function searchFace({ apiUrl, slug, eventSlug, password, selfie, fetchImpl = fetch }) {
  const body = new FormData()
  body.append('selfie', selfie, 'selfie.jpg')
  body.append('consent', 'true')
  let r
  try {
    r = await fetchImpl(`${apiUrl}/api/v1/public/photographers/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventSlug)}/face-search`, {
      method: 'POST',
      headers: passwordHeaders(password),
      body,
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }
  if (!r.ok) throw new Error(await readError(r, `The scan did not work (${r.status}). Try again.`))
  return r.json()
}
