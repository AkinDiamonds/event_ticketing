import { useEffect, useState } from 'react'
import { getOrder } from '../../../lib/events-api'
import { clearCheckoutDraft, readCheckoutDraft } from '../../../lib/checkout-state'
import { PaymentSuccessScreen } from '../../../screens/payment-success-screen'

function readStatus(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of ['paymentStatus', 'status', 'payment_status']) if (typeof record[key] === 'string') return (record[key] as string).toLowerCase()
  for (const nested of Object.values(record)) { const status = readStatus(nested); if (status) return status }
  return ''
}

export default function TicketSuccessPage({ params }: { params: Record<string, string> }) {
  const draft = readCheckoutDraft()
  const paramsFromUrl = new URLSearchParams(window.location.search)
  const orderId = paramsFromUrl.get('orderId') || paramsFromUrl.get('order_id') || (draft?.event.id === params.id ? draft.orderId : '') || ''
  const [state, setState] = useState<'loading' | 'paid' | 'pending' | 'error'>(orderId ? 'loading' : 'error')
  useEffect(() => {
    if (!orderId) return
    let active = true
    getOrder(orderId).then((order) => {
      if (!active) return
      const status = readStatus(order)
      const paid = ['paid', 'success', 'successful', 'completed', 'complete'].includes(status)
      setState(paid ? 'paid' : status === 'pending' ? 'pending' : 'error')
      const currentDraft = readCheckoutDraft()
      if (paid && currentDraft?.orderId === orderId) clearCheckoutDraft()
    }).catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [orderId])
  return <PaymentSuccessScreen viewTicketHref={`/tickets/${encodeURIComponent(params.id)}/ticket?orderId=${encodeURIComponent(orderId)}`} eventsHref="/tickets" status={state} orderId={orderId} />
}
