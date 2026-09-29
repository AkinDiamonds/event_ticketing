import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { TicketCard } from '../components/ticket'

type MyTicketScreenProps = {
  backHref: string
  ordersHref: string
}

export function MyTicketScreen({ backHref, ordersHref }: MyTicketScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <TopBar title="My Ticket" backHref={backHref} homeRef='/' />
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-8 lg:mx-auto lg:w-full lg:max-w-[1040px] lg:px-0 lg:pt-8">
        <TicketCard
          title="TECH SUMMIT 2026"
          attendee="John Doe"
          ticketType="Early Bird"
          date="Oct 24, 2026"
          time="09:00 AM"
          venue="Main Auditorium, LASU"
        />
        <div className="mx-auto mt-5 max-w-[760px]">
          <Button variant="secondary" className="w-full" href={ordersHref}>
            View Orders
          </Button>
        </div>
      </div>
    </div>
  )
}
