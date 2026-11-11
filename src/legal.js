// Who sells the service, and the Romanian consumer-protection links the dashboard must show.
// Registry number, email and phone come from build settings (see .env.example) so they can be added without editing code.
const env = import.meta.env ?? {}

export const LEGAL = {
  name: 'HILOHE GIGI PERSOANĂ FIZICĂ AUTORIZATĂ',
  address: 'Sediu profesional: București, Sectorul 1, Bulevardul Bucureştii Noi, Nr. 136, PARTER, Ap. 5',
  cui: 'Cod unic de înregistrare: 54766547, din data 26.05.2026',
  registry: env.VITE_COMPANY_REGISTRY ?? '',
  email: env.VITE_CONTACT_EMAIL ?? '',
  phone: env.VITE_CONTACT_PHONE ?? '',
  anpcUrl: 'https://anpc.ro',
  // The national alternative dispute resolution (SAL) platform. The old EU "SOL" link was removed by Ordin 270/2026 and must not be added.
  salUrl: 'https://reclamatiisal.anpc.ro',
}

/** The identity lines to print, in order; lines without a value are left out. */
export function legalLines(legal) {
  return [
    legal.name,
    legal.address,
    legal.cui,
    legal.registry && `Registrul comerțului: ${legal.registry}`,
    legal.email && `Email: ${legal.email}`,
    legal.phone && `Telefon: ${legal.phone}`,
  ].filter(Boolean)
}
