import { useCredits } from './CreditsContext.jsx'

/** The balance and a Buy credits button, always visible in the header of the photographer area. */
export default function CreditsChip() {
  const { data, openBuy } = useCredits()
  const total = data?.balance.total
  const empty = total === 0
  return (
    <div className={`credits-chip${empty ? ' empty' : ''}`}>
      <span className="credits-count" aria-live="polite">
        {total === undefined ? <span className="sr-only">Loading credits</span> : (
          <>
            <strong>{total}</strong> <span className="credits-word">{total === 1 ? 'credit' : 'credits'}</span>
          </>
        )}
      </span>
      <button type="button" className="credits-buy" onClick={openBuy}>
        <span className="credits-buy-long">Buy credits</span>
        <span className="credits-buy-short" aria-hidden="true">Buy</span>
      </button>
    </div>
  )
}
