import { Card } from '../components/card'
import { BottomNav, TopBar } from '../components/navbar'
import { CalendarIcon, HomeIcon, LocationIcon, OrdersIcon, ProfileIcon, TicketsIcon } from '../components/icons'
import { SearchField } from '../components/form'

function EventPreview({
  title,
  date,
  venue,
  price,
  accent,
  href,
}: {
  title: string
  date: string
  venue: string
  price: string
  accent: 'green' | 'gold'
  href: string
}) {
  return (
    <Card className="overflow-hidden">
      <a href={href} className="block w-full text-left">
        <div
          className={[
            'h-[132px] p-4 text-white',
            accent === 'green'
              ? 'bg-[radial-gradient(circle_at_80%_12%,rgba(34,197,94,0.24),transparent_18%),linear-gradient(135deg,#08120d_0%,#081c11_60%,#111111_100%)]'
              : 'bg-[radial-gradient(circle_at_84%_18%,rgba(246,193,38,0.28),transparent_18%),linear-gradient(135deg,#060705_0%,#16110a_60%,#090807_100%)]',
          ].join(' ')}
        >
          <div className="flex h-full items-end justify-between gap-3">
            <p className="max-w-[8ch] text-[27px] font-black leading-[0.92] tracking-[-0.04em]">
              {title}
            </p>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#101010] shadow-sm">
              <span className="text-[20px]">→</span>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <p className="text-[15px] font-semibold text-[#202020]">{title}</p>
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
          <div className="flex items-end justify-between">
            <p className="text-[14px] text-[#1d1d1d]">
              From <span className="font-bold text-[#1f6b42]">{price}</span>
            </p>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2bf20] text-[#191100] shadow-[0_8px_16px_rgba(242,191,32,0.2)]">
              →
            </span>
          </div>
        </div>
      </a>
    </Card>
  )
}

type HomeScreenProps = {
  tabs: {
    home: string
    tickets: string
    orders: string
    profile: string
  }
}

export function HomeScreen({ tabs }: HomeScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar menuHref={tabs.profile} homeRef='/' />

      <div className="px-4 pb-4 pt-3">
        <h1 className="text-[28px] font-black leading-[1.08] tracking-[-0.04em] text-[#101010]">
          Discover Amazing Events at LASU
        </h1>
        <p className="mt-3 max-w-[22ch] text-[14px] leading-6 text-[#6e6961]">
          Great moments. One ticket away.
        </p>
      </div>

      <div className="px-4">
        <SearchField placeholder="Search events..." />
      </div>

      <div className="flex items-center justify-between px-4 pt-6">
        <h2 className="text-[14px] font-bold text-[#111111]">Popular Events</h2>
        <a href="/tickets" className="text-[12px] font-semibold text-[#2f6f45]">
          See all
        </a>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-3">
        <EventPreview
          title="Tech Summit 2026"
          date="Oct 24, 2026"
          venue="Main Auditorium"
          price="NGN 3,000"
          accent="green"
          href="/tickets/tech-summit-2026"
        />
        <EventPreview
          title="Freshers' Welcome Week"
          date="Nov 10, 2026"
          venue="Student Arena"
          price="NGN 2,500"
          accent="gold"
          href="/tickets/freshers-welcome-week"
        />
      </div>

      <BottomNav
        items={[
          { label: 'Home', icon: HomeIcon, href: tabs.home, active: true },
          { label: 'Tickets', icon: TicketsIcon, href: tabs.tickets },
          { label: 'Orders', icon: OrdersIcon, href: tabs.orders },
          { label: 'Profile', icon: ProfileIcon, href: tabs.profile },
        ]}
      />
    </div>
  )
}
