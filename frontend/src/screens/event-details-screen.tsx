import { useState } from 'react'
import { Button } from '../components/button'
import { Card } from '../components/card'
import { QuantityControl } from '../components/form'
import { TopBar } from '../components/navbar'
import { CalendarIcon, ClockIcon, LocationIcon } from '../components/icons'
import { EventBanner, TicketOption } from '../components/ticket'
import { ticketsRemaining } from '../lib/ticket-types'
import { formatEventSchedule, formatPrice } from '../lib/format-event'
import type { EventRecord } from '../lib/events-api'

type Props = {
  event: EventRecord
  backHref: string
  shareHref: string
  initialTierId?: string
  initialQuantity: number
  onContinue: (tierId: string, quantity: number) => void
}

export function EventDetailsScreen({ event, backHref, shareHref, initialTierId, initialQuantity, onContinue }: Props) {
  const tiers = event.tiers.filter((tier) => tier.isActive !== false)
  const [tierId, setTierId] = useState(initialTierId)
  const [quantity, setQuantity] = useState(initialQuantity)
  const selectedTier = tiers.find((tier) => tier.id === tierId)
  const maximum = selectedTier ? Math.min(10, ticketsRemaining(selectedTier)) : 0
  const schedule = formatEventSchedule(event.startsAt)

  return (
    <div className="pb-10">
      <TopBar backHref={backHref} backLabel="Back to events" shareHref={shareHref} />
      <div className="mx-auto w-full max-w-[1180px] md:px-8">
        <EventBanner title={event.title} imageUrl={event.bannerImageUrl} className="aspect-[1.55] px-5 md:aspect-[3.1] md:min-h-55 md:rounded-xl md:px-10" />
        <div className="px-5 pt-5 md:px-5 md:pt-7">
          <h1 className="page-title">{event.title}</h1>
          {event.description ? <p className="page-description">{event.description}</p> : null}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-[13px] text-muted">
            <p className="flex items-center gap-2"><CalendarIcon className="size-[18px] shrink-0" />{schedule?.day || 'Date to be announced'}</p>
            {schedule ? <p className="flex items-center gap-2"><ClockIcon className="size-[18px] shrink-0" />{schedule.time}</p> : null}
            <p className="flex basis-full items-center gap-2 md:basis-auto"><LocationIcon className="size-[18px] shrink-0" />{event.venue || 'Venue to be announced'}</p>
          </div>
          <section className="mt-6 border-t border-line pt-5 md:mt-8 md:pt-6">
            <h2 className="text-lg font-bold tracking-tight">Choose Your Ticket</h2>
            <p className="mt-1 text-sm text-muted">Choose a ticket type and quantity.</p>
            {tiers.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
                {tiers.map((tier) => (
                  <button key={tier.id} type="button" aria-pressed={tierId === tier.id} onClick={() => {
                    setTierId(tier.id)
                    setQuantity((current) => Math.min(current, ticketsRemaining(tier), 10))
                  }}
                    disabled={ticketsRemaining(tier) <= 0} className="rounded-xl text-left disabled:opacity-55">
                    <TicketOption tier={tier} selected={tierId === tier.id} tone={tier.name.toLowerCase() === 'vip' ? 'gold' : undefined} />
                  </button>
                ))}
              </div>
            ) : null}
            {selectedTier && maximum > 0 ? (
              <div className="mt-5 space-y-3">
                <Card className="p-3.5 md:flex md:items-center md:justify-between md:gap-4">
                  <p className="mb-2 text-sm font-semibold md:mb-0">Quantity</p>
                  <QuantityControl value={quantity} max={maximum} onChange={setQuantity} />
                </Card>
                <div className="flex items-center justify-between gap-3 border-t border-line px-1 py-3">
                  <p className="text-sm font-semibold">Total Amount</p>
                  <output aria-label="Total amount" className="text-[24px] font-bold tracking-tight tabular-nums">{formatPrice(selectedTier.price * quantity)}</output>
                </div>
                <Button className="w-full" onClick={() => onContinue(selectedTier.id, quantity)}>Continue to Attendee Information</Button>
              </div>
            ) : <p className="mt-4 text-sm text-muted">There are no tickets available for this event.</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
