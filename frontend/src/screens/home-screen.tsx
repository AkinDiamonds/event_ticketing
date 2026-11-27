import { useEffect, useState } from 'react'
import { Card } from '../components/card'
import { Button } from '../components/button'
import { BottomNav, TopBar } from '../components/navbar'
import { ArrowRightIcon, CalendarIcon, LocationIcon } from '../components/icons'
import { SearchField } from '../components/form'
import { EventBanner } from '../components/ticket'
import { getEvents, type EventRecord } from '../lib/events-api'
import { ticketsRemaining } from '../lib/ticket-types'
import { formatEventSchedule, formatPrice } from '../lib/format-event'
import venueImage from '../assets/event-venue.webp'

const posterTones = ['green', 'gold', 'red'] as const

function EventCard({ event, tone }: { event: EventRecord; tone: (typeof posterTones)[number] }) {
  const schedule = formatEventSchedule(event.startsAt)
  const tiers = event.tiers.filter((tier) => ticketsRemaining(tier) > 0)
  const price = tiers.length ? formatPrice(Math.min(...tiers.map((tier) => tier.price))) : ''
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <a href={'/tickets/' + encodeURIComponent(event.id)} className="group block rounded-xl">
        <EventBanner title={event.title} imageUrl={event.bannerImageUrl} tone={tone} className="aspect-[1.65] p-5 md:aspect-[1.7]" />
        <div className="p-4">
          <h3 className="text-base leading-snug font-bold">{event.title}</h3>
          <div className="mt-2 grid gap-1.5 text-[13px] text-muted">
            <p className="flex items-center gap-2"><CalendarIcon className="size-4 shrink-0" />{schedule?.day || 'Date to be announced'}</p>
            <p className="flex items-center gap-2"><LocationIcon className="size-4 shrink-0" />{event.venue || 'Venue to be announced'}</p>
          </div>
          <div className="mt-2 flex min-h-10 flex-wrap items-center justify-between gap-2 text-sm md:mt-4">
            {price ? <p>From <strong className="text-forest">{price}</strong></p> : <p className="text-muted md:hidden">View tickets</p>}
            <span className="ml-auto grid size-10 shrink-0 place-items-center rounded-full bg-amber text-lg leading-none text-ink group-hover:bg-[#f2b100] md:hidden" aria-hidden="true"><ArrowRightIcon className="size-[18px]" /></span>
            <span className="ml-auto hidden min-h-9 items-center rounded-lg bg-forest px-3 text-xs font-semibold text-white md:inline-flex md:group-hover:bg-forest-dark">View tickets</span>
          </div>
        </div>
      </a>
    </Card>
  )
}

export function HomeScreen({ browseOnly = false }: { browseOnly?: boolean }) {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    getEvents().then((items) => { if (active) setEvents(items) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load events.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const search = query.trim().toLowerCase()
  const visibleEvents = events.filter((event) => `${event.title} ${event.venue ?? ''} ${event.description ?? ''}`.toLowerCase().includes(search))

  return (
    <div className="flex min-h-dvh flex-col md:min-h-[calc(100dvh-73px)]">
      <TopBar menu />
      {browseOnly ? (
        <div className="page-width pt-4 pb-4 md:pt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="page-title">Browse Events</h1>
            <Button href="/events/create" size="sm" variant="accent">+ Create event</Button>
          </div>
          <SearchField value={query} onChange={setQuery} desktopButton />
        </div>
      ) : (
        <section className="page-width relative isolate pt-4 pb-4 md:py-15 lg:py-20">
          <div className="pointer-events-none absolute inset-y-0 right-8 -z-10 hidden w-[54%] overflow-hidden rounded-[34px_0_0_34px] md:block">
            <img src={venueImage} alt="" fetchPriority="high" className="size-full object-cover object-right opacity-[.72] [mask-image:linear-gradient(to_right,transparent,#000_44%)]" />
          </div>
          <div className="relative max-w-[550px]">
            <h1 className="max-w-[17ch] text-[31px] leading-[1.13] font-bold tracking-[-.045em] md:hidden">Discover Amazing Events</h1>
            <h1 className="hidden text-[clamp(2.6rem,5vw,4.35rem)] leading-[1.03] font-bold tracking-[-.055em] md:block">Event Tickets<span className="mt-2 block text-[.7em] text-forest">Tickets Made Easy</span></h1>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-6 text-muted md:mt-5 md:text-base">Discover events from universities, organizations, and your community.</p>
            <div className="mt-5 md:mt-7"><SearchField value={query} onChange={setQuery} desktopButton /></div>
          </div>
        </section>
      )}

      <section id="event-list" aria-label="Available events" className="page-width flex-1 scroll-mt-4 pt-4 pb-8 md:pt-8 md:pb-14">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[18px] font-bold tracking-tight md:text-[23px]">{search ? 'Search Results' : browseOnly ? 'Upcoming Events' : 'Available Events'}</h2>
          {!browseOnly ? <a href="/tickets" className="text-sm font-semibold text-forest hover:underline">See all</a> : null}
        </div>
        {loading ? <p role="status" className="rounded-xl border border-line p-5 text-sm text-muted">Loading events…</p> : null}
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</p> : null}
        {!loading && !error && visibleEvents.length === 0 ? <p className="rounded-xl border border-line p-5 text-sm text-muted">{search ? 'No events match your search.' : 'No events are available right now.'}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {visibleEvents.map((event, index) => <EventCard key={event.id} event={event} tone={posterTones[index % posterTones.length]} />)}
        </div>
      </section>
      <BottomNav />
    </div>
  )
}
