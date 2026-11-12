import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterFolders, matchKey, searchFace, visibleFolders } from './faceSearch.js'

const folders = [
  { id: 'c1', name: 'Main camera', kind: 'camera', photos: [{ name: 'a.jpg' }, { name: 'b.jpg' }, { name: 'c.jpg' }] },
  { id: 'g1', name: 'Ana', kind: 'guest', photos: [{ name: 'a.jpg' }, { name: 'd.jpg' }] },
  { id: 'c2', name: 'Second camera', kind: 'camera', photos: [{ name: 'x.jpg' }] },
]
const matches = [
  { folderId: 'c1', name: 'c.jpg', score: 0.9 },
  { folderId: 'g1', name: 'a.jpg', score: 0.5 },
]

test('a photo is identified by its folder and its name', () => {
  assert.equal(matchKey('c1', 'a.jpg'), 'c1/a.jpg')
  assert.notEqual(matchKey('c1', 'a.jpg'), matchKey('g1', 'a.jpg'))
})

test('filterFolders keeps only the matching photos, in the original order, and drops empty folders', () => {
  const out = filterFolders(folders, matches)
  assert.deepEqual(out.map((f) => f.id), ['c1', 'g1'])
  assert.deepEqual(out[0].photos, [{ name: 'c.jpg' }])
  assert.deepEqual(out[1].photos, [{ name: 'a.jpg' }])
})

test('filterFolders without a face result changes nothing', () => {
  assert.equal(filterFolders(folders, null), folders)
})

test('filterFolders with no matches leaves nothing', () => {
  assert.deepEqual(filterFolders(folders, []), [])
})

test('camera tags and the face result both have to agree', () => {
  assert.equal(visibleFolders(folders, new Set(), null), folders)
  assert.deepEqual(visibleFolders(folders, new Set(['c1']), null).map((f) => f.id), ['c1'])
  assert.deepEqual(visibleFolders(folders, new Set(['g1']), matches).map((f) => f.id), ['g1'])
  assert.deepEqual(visibleFolders(folders, new Set(['c2']), matches), [])
  assert.deepEqual(visibleFolders(folders, new Set(), matches).map((f) => f.id), ['c1', 'g1'])
})

test('searchFace sends the selfie, the consent and the password, and returns the result', async () => {
  let seen
  const fetchStub = async (url, init) => {
    seen = { url, init }
    return { ok: true, json: async () => ({ matches, indexed: 3, total: 3 }) }
  }
  const selfie = new Blob(['x'], { type: 'image/jpeg' })
  const result = await searchFace({ apiUrl: 'https://api', slug: 'ana', eventSlug: 'nunta', password: 'pw', selfie, fetchImpl: fetchStub })
  assert.equal(seen.url, 'https://api/api/v1/public/photographers/ana/events/nunta/face-search')
  assert.equal(seen.init.method, 'POST')
  assert.equal(seen.init.headers['X-Event-Password'], 'pw')
  assert.equal(seen.init.body.get('consent'), 'true')
  assert.ok(seen.init.body.get('selfie') instanceof Blob)
  assert.deepEqual(result, { matches, indexed: 3, total: 3 })
})

test('searchFace turns a server error into its message', async () => {
  const fetchStub = async () => ({ ok: false, status: 422, json: async () => ({ message: 'We could not see a face.' }) })
  await assert.rejects(
    searchFace({ apiUrl: 'https://api', slug: 'ana', eventSlug: 'nunta', password: '', selfie: new Blob(['x']), fetchImpl: fetchStub }),
    { message: 'We could not see a face.' },
  )
})

test('searchFace explains a network failure in plain words', async () => {
  const fetchStub = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(
    searchFace({ apiUrl: 'https://api', slug: 'ana', eventSlug: 'nunta', password: '', selfie: new Blob(['x']), fetchImpl: fetchStub }),
    { message: 'Could not reach the server. Check your connection and try again.' },
  )
})
