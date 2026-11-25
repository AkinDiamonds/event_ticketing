import { Card } from '../components/card'
import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { CardIcon, CheckIcon, ShieldCheckIcon } from '../components/icons'
import { formatEventSchedule, formatPrice } from '../lib/format-event'
import type { CheckoutDraft } from '../lib/checkout-state'

type Props = { backHref: string; draft: CheckoutDraft | null; error: string; loading: boolean; blocked: boolean; signInHref?: string; onPay: () => void }

export function PaymentScreen({ backHref, draft, error, loading, blocked, signInHref, onPay }: Props) {
  const tier = draft?.event.tiers.find((item) => item.id === draft.tierId)
  const total = formatPrice((tier?.price ?? 0) * (draft?.quantity ?? 0))
  const schedule = formatEventSchedule(draft?.event.startsAt)

  return (
    <div className="pb-10">
      <TopBar narrow backHref={backHref} />
      <div className="flow-width pt-3 md:pt-7">
        <h1 className="page-title">Payment</h1>
        <p className="page-description">Complete your purchase.</p>
        {draft?.attendee && tier ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 md:items-start">
            <Card className="p-4 md:p-5">
              <h2 className="text-[15px] font-bold">Order Summary</h2>
              <p className="mt-4 text-base font-bold">{draft.event.title}</p>
              {schedule || draft.event.venue ? <p className="mt-1 text-xs leading-5 text-muted">{[schedule?.day, draft.event.venue].filter(Boolean).join(' · ')}</p> : null}
              <dl className="mt-4 border-y border-line py-4 text-sm">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4">
                  <dt className="min-w-0">{tier.name}</dt>
                  <dd className="text-muted">×{draft.quantity}</dd>
                  <dd className="font-semibold tabular-nums">{total}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm font-bold">Total Amount</p>
                <p className="text-xl font-bold text-forest tabular-nums">{total}</p>
              </div>
            </Card>
            <section className="pt-2 md:pt-1">
              <h2 className="text-[15px] font-bold">Payment Method</h2>
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-forest bg-mint p-3.5">
                <CardIcon className="size-5 shrink-0 text-forest" />
                <div className="flex-1"><p className="text-sm font-bold">Paystack</p><p className="mt-1 text-xs text-muted">Choose a payment method at checkout.</p></div>
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-forest text-white"><CheckIcon className="size-3.5" /></span>
              </div>
              {error ? <p role="alert" className="mt-4 text-sm text-red-800">{error}</p> : null}
              {signInHref ? (
                <Button className="mt-5 w-full" href={signInHref}>Log in to Pay</Button>
              ) : (
                <Button className="mt-5 w-full" disabled={loading || blocked} onClick={onPay}>{loading ? 'Opening secure checkout…' : blocked ? 'Checkout unavailable' : 'Pay ' + total}</Button>
              )}
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheckIcon className="size-4 text-forest" /> Secured by Paystack</p>
            </section>
          </div>
        ) : <p role="alert" className="mt-6 rounded-xl border border-line p-4 text-sm">Your checkout details are unavailable. <a href={backHref} className="font-semibold text-forest underline">Return to attendee information</a> to continue.</p>}
      </div>
    </div>
  )
}
