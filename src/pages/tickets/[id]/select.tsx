import { TicketSelectionScreen } from '../../../screens/ticket-selection-screen'

type Props = {
  params: Record<string, string>
}

export default function TicketSelectPage({ params }: Props) {
  const id = params.id

  return (
    <TicketSelectionScreen
      backHref={`/tickets/${id}`}
      continueHref={`/tickets/${id}/attendee`}
    />
  )
}
