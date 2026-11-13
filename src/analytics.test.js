import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyticsCookieNames, startAnalytics, templatePath, trackPage } from './analytics.js'

test('only the kind of page is reported, never a private gallery address or a person', () => {
  assert.equal(templatePath('/'), '/')
  assert.equal(templatePath('/privacy'), '/privacy')
  assert.equal(templatePath('/e/9fK2secretToken'), '/e/[token]')
  assert.equal(templatePath('/events/42'), '/events/[id]')
  assert.equal(templatePath('/gigi-hilohe'), '/[profile]')
  assert.equal(templatePath('/gigi-hilohe/nunta-ana/'), '/[profile]/[event]')
  assert.equal(templatePath('/a/b/c/d'), '/[other]')
})

test('no address that leaves for Google contains a slug or a token', () => {
  for (const p of ['/e/abc123', '/gigi-hilohe', '/gigi-hilohe/nunta-ana']) {
    assert.doesNotMatch(templatePath(p), /abc123|gigi|nunta/)
  }
})

test('the Analytics cookies are recognised and our own items are not', () => {
  assert.deepEqual(
    analyticsCookieNames('_ga=GA1.1.1; _ga_2CMX4RVC8T=GS1; _gid=x; _gat_gtag_G_1=1; session=abc; other=1'),
    ['_ga', '_ga_2CMX4RVC8T', '_gid', '_gat_gtag_G_1'],
  )
  assert.deepEqual(analyticsCookieNames(''), [])
})

test('without a measurement ID (development, tests) nothing is loaded or sent', () => {
  assert.equal(startAnalytics(), false)
  assert.doesNotThrow(() => trackPage('/e/secret'))
})
