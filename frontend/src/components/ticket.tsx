import { CheckIcon } from './icons'
import { cn } from '../lib/cn'
import { formatPrice } from '../lib/format-event'
import type { EventTier } from '../lib/events-api'
import { ticketsRemaining } from '../lib/ticket-types'
import poster from '../assets/event-poster.webp'

export function TicketOption({ tier, tone, selected = false }: { tier: EventTier; tone?: 'green' | 'gold'; selected?: boolean }) {
  const remaining = ticketsRemaining(tier)
  return (
    <span className={cn(
      'relative flex h-full items-start justify-between gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left md:justify-center md:px-5 md:py-5 md:text-center',
      selected ? 'border-forest bg-mint' : tone === 'gold' ? 'border-[#e7c36a] bg-white' : 'border-line bg-white',
    )}>
      {selected || tone === 'gold' ? <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px] md:hidden', selected ? 'bg-forest' : 'bg-amber')} /> : null}
      <span className="min-w-0">
        <span className="block text-[14px] leading-tight font-bold uppercase tracking-tight">{tier.name}</span>
        {tier.description ? <span className="mt-1 block text-xs leading-4 text-muted">{tier.description}</span> : null}
        <span className={cn('mt-1.5 block text-[23px] leading-tight font-bold tracking-tight tabular-nums', selected && 'text-forest')}>{formatPrice(tier.price)}</span>
        <span className="mt-1 block text-xs leading-4 text-muted">{remaining > 0 ? 'Available: ' + remaining.toLocaleString() : 'Sold out'}</span>
      </span>
      <span aria-hidden="true" className={cn('grid size-6 shrink-0 place-items-center rounded-full border md:absolute md:right-3 md:bottom-3 md:size-5', selected ? 'border-forest bg-forest text-white' : 'border-[#cbd3cd]')}>
        {selected ? <CheckIcon className="size-3.5" /> : null}
      </span>
    </span>
  )
}

export function EventBanner({ title, imageUrl, tone = 'green', className }: { title: string; imageUrl?: string; tone?: 'green' | 'gold' | 'red'; className?: string }) {
  const titleYear = title.match(/^(.*)\s+(\d{4})$/)
  return (
    <div aria-hidden="true" className={cn('relative isolate flex items-center overflow-hidden bg-[#03170e] text-white', className)}>
      <img src={poster} alt="" className={cn('absolute inset-0 -z-20 size-full object-cover', !imageUrl && tone === 'gold' && 'hue-rotate-[-58deg]', !imageUrl && tone === 'red' && 'hue-rotate-[-125deg]')} />
      {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 -z-10 size-full object-cover" onError={(event) => { event.currentTarget.hidden = true }} /> : null}
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/60 via-black/25 to-transparent" />
      <div className="max-w-[16ch] text-[clamp(1.45rem,7vw,2.4rem)] leading-[.98] font-extrabold tracking-[-.045em] uppercase drop-shadow-md">
        <span className="line-clamp-3">{titleYear?.[1] ?? title}</span>
        {titleYear ? <span className={cn('mt-1 block', tone === 'gold' ? 'text-[#ffda64]' : 'text-[#99da77]')}>{titleYear[2]}</span> : null}
      </div>
    </div>
  )
}
