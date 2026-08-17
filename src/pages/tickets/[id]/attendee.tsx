import { AttendeeScreen } from '../../../screens/attendee-screen'

type Props = {
  params: Record<string, string>
}

export default function TicketAttendeePage({ params }: Props) {
  const id = params.id

  return (
    <AttendeeScreen
      backHref={`/tickets/${id}/select`}
      continueHref={`/tickets/${id}/payment`}
    />
  )
}
