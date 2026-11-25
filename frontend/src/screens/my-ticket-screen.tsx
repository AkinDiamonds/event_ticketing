import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { Card } from '../components/card'
import { PrintIcon, TicketsIcon } from '../components/icons'
import { EventBanner } from '../components/ticket'

export type TicketDetails = {
  event: string
  attendee?: string
  type?: string
  date?: string
  time?: string
  venue?: string
  imageUrl?: string
  reference: string
}

type Props = {
  backHref: string
  ordersHref: string
  status: 'loading' | 'ready' | 'missing' | 'error'
  ticket?: TicketDetails
}

export function MyTicketScreen({ backHref, ordersHref, status, ticket }: Props) {
  return (
    <div className="pb-10">
      <TopBar narrow backHref={backHref} shareHref={status === 'ready' ? window.location.href : undefined} />
      <div className="flow-width pt-3 md:pt-7">
        <h1 className="page-title">My Ticket</h1>
        {status === 'loading' ? <p role="status" className="mt-5 text-sm text-muted">Loading ticket order…</p> : null}
        {status === 'error' ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load this paid order. Check your order reference and try again.</p> : null}
        {status === 'missing' ? (
          <Card className="mt-5 p-7 text-center">
            <TicketsIcon className="mx-auto size-8 text-forest" />
            <h2 className="mt-3 font-bold">Open a confirmed order</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Open View Ticket from the payment confirmation screen. Your entry code is sent by email.</p>
            <Button className="mt-5" href="/tickets">Browse Events</Button>
          </Card>
        ) : null}
        {status === 'ready' && ticket ? (
          <div className="mt-5">
            <div className="print-ticket overflow-hidden rounded-xl border border-line md:grid md:grid-cols-[.95fr_1.05fr]">
              <div className="ticket-poster relative">
                <EventBanner title={ticket.event} imageUrl={ticket.imageUrl} className="aspect-[1.85] p-5 md:h-full md:min-h-68 md:p-6" />
              </div>
              <div className="border-t border-dashed border-[#bdcbc0] p-5 md:border-t-0 md:border-l md:p-7">
                <h2 className="text-lg font-bold">{ticket.event}</h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                  {[[ 'Attendee', ticket.attendee ], [ 'Ticket Type', ticket.type ], [ 'Date', ticket.date ], [ 'Time', ticket.time ], [ 'Venue', ticket.venue ]].map(([label, value]) => value ? (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold text-muted uppercase">{label}</dt>
                      <dd className="mt-1 text-sm font-semibold break-words">{value}</dd>
                    </div>
                  ) : null)}
                  <div className="col-span-2 border-t border-line pt-3">
                    <dt className="text-[11px] font-semibold text-muted uppercase">Order Reference</dt>
                    <dd className="mt-1 text-sm font-semibold break-all">{ticket.reference}</dd>
                  </div>
                </dl>
                <p className="mt-4 rounded-lg bg-mint p-3 text-xs leading-5 text-forest">Use the ticket code from your confirmation email when you arrive.</p>
              </div>
            </div>
            <div className="no-print mt-4 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => window.print()}><PrintIcon className="size-4" /> Print Receipt</Button>
              <Button variant="ghost" href={ordersHref}>My Orders</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
