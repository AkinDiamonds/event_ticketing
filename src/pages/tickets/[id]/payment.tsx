import { PaymentScreen } from '../../../screens/payment-screen'

type Props = {
  params: Record<string, string>
}

export default function TicketPaymentPage({ params }: Props) {
  const id = params.id

  return (
    <PaymentScreen
      backHref={`/tickets/${id}/attendee`}
      payHref={`/tickets/${id}/success`}
    />
  )
}
