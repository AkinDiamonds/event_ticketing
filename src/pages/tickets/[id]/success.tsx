import { PaymentSuccessScreen } from '../../../screens/payment-success-screen'

type Props = {
  params: Record<string, string>
}

export default function TicketSuccessPage({ params }: Props) {
  const id = params.id

  return (
    <PaymentSuccessScreen
      eventsHref="/tickets"
      viewTicketHref={`/tickets/${id}/ticket`}
    />
  )
}
