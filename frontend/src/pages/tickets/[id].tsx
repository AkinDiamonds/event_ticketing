import { useEffect, useState } from 'react'
import { EventDetailsScreen } from '../../screens/event-details-screen'
import { getEvent, type EventRecord } from '../../lib/events-api'
import { readCheckoutDraft, saveCheckoutDraft } from '../../lib/checkout-state'
import { ticketsRemaining } from '../../lib/ticket-types'
import { useRouter } from '../../router'

export default function TicketDetailPage({ params }: { params: Record<string, string> }) {
  const { navigate } = useRouter()
  const id = params.id
  const eventHref = '/tickets/' + encodeURIComponent(id)
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getEvent(id).then((value) => { if (active) setEvent(value) }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load this event.')
    })
    return () => { active = false }
  }, [id])

  if (!event) {
    return <div className="p-8 text-center text-sm text-muted" role={error ? 'alert' : 'status'}>{error || 'Loading event…'}</div>
  }

  const savedDraft = readCheckoutDraft()
  const draft = savedDraft?.event.id === event.id ? savedDraft : null
  const preferredTier = new URLSearchParams(window.location.search).get('tier') || draft?.tierId
  const available = event.tiers.filter((tier) => ticketsRemaining(tier) > 0)
  const initialTier = available.find((tier) => tier.id === preferredTier) ?? available[0]
  const initialQuantity = draft && initialTier && initialTier.id === draft.tierId && Number.isInteger(draft.quantity)
    ? Math.max(1, Math.min(draft.quantity, ticketsRemaining(initialTier), 10))
    : 1

  function continueToAttendee(tierId: string, quantity: number) {
    const tier = available.find((item) => item.id === tierId)
    if (!event || !tier || !Number.isInteger(quantity) || quantity < 1 || quantity > Math.min(10, ticketsRemaining(tier))) return
    saveCheckoutDraft({ event, tierId, quantity, attendee: draft?.attendee })
    navigate(eventHref + '/attendee')
  }

  return (
    <EventDetailsScreen
      event={event}
      backHref="/tickets"
      shareHref={eventHref}
      initialTierId={initialTier?.id}
      initialQuantity={initialQuantity}
      onContinue={continueToAttendee}
    />
  )
}
