import { Card } from '../../components/card'
import { BottomNav, TopBar } from '../../components/navbar'
import { CalendarIcon, HomeIcon, LocationIcon, OrdersIcon, ProfileIcon, TicketsIcon } from '../../components/icons'

function TicketListCard({
  title,
  date,
  venue,
  price,
  href,
}: {
  title: string
  date: string
  venue: string
  price: string
  href: string
}) {
  return (
    <Card className="overflow-hidden">
      <a href={href} className="block">
        <div className="bg-[linear-gradient(135deg,#0a1510,#112418)] px-4 py-4 text-white">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Event
          </p>
          <h3 className="mt-2 text-[22px] font-black leading-[0.96] tracking-[-0.04em]">
            {title}
          </h3>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-2 text-[12px] text-[#6f6860]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#8c8579]" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <LocationIcon className="h-4 w-4 text-[#8c8579]" />
              <span>{venue}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[14px] text-[#1d1d1d]">
              From <span className="font-bold text-[#1f6b42]">{price}</span>
            </p>
            <span className="inline-flex h-9 items-center rounded-[10px] bg-[#ffbf1f] px-4 text-sm font-semibold text-[#241800] shadow-[0_10px_24px_rgba(255,191,31,0.18)]">
              Open
            </span>
          </div>
        </div>
      </a>
    </Card>
  )
}

export default function TicketsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7] lg:bg-[#f4f7f3]">
      <TopBar title="Tickets" subtitle="Browse upcoming events" homeRef='/'/>
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-8 lg:px-14 lg:pt-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6">
          <TicketListCard
            title="Tech Summit 2026"
            date="Oct 24, 2026"
            venue="Main Auditorium"
            price="NGN 3,000"
            href="/tickets/tech-summit-2026"
          />
          <TicketListCard
            title="Freshers' Welcome Week"
            date="Nov 10, 2026"
            venue="Student Arena"
            price="NGN 2,500"
            href="/tickets/freshers-welcome-week"
          />
          <TicketListCard
            title="Entrepreneurship Conference"
            date="Nov 28, 2026"
            venue="Innovation Hub"
            price="NGN 12,000"
            href="/tickets/entrepreneurship-conference"
          />
        </div>
      </div>

      <BottomNav
        items={[
          { label: 'Home', icon: HomeIcon, href: '/' },
          { label: 'Tickets', icon: TicketsIcon, href: '/tickets', active: true },
          { label: 'Orders', icon: OrdersIcon, href: '/orders' },
          { label: 'Profile', icon: ProfileIcon, href: '/profile' },
        ]}
      />
    </div>
  )
}
