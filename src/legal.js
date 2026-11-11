// Who sells the service, and the Romanian consumer-protection links the dashboard must show.
// Email and phone come from build settings (see .env.example) so they can be changed without editing code.
const env = import.meta.env ?? {}

export const LEGAL = {
  name: 'HILOHE GIGI PERSOANĂ FIZICĂ AUTORIZATĂ',
  address: 'Sediu profesional: București, Sectorul 1, Bulevardul Bucureştii Noi, Nr. 136, PARTER, Ap. 5',
  cui: 'Cod unic de înregistrare: 54766547, din data 26.05.2026',
  registry: 'F2026027565005',
  email: env.VITE_CONTACT_EMAIL ?? '',
  phone: env.VITE_CONTACT_PHONE ?? '',
  // The two footer links exactly as ANPC publishes them. The old EU "SOL" link was removed by Ordin 270/2026 and must not be added.
  anpcUrl: 'https://www.anpc.ro/?ref=footer_3_6',
  anpcLabel: 'PROTECŢIA CONSUMATORILOR - A.N.P.C.',
  salUrl: 'https://reclamatiisal.anpc.ro/Despre-noi/ref/footer_3_5',
  salLabel: 'PROTECŢIA CONSUMATORILOR - A.N.P.C. – SAL (Solutionarea Alternativa a Litigiilor)',
}

/** The identity lines to print, in order; lines without a value are left out. */
export function legalLines(legal) {
  return [
    legal.name,
    legal.address,
    legal.cui,
    legal.registry && `Nr. de ordine în registrul comerțului: ${legal.registry}`,
    legal.email && `Email: ${legal.email}`,
    legal.phone && `Telefon: ${legal.phone}`,
  ].filter(Boolean)
}
