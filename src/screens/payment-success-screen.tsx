import { SuccessHero } from '../components/ticket'

type PaymentSuccessScreenProps = {
  viewTicketHref: string
  eventsHref: string
}

export function PaymentSuccessScreen({ viewTicketHref, eventsHref }: PaymentSuccessScreenProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f3f6f2] p-4 md:p-10 lg:p-14">
      <div className="w-full max-w-[520px] lg:max-w-[640px]">
        <SuccessHero viewTicketHref={viewTicketHref} backToEventsHref={eventsHref} />
      </div>
    </div>
  )
}
