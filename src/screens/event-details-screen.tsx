import { CardInset } from '../components/card'
import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { CalendarIcon, ClockIcon, LocationIcon } from '../components/icons'
import { EventBanner, TicketOption } from '../components/ticket'

type EventDetailsScreenProps = {
  backHref: string
  continueHref: string
}

export function EventDetailsScreen({ backHref, continueHref }: EventDetailsScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar backHref={backHref} homeRef='/'/>
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 md:px-8 lg:mx-auto lg:grid lg:w-full lg:max-w-[1280px] lg:grid-cols-[1.1fr_.9fr] lg:items-start lg:gap-10 lg:px-0 lg:pt-8">
        <div>
        <EventBanner
          title="TECH SUMMIT 2026"
          subtitle="The biggest gathering of tech enthusiasts, innovators and industry leaders."
        />
        <h2 className="mt-4 text-[18px] font-bold text-[#171717]">Tech Summit 2026</h2>
        <p className="mt-2 text-[13px] leading-6 text-[#6f695f]">
          The biggest gathering of tech enthusiasts, innovators and industry leaders.
        </p>

        <div className="mt-4 space-y-2 text-[12px] text-[#4b4b4b]">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-[#8e877a]" />
            <span>Oct 24, 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-[#8e877a]" />
            <span>09:00 AM</span>
          </div>
          <div className="flex items-center gap-2">
            <LocationIcon className="h-4 w-4 text-[#8e877a]" />
            <span>Main Auditorium, LASU</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {['20+ Speakers', '15+ Sessions', '1000+ Attendees'].map((item) => (
            <CardInset key={item} className="text-center">
              <p className="text-[13px] font-bold text-[#1a1a1a]">{item}</p>
            </CardInset>
          ))}
        </div>
        </div>

        <section className="mt-7 rounded-[26px] border border-[#e9eee9] bg-white p-4 shadow-[0_18px_55px_rgba(18,50,31,.05)] lg:sticky lg:top-8 lg:mt-0 lg:p-6">
        <div>
          <h3 className="text-[15px] font-bold text-[#141414]">Choose Your Ticket</h3>
          <p className="mt-1 text-[12px] text-[#7e776d]">Select a ticket type to continue</p>
        </div>

        <div className="mt-4 space-y-3">
          <TicketOption
            title="Early Bird"
            subtitle="Limited offer"
            price="NGN 3,000"
            availability="Available: 150"
            accent="green"
            selected
          />
          <TicketOption
            title="Regular"
            subtitle="Standard access"
            price="NGN 5,000"
            availability="Available: 500"
          />
        </div>

        <div className="mt-4">
          <Button className="w-full" href={continueHref}>
            Select Ticket
          </Button>
        </div>
        </section>
      </div>
    </div>
  )
}
