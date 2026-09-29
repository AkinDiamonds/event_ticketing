import type { ComponentType } from 'react'
import { useState } from 'react'
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
  homeRef?: string
}

export function TopBar({
  title,
  subtitle,
  variant = 'default',
  backHref,
  shareHref,
  menuHref,
  homeRef
}: TopBarProps) {
  const { navigate } = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const tone = variant === 'dark' ? 'text-white' : 'text-[#101010]'
  const iconTone = variant === 'dark' ? 'text-white/90' : 'text-[#1b1b1b]'
  const menuLinks = [
    { label: 'Browse events', href: '/tickets' },
    { label: 'My tickets', href: '/my-ticket' },
    { label: 'My orders', href: '/orders' },
    { label: 'Profile', href: '/profile' },
  ]

  return (
    <div
      className={cn(
        'relative z-30 flex items-center justify-between px-4 pt-4',
        variant === 'dark' && 'bg-[#092619] pb-3',
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
          <a href={homeRef}>
            <LogoMark className="h-8 w-8" />
          </a>
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
          <div className="relative">
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-black/5"
            >
              {menuOpen ? <span className={cn('text-2xl leading-none', iconTone)}>×</span> : <MenuIcon className={cn('h-5 w-5', iconTone)} />}
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-[#e7ece8] bg-white p-2 text-[#17231b] shadow-[0_18px_50px_rgba(10,35,20,.18)]">
                <nav aria-label="Main menu" className="space-y-0.5">
                  {menuLinks.map((link) => (
                    <button
                      key={link.href}
                      type="button"
                      onClick={() => { setMenuOpen(false); navigate(link.href) }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition hover:bg-[#f1f7f3]"
                    >
                      {link.label}
                    </button>
                  ))}
                </nav>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#edf0ed] pt-2">
                  <button type="button" onClick={() => { setMenuOpen(false); navigate('/login') }} className="rounded-lg border border-[#c9ddcf] px-2 py-2 text-[12px] font-semibold text-[#006b37] hover:bg-[#f1f7f3]">Log in</button>
                  <button type="button" onClick={() => { setMenuOpen(false); navigate('/register') }} className="rounded-lg bg-[#006b37] px-2 py-2 text-[12px] font-semibold text-white hover:bg-[#00572d]">Sign up</button>
                </div>
              </div>
            ) : null}
          </div>
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
    <div className="border-t border-[#ece8df] bg-white px-2 py-2 md:hidden">
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
