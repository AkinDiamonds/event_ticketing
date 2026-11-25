import { cn } from '../lib/cn'
import { CheckIcon, MinusIcon, PlusIcon, SearchIcon, UserIcon } from './icons'

export function SearchField({ value, onChange, desktopButton = false }: { value: string; onChange: (value: string) => void; desktopButton?: boolean }) {
  return (
    <div className={cn('flex gap-2', desktopButton && 'max-w-[460px]')}>
      <label className="flex min-h-12 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3.5 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
        <input aria-label="Search events" type="search" value={value} onChange={(event) => onChange(event.target.value)}
          placeholder="Search events or venues…" className="min-w-0 flex-1 text-base outline-none placeholder:text-muted focus-visible:outline-none md:text-sm" />
        <SearchIcon className={cn('size-5 shrink-0', desktopButton && 'md:hidden')} />
      </label>
      {desktopButton ? <a href="#event-list" aria-label="Go to search results" className="hidden size-12 shrink-0 place-items-center rounded-lg bg-forest text-white hover:bg-forest-dark md:grid"><SearchIcon className="size-5" /></a> : null}
    </div>
  )
}

export function QuantityControl({ value, min = 1, max = 10, onChange }: { value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-[44px_1fr_44px] items-center rounded-lg border border-line bg-white text-center md:w-40">
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid size-11 place-items-center rounded-l-lg border-r border-line hover:bg-mint disabled:opacity-40"><MinusIcon className="size-4" /></button>
      <output aria-label="Quantity" className="text-sm font-semibold tabular-nums">{value}</output>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="grid size-11 place-items-center rounded-r-lg border-l border-line hover:bg-mint disabled:opacity-40"><PlusIcon className="size-4" /></button>
    </div>
  )
}

export function Stepper({ items }: { items: { label: string; active?: boolean; complete?: boolean }[] }) {
  return (
    <ol aria-label="Checkout progress" className="grid grid-flow-col auto-cols-fr gap-2">
      {items.map((item, index) => (
        <li key={item.label} aria-current={item.active ? 'step' : undefined} className="relative flex flex-col items-center gap-2 text-center">
          {index > 0 ? <span aria-hidden="true" className={cn('absolute top-[17px] right-[calc(50%+23px)] left-[calc(-50%+15px)] h-px', items[index - 1].complete ? 'bg-forest' : 'bg-line')} /> : null}
          <span aria-hidden="true" className={cn('grid size-9 place-items-center rounded-full border text-xs font-semibold', item.complete ? 'border-forest bg-forest text-white' : item.active ? 'border-amber bg-amber text-ink md:border-forest md:bg-forest md:text-white' : 'border-line bg-white text-muted')}>
            {item.complete ? <CheckIcon className="size-5" /> : item.active ? <UserIcon className="size-[18px]" /> : index + 1}
          </span>
          <span className={cn('text-xs font-medium', !item.complete && !item.active && 'text-muted')}>{item.label}</span>
        </li>
      ))}
    </ol>
  )
}
