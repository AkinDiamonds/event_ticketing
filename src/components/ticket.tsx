import type { ComponentType } from 'react'
import { useRouter } from '../router'
import { Card, DarkPanel } from './card'
import {
  CheckIcon,
  DownloadIcon,
  QrIcon,
  ShareStrokeIcon,
} from './icons'
import { Button } from './button'
import { cn } from '../lib/cn'

type TicketOptionProps = {
  title: string
  subtitle: string
  price: string
  availability: string
  accent?: 'green' | 'gold'
  selected?: boolean
}

export function TicketOption({
  title,
  subtitle,
  price,
  availability,
  accent = 'green',
  selected = false,
}: TicketOptionProps) {
  return (
    <Card
      className={cn(
        'relative px-4 py-4',
        selected && 'border-[#2f7a4d] bg-[#fbfdf9] shadow-[0_10px_30px_rgba(39,104,63,0.12)]',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-[4px] rounded-l-[24px]',
          accent === 'green' ? 'bg-[#1f6b42]' : 'bg-[#f2bf20]',
        )}
      />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1b1b1b]">
            {title}
          </p>
          <p className="mt-1 text-[12px] text-[#827c72]">{subtitle}</p>
          <p className="mt-3 text-[18px] font-extrabold text-[#1b1b1b]">{price}</p>
          <p className="mt-1 text-[12px] text-[#7d776c]">{availability}</p>
        </div>
        <div className={cn('grid h-6 w-6 place-items-center rounded-full border', selected ? 'border-[#1f6b42] bg-[#1f6b42] text-white' : 'border-[#cfc8bc] bg-white text-transparent')}>
          <CheckIcon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  )
}

type HeroBannerProps = {
  title: string
  subtitle?: string
}

export function EventBanner({ title, subtitle }: HeroBannerProps) {
  return (
    <DarkPanel className="h-[164px] p-[1rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(49,160,96,0.35),transparent_22%),radial-gradient(circle_at_0%_100%,rgba(242,191,32,0.2),transparent_28%),linear-gradient(135deg,#07150f_0%,#0a2516_55%,#092012_100%)]" />
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(49,160,96,0.7)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="space-y-2">
          
          <h3 className="max-w-[8ch] text-[28px] font-black leading-[0.94] tracking-[-0.04em]">
            {title}
          </h3>
        </div>
        {subtitle ? (
          <p className="max-w-[18ch] text-[12px] leading-4 mt-2 text-white/76">{subtitle}</p>
        ) : null}
      </div>
    </DarkPanel>
  )
}

type TicketCardProps = {
  title: string
  attendee: string
  ticketType: string
  date: string
  time: string
  venue: string
}

export function TicketCard({
  title,
  attendee,
  ticketType,
  date,
  time,
  venue,
}: TicketCardProps) {
  return (
    <Card className="relative bg-white w-[18rem] mx-auto">
      <div className="rounded-full absolute left-[-1.2rem] w-8 h-8 bg-white  top-[6rem]   z-[9999]"></div>
      <div className="rounded-full absolute left-[-1.4rem] w-8 h-8 bg-white  top-[9.2rem]   z-[9999]"></div>

      <div className="rounded-full absolute right-[-1.2rem] w-8 h-8 bg-white  top-[6rem]   z-[9999]"></div>
      <div className="rounded-full absolute right-[-1.4rem] w-8 h-8 bg-white  top-[9.2rem]   z-[9999]"></div>

      <EventBanner title={title} subtitle="Your digital ticket is ready for entry." />
      <div className="px-4 py-4">
        <div className="grid grid-cols-[1fr] gap-3">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#938a7d]">
                Attendee
              </p>
              <p className="mt-1 text-[14px] font-bold text-[#1a1a1a]">{attendee}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#938a7d]">
                Ticket type
              </p>
              <p className="mt-1 text-[14px] font-bold text-[#1a1a1a]">{ticketType}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#938a7d]">
                  Date
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#1a1a1a]">{date}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#938a7d]">
                  Time
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#1a1a1a]">{time}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#938a7d]">
                Venue
              </p>
              <p className="mt-1 text-[13px] font-semibold text-[#1a1a1a]">{venue}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-[#ece6db] bg-[#fbfbf8] p-3">
            <QrIcon className="h-26 w-26 text-[#1c382a]" />
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#9a9285]">
              Ticket ID
            </p>
            <p className="text-[11px] font-semibold text-[#1b1b1b]">LASU-2026-EB-00481</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1">
            <DownloadIcon className="h-4 w-4" />
            Download
          </Button>
          <Button variant="secondary" className="flex-1">
            <ShareStrokeIcon className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </Card>
  )
}

type SuccessHeroProps = {
  viewTicketHref: string
  backToEventsHref: string
}

export function SuccessHero({ viewTicketHref, backToEventsHref }: SuccessHeroProps) {
  const { navigate } = useRouter()

  return (
    <DarkPanel className="min-h-[560px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(29,137,74,0.28),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(242,191,32,0.12),transparent_36%),linear-gradient(180deg,#06120d_0%,#0a2516_48%,#07120d_100%)]" />
      <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="relative flex min-h-[560px] flex-col items-center justify-center px-5 py-12 text-center">
        <div className="grid h-22 w-22 place-items-center rounded-full bg-white/95 shadow-[0_18px_30px_rgba(0,0,0,0.18)]">
          <CheckIcon className="h-11 w-11 text-[#1f6b42]" />
        </div>
        <h3 className="mt-8 text-[26px] font-black leading-tight">Payment Successful!</h3>
        <p className="mt-3 max-w-[20ch] text-[14px] leading-6 text-white/82">
          Your ticket has been generated and sent to your email.
        </p>
        <p className="mt-8 text-[13px] text-white/86">What would you like to do next?</p>
        <div className="mt-5 w-full space-y-3">
          <Button variant="accent" className="w-full" href={viewTicketHref}>
            View Ticket
          </Button>
          <Button variant="primary" className="w-full" href={backToEventsHref}>
            Download Ticket
          </Button>
          <button
            type="button"
            onClick={() => navigate(backToEventsHref)}
            className="w-full rounded-[10px] px-4 py-3 text-[13px] font-semibold text-white/90"
          >
            Back to Events
          </button>
        </div>
      </div>
    </DarkPanel>
  )
}

type FeatureNoteProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

export function FooterNote({ icon: Icon, title, description }: FeatureNoteProps) {
  return (
    <div className="rounded-[22px] border border-[#eadfbd] bg-[#fffdf7] px-4 py-4 shadow-[0_12px_30px_rgba(162,119,0,0.06)]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#163b27] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#1b1b1b]">{title}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#766e63]">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
