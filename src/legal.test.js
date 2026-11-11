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

test('the trade register number is part of the details, after the CUI', () => {
  assert.equal(LEGAL.registry, 'F2026027565005')
  const lines = legalLines({ ...LEGAL, email: '', phone: '' })
  assert.equal(lines[3], 'Nr. de ordine în registrul comerțului: F2026027565005')
  assert.equal(lines.length, 4)
})

test('email and phone are added after the register number when known', () => {
  const lines = legalLines({ ...LEGAL, email: 'hello@imemories.eu', phone: '+40 700 000 000' })
  assert.equal(lines.length, 6)
  assert.ok(lines[3].includes('F2026027565005'))
  assert.ok(lines[4].includes('hello@imemories.eu'))
  assert.ok(lines[5].includes('+40 700 000 000'))
})

test('the dispute links are the ones ANPC gives for footers, never the repealed EU platform', () => {
  assert.equal(LEGAL.anpcUrl, 'https://www.anpc.ro/?ref=footer_3_6')
  assert.equal(LEGAL.anpcLabel, 'PROTECŢIA CONSUMATORILOR - A.N.P.C.')
  assert.equal(LEGAL.salUrl, 'https://reclamatiisal.anpc.ro/Despre-noi/ref/footer_3_5')
  assert.equal(LEGAL.salLabel, 'PROTECŢIA CONSUMATORILOR - A.N.P.C. – SAL (Solutionarea Alternativa a Litigiilor)')
  for (const value of Object.values(LEGAL)) assert.ok(!String(value).includes('ec.europa.eu'), value)
})
