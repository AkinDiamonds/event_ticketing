import type { ComponentType } from 'react'
import { useRouter } from '../router'
import { BackIcon, LogoMark, MenuIcon, ShareIcon } from './icons'
import { cn } from '../lib/cn'

type TopBarProps = {
  title?: string
  subtitle?: string
  variant?: 'default' | 'dark'
  backHref?: string
  shareHref?: string
  menuHref?: string
}

export function TopBar({
  title,
  subtitle,
  variant = 'default',
  backHref,
  shareHref,
  menuHref,
}: TopBarProps) {
  const { navigate } = useRouter()
  const tone = variant === 'dark' ? 'text-white' : 'text-[#101010]'
  const iconTone = variant === 'dark' ? 'text-white/90' : 'text-[#1b1b1b]'

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 pt-4',
        tone,
      )}
    >
      <div className="flex items-center gap-3">
        {backHref ? (
          <a
            href={backHref}
            aria-label="Go back"
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return
              }
              event.preventDefault()
              navigate(backHref)
            }}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-black/5"
          >
            <BackIcon className={cn('h-5 w-5', iconTone)} />
          </a>
        ) : (
          <LogoMark className="h-8 w-8" />
        )}
        <div>
          {title ? (
            <>
              <p className="text-[17px] font-semibold leading-none">{title}</p>
              {subtitle ? (
                <p className={cn('mt-1 text-[11px]', variant === 'dark' ? 'text-white/72' : 'text-[#6e6a63]')}>
                  {subtitle}
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[12px] font-bold tracking-[0.14em]">LASU EVENTS</p>
                <p className={cn('text-[11px]', variant === 'dark' ? 'text-white/68' : 'text-[#6d6a63]')}>
                  Event ticketing made simple
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {shareHref ? (
          <a
            href={shareHref}
            aria-label="Share"
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return
              }
              event.preventDefault()
              navigate(shareHref)
            }}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-black/5"
          >
            <ShareIcon className={cn('h-5 w-5', iconTone)} />
          </a>
        ) : null}
        {menuHref ? (
          <a
            href={menuHref}
            aria-label="Menu"
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return
              }
              event.preventDefault()
              navigate(menuHref)
            }}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-black/5"
          >
            <MenuIcon className={cn('h-5 w-5', iconTone)} />
          </a>
        ) : null}
      </div>
    </div>
  )
}

type BottomNavItem = {
  label: string
  icon: ComponentType<{ className?: string }>
  href: string
  active?: boolean
}

type BottomNavProps = {
  items: BottomNavItem[]
}

export function BottomNav({ items }: BottomNavProps) {
  const { pathname, navigate } = useRouter()

  return (
    <div className="border-t border-[#ece8df] bg-white px-2 py-2">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.active ?? pathname === item.href
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return
                }
                event.preventDefault()
                navigate(item.href)
              }}
              className={cn(
                'flex flex-col items-center gap-1 rounded-[10px] px-2 py-2 text-[11px] font-medium transition',
                active
                  ? 'text-[#d89b00]'
                  : 'text-[#7c776f] hover:bg-[#f7f4ee]',
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-[#d89b00]' : 'text-current')} />
              <span>{item.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
