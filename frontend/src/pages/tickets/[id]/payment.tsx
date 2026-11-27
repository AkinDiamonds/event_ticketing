import { useState } from 'react'
import { PaymentScreen } from '../../../screens/payment-screen'
import { checkout } from '../../../lib/events-api'
import { readCheckoutDraft, saveCheckoutDraft } from '../../../lib/checkout-state'

function findString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  for (const key of keys) if (typeof record[key] === 'string' && record[key]) return record[key] as string
  for (const nested of Object.values(record)) { const found = findString(nested, keys); if (found) return found }
  return undefined
}

function parsePaystackUrl(value: string): URL | undefined {
  try {
    const url = new URL(value)
    if (url.origin === 'https://checkout.paystack.com' && !url.username && !url.password) return url
  } catch {
    return undefined
  }
}

export default function TicketPaymentPage({ params }: { params: Record<string, string> }) {
  const savedDraft = readCheckoutDraft()
  const draft = savedDraft?.event.id === params.id ? savedDraft : null
  const eventHref = '/tickets/' + encodeURIComponent(params.id)
  const signInHref = localStorage.getItem('lasu_access_token') ? undefined : '/login?returnTo=' + encodeURIComponent(eventHref + '/payment')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)
  async function pay() {
    if (!draft || !draft.attendee || loading || signInHref) return
    setError('')
    setLoading(true)
    try {
      const result = await checkout({ eventId: draft.event.id, items: [{ tierId: draft.tierId, quantity: draft.quantity }] })
      setBlocked(true)
      const paymentUrl = findString(result, ['authorizationUrl', 'authorization_url', 'paymentUrl', 'payment_url', 'checkoutUrl', 'checkout_url', 'url'])
      const orderId = findString(result, ['orderId', 'order_id', 'id', '_id'])
      if (orderId) saveCheckoutDraft({ ...draft, orderId })
      if (paymentUrl) {
        const destination = parsePaystackUrl(paymentUrl)
        if (!destination) {
          throw new Error('We couldn’t open a verified Paystack link. Check your order before retrying.')
        }
        saveCheckoutDraft({ ...draft, ...(orderId ? { orderId } : {}), paymentUrl: destination.href })
        window.location.assign(destination.href)
        return
      }
      if (orderId) {
        window.location.assign(`${eventHref}/success?orderId=${encodeURIComponent(orderId)}`)
        return
      }
      setError('Paystack checkout couldn’t be opened. Check your order before trying again.')
    } catch (cause) {
      setBlocked(true)
      setError(cause instanceof Error ? cause.message : 'Could not create checkout.')
    } finally {
      setLoading(false)
    }
  }
  return <PaymentScreen backHref={eventHref + '/attendee'} draft={draft} signInHref={signInHref} error={error} loading={loading} blocked={blocked} onPay={pay} />
}
