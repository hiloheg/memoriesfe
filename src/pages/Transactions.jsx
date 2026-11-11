import { describeEntry, formatLongDate } from '../credits.js'
import { useCredits } from '../components/CreditsContext.jsx'

/** The credit history of the signed-in photographer: free credit, purchases, events and refunds, newest first. */
export default function Transactions() {
  const { data, openBuy } = useCredits()
  const history = data?.history

  return (
    <section>
      <div className="page-head">
        <h1>Transactions</h1>
        <p className="muted">
          Every change to your credits. Receipts and invoices for payments are in your{' '}
          <a href="https://app.lemonsqueezy.com/my-orders" target="_blank" rel="noopener noreferrer">Lemon Squeezy orders</a>.
        </p>
      </div>

      {data && (
        <div className="tx-balance">
          <div>
            <strong>{data.balance.total}</strong> <span className="muted">{data.balance.total === 1 ? 'credit available' : 'credits available'}</span>
          </div>
          <button type="button" className="primary" onClick={openBuy}>Buy credits</button>
        </div>
      )}

      {!history ? (
        <p className="muted" aria-live="polite">Loading transactions…</p>
      ) : history.length === 0 ? (
        <div className="empty">No transactions yet.</div>
      ) : (
        <ul className="tx-list">
          {history.map((row, i) => {
            const e = describeEntry(row)
            return (
              <li key={`${row.createdAt}-${i}`} className="tx-row">
                <div>
                  <strong>{e.title}</strong>
                  <span className="muted">{formatLongDate(row.createdAt)}{row.kind === 'trial' ? ' · free credit' : ''}</span>
                </div>
                <span className={`tx-change${e.gain ? ' gain' : ''}`}>{e.change}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
