import { LEGAL, legalLines } from '../legal.js'

/** The seller's identity lines, for footers that do not use the full legal footer. */
export default function LegalIdentity() {
  return (
    <address className="legal-id">
      {legalLines(LEGAL).map((line) => <span key={line}>{line}</span>)}
    </address>
  )
}
