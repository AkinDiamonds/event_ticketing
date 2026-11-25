import { useState, type ComponentType } from 'react'
import { useRouter } from '../router'
import { BackIcon, CloseIcon, HomeIcon, LogoMark, MenuIcon, OrdersIcon, ProfileIcon, ShareIcon, TicketsIcon } from './icons'
import { cn } from '../lib/cn'

type TopBarProps = {
  title?: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  shareHref?: string
  menu?: boolean
  organizer?: boolean
  narrow?: boolean
}

const navigation = [
  { label: 'Home', href: '/', icon: HomeIcon },
  { label: 'Tickets', href: '/tickets', icon: TicketsIcon },
  { label: 'Orders', href: '/orders', icon: OrdersIcon },
  { label: 'Profile', href: '/profile', icon: ProfileIcon },
] satisfies { label: string; href: string; icon: ComponentType<{ className?: string }> }[]

export function TopBar({ title, subtitle, backHref, backLabel, shareHref, menu, organizer, narrow }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')
  const authenticated = Boolean(localStorage.getItem('lasu_access_token'))
  const iconButton = 'grid size-11 place-items-center rounded-lg hover:bg-black/5'
  const showControls = Boolean(backHref || menu || shareHref || organizer)

  async function share() {
    const url = new URL(shareHref || window.location.href, window.location.origin).href
    try {
      if (navigator.share) {
        await navigator.share({ url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareFeedback('Link copied')
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setShareFeedback('Could not share link')
    }
  }

  return (
    <header className={cn('no-print', organizer && 'bg-forest-dark text-white lg:hidden')}>
      {showControls ? (
        <div className={cn('relative z-10 flex min-h-[62px] items-center justify-between gap-2', narrow ? 'flow-width' : 'page-width', menu && !organizer && 'md:hidden')}>
          {backHref ? (
            <a href={backHref} aria-label={backLabel || 'Go back'} className="-ml-2 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-black/5">
              <BackIcon className="size-5" />
              {backLabel}
            </a>
          ) : (
            <a href={organizer ? '/admin/events' : '/'} className="flex min-h-11 items-center gap-2 font-bold">
              <LogoMark className="size-7" /> Event Tickets
              {organizer ? <span className="text-xs font-medium text-green-200">Organizer</span> : null}
            </a>
          )}
          <div className="flex items-center gap-2">
            {shareHref ? <button type="button" onClick={() => void share()} aria-label="Share" className={iconButton}><ShareIcon className="size-5" /></button> : null}
            {menu ? (
              <button type="button" className={iconButton} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="screen-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
                {menuOpen ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
              </button>
            ) : null}
          </div>
          {shareFeedback ? <p role="status" className="absolute right-5 top-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm">{shareFeedback}</p> : null}
          {menuOpen ? (
            <nav id="screen-menu" aria-label="Main menu" className="absolute top-full right-5 z-20 grid w-52 rounded-xl border border-line bg-white p-2 text-sm font-medium text-ink shadow-lg">
              {navigation.map((item) => <a key={item.href} href={item.href} className="rounded-lg px-3 py-3 hover:bg-mint">{item.label}</a>)}
              <a href={authenticated ? '/my-ticket' : '/login'} className="rounded-lg px-3 py-3 hover:bg-mint">{authenticated ? 'My ticket' : 'Log in'}</a>
            </nav>
          ) : null}
        </div>
      ) : null}
      {title ? (
        <div className="page-width pt-3 pb-5 md:pt-6">
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-description">{subtitle}</p> : null}
        </div>
      ) : null}
    </header>
  )
}

export function BottomNav() {
  const { pathname, navigate } = useRouter()
  return (
    <nav aria-label="Main navigation" className="no-print sticky bottom-0 z-10 mt-auto grid grid-cols-4 border-t border-line bg-white/95 px-2 pt-1 pb-[max(.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
        return (
          <a key={href} href={href} aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
              event.preventDefault()
              navigate(href)
            }}
            className={cn('flex min-h-[55px] flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold hover:bg-mint', active ? 'text-[#815800] [&>svg]:text-[#ab7900]' : 'text-muted')}>
            <Icon className="size-5" />
            {label}
          </a>
        )
      })}
    </nav>
  )
}
