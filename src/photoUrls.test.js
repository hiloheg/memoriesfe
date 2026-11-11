import assert from 'node:assert/strict'
import { test } from 'node:test'
import { smallUrl, viewUrl } from './photoUrls.js'

const photo = { url: 'https://r2/original', thumb: '/api/v1/public/thumb?w=480&k=a', view: '/api/v1/public/thumb?w=1600&k=a' }

test('small and medium copies point at the API', () => {
  assert.equal(smallUrl(photo, 'https://api.imemories.eu'), 'https://api.imemories.eu/api/v1/public/thumb?w=480&k=a')
  assert.equal(viewUrl(photo, 'https://api.imemories.eu'), 'https://api.imemories.eu/api/v1/public/thumb?w=1600&k=a')
})

test('a photo without copies falls back to the original', () => {
  const plain = { url: 'https://r2/original' }
  assert.equal(smallUrl(plain, 'https://api'), 'https://r2/original')
  assert.equal(viewUrl(plain, 'https://api'), 'https://r2/original')
})
