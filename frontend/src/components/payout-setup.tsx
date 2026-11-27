import { useEffect, useState, type FormEvent } from 'react'
import { Button } from './button'
import { Card } from './card'
import { formatPrice } from '../lib/format-event'
import {
  confirmPayoutAccount, getPayoutBanks, getPayoutSettlements, getPayoutTerms, resolvePayoutAccount,
  type PayoutAccount, type PayoutSettlement,
} from '../lib/events-api'

export function PayoutSetup({ account, onConfigured }: {
  account: PayoutAccount | null; onConfigured: (account: PayoutAccount) => void
}) {
  const [banks, setBanks] = useState<{ code: string; name: string }[]>()
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [password, setPassword] = useState('')
  const [settlements, setSettlements] = useState<PayoutSettlement[]>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof getPayoutTerms>>>()

  useEffect(() => {
    let active = true
    getPayoutTerms().then((result) => { if (active) setTerms(result) })
      .catch(() => { if (active) setTerms(null) })
    return () => { active = false }
  }, [])

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    try { await action() } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payout details could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => {
      if (accountName) {
        const payout = await confirmPayoutAccount({ businessName, bankCode, accountNumber, accountName, password })
        setPassword('')
        setAccountNumber('')
        onConfigured(payout)
      } else {
        const resolved = await resolvePayoutAccount({ bankCode, accountNumber })
        setAccountName(resolved.accountName)
      }
    })
  }

  return (
    <Card className="mt-5 space-y-3 p-4 md:p-5">
      <h2 className="font-bold">Payout account</h2>
      {terms ? <p className="text-sm text-muted">Event Tickets keeps {terms.basisPoints / 100}% of each sale before any processing fees. {terms.bearer === 'account' ? 'Event Tickets covers Paystack processing fees.' : 'Paystack deducts processing fees from your share.'}</p> : null}
      {terms === null ? <p role="status" className="text-sm text-muted">Paid sales configuration is currently unavailable.</p> : null}
      {account ? (
        <>
          <p className="text-sm text-muted">{account.accountName} · Account ending in {account.accountLast4}</p>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void run(async () => { setSettlements(await getPayoutSettlements()) })}>
            {busy ? 'Loading…' : settlements ? 'Refresh recent payouts' : 'View recent payouts'}
          </Button>
          {settlements?.length === 0 ? <p className="text-sm text-muted">Paystack hasn’t reported any settlements for this account yet.</p> : null}
          {settlements?.length ? <ul className="divide-y divide-line text-sm" aria-label="Recent payouts">
            {settlements.map((settlement, index) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-2" key={settlement.date + index}>
                <span>{new Date(settlement.date).toLocaleDateString('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' })}</span>
                <span>{formatPrice(settlement.amountKobo)} · {settlement.status === 'success' ? 'Settled' : settlement.status === 'failed' ? 'Failed' : 'Pending'}</span>
              </li>
            ))}
          </ul> : null}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Set up where your proceeds go before opening paid sales. You can reuse this account for future events.</p>
          {banks ? (
            <form className="space-y-3" onSubmit={submit}>
              {accountName ? (
                <>
                  <p className="rounded-lg bg-mint p-3 text-sm">Paystack found <strong>{accountName}</strong>. Confirm that this is your intended payout account.</p>
                  <label className="form-label">Current password
                    <input className="form-input" type="password" autoComplete="current-password" required maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </label>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setAccountName(''); setPassword(''); setError('') }}>Change bank details</Button>
                </>
              ) : (
                <>
                  <label className="form-label">Business or organizer name
                    <input className="form-input" required minLength={2} maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                  </label>
                  <div>
                    <label className="form-label" htmlFor="payout-bank">Bank</label>
                    <select className="form-input" id="payout-bank" required value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
                      <option value="">Choose your bank</option>
                      {banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                    </select>
                  </div>
                  <label className="form-label">Account number
                    <input className="form-input" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </label>
                </>
              )}
              <Button type="submit" variant="accent" disabled={busy}>{busy ? 'Please wait…' : accountName ? 'Confirm payout account' : 'Check account name'}</Button>
            </form>
          ) : <Button variant="secondary" size="sm" disabled={busy || !terms} onClick={() => void run(async () => { setBanks(await getPayoutBanks()) })}>{busy ? 'Loading banks…' : 'Set up payouts'}</Button>}
        </>
      )}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </Card>
  )
}
