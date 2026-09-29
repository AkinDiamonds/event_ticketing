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
            'h-[132px] p-4 text-white md:h-[180px] md:p-5 xl:h-[210px] xl:p-6',
            accent === 'green'
              ? 'bg-[radial-gradient(circle_at_80%_12%,rgba(34,197,94,0.24),transparent_18%),linear-gradient(135deg,#08120d_0%,#081c11_60%,#111111_100%)]'
              : 'bg-[radial-gradient(circle_at_84%_18%,rgba(246,193,38,0.28),transparent_18%),linear-gradient(135deg,#060705_0%,#16110a_60%,#090807_100%)]',
          ].join(' ')}
        >
          <div className="flex h-full items-end justify-between gap-3">
            <p className="max-w-[8ch] text-[27px] font-black leading-[0.92] tracking-[-0.04em] md:max-w-[10ch] md:text-[34px] xl:text-[40px]">
              {title}
            </p>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#101010] shadow-sm">
              <span className="text-[20px]">→</span>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4 md:px-5 md:py-5">
          <p className="text-[15px] font-semibold text-[#202020] md:text-[17px]">{title}</p>
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
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7] lg:bg-[#f4f7f3]">
      <TopBar menuHref={tabs.profile} homeRef='/' />

      <div className="px-4 pb-4 pt-3 md:mx-8 md:mt-7 md:rounded-[26px] md:bg-[#e8f4ec] md:px-8 md:py-8 md:shadow-[0_16px_42px_rgba(18,70,38,.06)] lg:hidden">
        <p className="mb-3 hidden text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#19804a] md:block">Campus life, unlocked</p>
        <h1 className="text-[28px] font-black leading-[1.08] tracking-[-0.04em] text-[#101010] md:max-w-[18ch] md:text-[38px]">
          Discover Amazing Events at LASU
        </h1>
        <p className="mt-3 max-w-[36ch] text-[14px] leading-6 text-[#6e6961] md:text-[16px]">
          Great moments. One ticket away.
        </p>
      </div>

      <div className="px-4 md:px-8 lg:hidden">
        <SearchField placeholder="Search events..." />
      </div>

      <section className="relative mx-14 mt-9 hidden overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_82%_18%,rgba(27,182,94,.3),transparent_24%),linear-gradient(120deg,#092619,#0d3824_65%,#0a2418)] px-12 py-10 text-white shadow-[0_24px_70px_rgba(10,49,29,.16)] lg:grid lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:gap-12 xl:px-16 xl:py-14">
        <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#81dfa4]">Campus life, unlocked</p>
          <h1 className="mt-5 max-w-[12ch] text-[52px] font-black leading-[0.98] tracking-[-0.055em] xl:text-[64px]">Make room for a good story.</h1>
          <p className="mt-5 max-w-[42ch] text-[15px] leading-7 text-white/70">Find the talks, sounds, and campus moments you’ll still be talking about next week.</p>
          <div className="mt-8 flex items-center gap-3">
            <a href="/tickets" className="rounded-full bg-[#11a653] px-6 py-3 text-[13px] font-bold text-white shadow-lg shadow-black/15 transition hover:bg-[#18b75f]">Explore events <span aria-hidden="true">→</span></a>
            <span className="text-[12px] text-white/55">Discover. Book. Be there.</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[400px] py-3">
          <div className="absolute inset-4 rotate-[-7deg] rounded-[28px] border border-[#7fe0a4]/20 bg-[#ffffff08]" />
          <div className="relative rounded-[26px] border border-white/12 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#8adca8]">Coming up</p><p className="mt-1 text-[17px] font-bold">Your next great night</p></div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d8f7e2] text-lg text-[#086b38]">✦</span>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-2xl bg-[#061a10]/55 p-3">
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#0e6335] text-center"><span className="text-[9px] font-bold uppercase tracking-wider text-white/70">Oct</span><span className="text-[20px] font-black">24</span></div>
              <div><p className="text-[14px] font-bold">Tech Summit 2026</p><p className="mt-1 text-[11px] text-white/55">Main Auditorium · 9:00 AM</p></div>
            </div>
            <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-white/55"><span>Tickets from</span><span className="font-bold text-[#9df0b9]">₦3,000</span></div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-[#21bd69]" /></div>
            <p className="mt-2 text-right text-[10px] text-white/45">A few early bird tickets left</p>
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between px-4 pt-6 md:px-8 md:pt-8 lg:px-14 lg:pt-10">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#17834a] lg:hidden">On campus</p><h2 className="mt-1 text-[14px] font-bold text-[#111111] md:text-[20px]">Popular Events</h2></div>
        <a href="/tickets" className="text-[12px] font-semibold text-[#2f6f45]">
          See all
        </a>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 pb-6 pt-3 md:grid-cols-2 md:gap-5 md:px-8 lg:grid-cols-2 lg:gap-6 lg:px-14 xl:grid-cols-3">
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
        <EventPreview
          title="Entrepreneurship Conference"
          date="Nov 28, 2026"
          venue="Innovation Hub"
          price="NGN 12,000"
          accent="green"
          href="/tickets/entrepreneurship-conference"
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
