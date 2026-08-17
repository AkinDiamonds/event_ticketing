import { EventDetailsScreen } from '../../screens/event-details-screen'

type Props = {
  params: Record<string, string>
}

export default function TicketDetailPage({ params }: Props) {
  const id = params.id

  return (
    <EventDetailsScreen
      backHref="/tickets"
      continueHref={`/tickets/${id}/select`}
    />
  )
}
