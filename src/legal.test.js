import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LEGAL, legalLines } from './legal.js'

test('the identity lines are exactly what the owner gave, in order', () => {
  assert.deepEqual(legalLines({ ...LEGAL, registry: '', email: '', phone: '' }), [
    'HILOHE GIGI PERSOANĂ FIZICĂ AUTORIZATĂ',
    'Sediu profesional: București, Sectorul 1, Bulevardul Bucureştii Noi, Nr. 136, PARTER, Ap. 5',
    'Cod unic de înregistrare: 54766547, din data 26.05.2026',
  ])
})

test('registry number, email and phone are added after the CUI when known', () => {
  const lines = legalLines({ ...LEGAL, registry: 'F40/1234/2026', email: 'hello@imemories.eu', phone: '+40 700 000 000' })
  assert.equal(lines.length, 6)
  assert.ok(lines[3].includes('F40/1234/2026'))
  assert.ok(lines[4].includes('hello@imemories.eu'))
  assert.ok(lines[5].includes('+40 700 000 000'))
})

test('the dispute links point to ANPC and its SAL platform, never to the repealed EU platform', () => {
  assert.equal(LEGAL.anpcUrl, 'https://anpc.ro')
  assert.equal(LEGAL.salUrl, 'https://reclamatiisal.anpc.ro')
  for (const value of Object.values(LEGAL)) assert.ok(!String(value).includes('ec.europa.eu'), value)
})
