import { SuccessHero } from '../components/ticket'

type PaymentSuccessScreenProps = {
  viewTicketHref: string
  eventsHref: string
}

export function PaymentSuccessScreen({ viewTicketHref, eventsHref }: PaymentSuccessScreenProps) {
  return <SuccessHero viewTicketHref={viewTicketHref} backToEventsHref={eventsHref} />
}
