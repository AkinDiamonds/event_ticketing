import { useEffect, useState } from 'react'
import { getEvent, getOrder } from '../../../lib/events-api'
import { formatEventSchedule } from '../../../lib/format-event'
import { MyTicketScreen, type TicketDetails } from '../../../screens/my-ticket-screen'

function firstValue(value: unknown, keys: string[]): string {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of keys) {
    const field = record[key]
    if (typeof field === 'string' || typeof field === 'number') return String(field)
  }
  for (const nested of Object.values(record)) {
    const found = firstValue(nested, keys)
    if (found) return found
  }
  return ''
}

export default function TicketWalletPage({ params }: { params: Record<string, string> }) {
  const orderId = new URLSearchParams(window.location.search).get('orderId') || ''
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>(orderId ? 'loading' : 'missing')
  const [ticket, setTicket] = useState<TicketDetails>()
  const eventId = params.id

  useEffect(() => {
    if (!orderId) return
    let active = true

    async function load() {
      try {
        const order = await getOrder(orderId)
        const payment = firstValue(order, ['paymentStatus', 'payment_status', 'status']).toLowerCase()
        const linkedEventId = firstValue(order, ['eventId', 'event_id'])
        if (!active) return
        if (!['paid', 'success', 'successful', 'completed', 'complete'].includes(payment) || (linkedEventId && linkedEventId !== eventId)) {
          setStatus('error')
          return
        }
        const event = await getEvent(eventId).catch(() => null)
        if (!active) return
        const schedule = formatEventSchedule(event?.startsAt || firstValue(order, ['startsAt', 'startAt', 'eventDate']))
        setTicket({
          event: event?.title || firstValue(order, ['eventTitle', 'eventName']) || 'Event order',
          attendee: firstValue(order, ['attendeeName', 'fullName']),
          type: firstValue(order, ['tierName', 'ticketType', 'ticketName']),
          date: schedule?.day,
          time: schedule?.time,
          venue: event?.venue || firstValue(order, ['venue', 'location']),
          imageUrl: event?.bannerImageUrl,
          reference: orderId,
        })
        setStatus('ready')
      } catch {
        if (active) setStatus('error')
      }
    }

    void load()
    return () => { active = false }
  }, [orderId, eventId])

  return <MyTicketScreen backHref={'/tickets/' + encodeURIComponent(eventId) + '/success?orderId=' + encodeURIComponent(orderId)} ordersHref="/orders" status={status} ticket={ticket} />
}
