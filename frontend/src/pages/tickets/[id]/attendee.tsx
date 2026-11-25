import { AttendeeScreen } from '../../../screens/attendee-screen'
import { readCheckoutDraft, saveCheckoutDraft, type AttendeeDetails } from '../../../lib/checkout-state'
import { useState } from 'react'
import { useRouter } from '../../../router'

type Props = {
  params: Record<string, string>
}

export default function TicketAttendeePage({ params }: Props) {
  const id = params.id
  const { navigate } = useRouter()
  const draft = readCheckoutDraft()
  const [attendee, setAttendee] = useState<AttendeeDetails>((draft?.event.id === id ? draft.attendee : undefined) ?? { firstName: '', lastName: '', email: localStorage.getItem('lasu_profile_email') || '', phone: '', organization: '', department: '' })
  function submit() {
    if (!draft || draft.event.id !== id) return
    saveCheckoutDraft({ ...draft, attendee })
    navigate(`/tickets/${encodeURIComponent(id)}/payment`)
  }

  return (
    <AttendeeScreen
      backHref={`/tickets/${encodeURIComponent(id)}`}
      attendee={attendee}
      onChange={(key, value) => setAttendee((current) => ({ ...current, [key]: value }))}
      onContinue={submit}
      unavailable={draft?.event.id !== id}
    />
  )
}
