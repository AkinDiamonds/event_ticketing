import { Button } from '../components/button'
import { AlertIcon, CheckIcon, ClockIcon } from '../components/icons'
import poster from '../assets/event-poster.webp'

type Props = { viewTicketHref: string; eventsHref: string; status: 'loading' | 'paid' | 'pending' | 'error'; orderId: string }

const messages = {
  loading: ['Checking your payment', 'We’re confirming your order.'],
  paid: ['Payment Successful!', 'Your payment is confirmed. Check your email for the ticket code you’ll use at the venue.'],
  pending: ['Payment pending', 'Check this page again in a moment to confirm your order.'],
  error: ['Unable to confirm payment', 'Check your order confirmation or contact support before paying again.'],
} as const

export function PaymentSuccessScreen({ viewTicketHref, eventsHref, status, orderId }: Props) {
  const [title, description] = messages[status]

  return (
    <div className="relative isolate grid min-h-dvh content-center overflow-hidden bg-[#041d11] px-5 py-14 text-center text-white md:min-h-[calc(100dvh-73px)] md:bg-white md:text-ink">
      <img src={poster} alt="" className="absolute inset-0 -z-20 size-full object-cover object-right md:hidden" />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-[#03180a]/65 to-[#03180a]/25 md:hidden" />
      <section aria-busy={status === 'loading'} className="mx-auto w-full max-w-[400px]">
        <div className="mx-auto grid size-24 place-items-center rounded-full bg-white text-forest md:size-20 md:bg-forest md:text-white">
          {status === 'paid' ? <CheckIcon className="size-12" /> : status === 'error' ? <AlertIcon className="size-10" /> : <ClockIcon className="size-10" />}
        </div>
        <h1 className="mt-6 text-[27px] leading-tight font-bold tracking-tight md:text-[34px]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/85 md:text-muted">{description}</p>
        {orderId && status !== 'paid' ? <p className="mt-3 text-xs break-all text-white/75 md:text-muted">Order reference {orderId}</p> : null}
        <div className="mt-7 grid gap-3">
          {status === 'paid' ? <Button variant="accent" href={viewTicketHref}>View Ticket</Button> : null}
          {status === 'pending' ? <Button onClick={() => window.location.reload()}>Check Payment</Button> : null}
          <a href={eventsHref} className="inline-flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold hover:underline md:text-forest">Back to Events</a>
        </div>
      </section>
    </div>
  )
}
