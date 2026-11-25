import type { ReactNode } from 'react'
import { CalendarIcon, HomeIcon, LogoMark, ProfileIcon } from './components/icons'
import { useRouter } from './router'

const authRoutes = new Set(['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/password-reset-success'])

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter()
  if (authRoutes.has(pathname)) return <main className="min-h-dvh">{children}</main>

  if (pathname.startsWith('/admin/')) {
    return (
      <div className="min-h-dvh lg:grid lg:grid-cols-[218px_minmax(0,1fr)]">
        <aside className="hidden bg-[#0b1e1a] px-4 py-6 text-white lg:block">
          <a href="/admin/events" className="flex min-h-11 items-center gap-2 px-2 font-bold">
            <LogoMark className="size-8 shrink-0" /> Event Tickets
          </a>
          <nav aria-label="Organizer navigation" className="mt-7 grid gap-1 text-sm font-semibold">
            <a href="/admin/events" aria-current={pathname === '/admin/events' ? 'page' : undefined} className="flex min-h-11 items-center gap-3 rounded-lg bg-forest px-3 hover:bg-[#176c43]">
              <CalendarIcon className="size-[18px]" /> Events
            </a>
            <a href="/tickets" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-white/85 hover:bg-white/10">
              <HomeIcon className="size-[18px]" /> Public Events
            </a>
            <a href="/profile" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-white/85 hover:bg-white/10">
              <ProfileIcon className="size-[18px]" /> Profile
            </a>
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    )
  }

  const authenticated = Boolean(localStorage.getItem('lasu_access_token'))
  return (
    <>
      <header className="no-print hidden border-b border-line bg-white md:block">
        <div className="page-width grid min-h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-6">
          <a href="/" className="flex w-fit items-center gap-2 text-[17px] font-bold tracking-tight">
            <LogoMark className="size-8" />
            Event Tickets
          </a>
          <nav className="flex items-center gap-8 text-sm font-semibold" aria-label="Main navigation">
            <a href="/tickets" className="hover:text-forest" aria-current={pathname === '/tickets' || pathname.startsWith('/tickets/') ? 'page' : undefined}>Events</a>
            <a href="/my-ticket" className="hover:text-forest" aria-current={pathname === '/my-ticket' ? 'page' : undefined}>My tickets</a>
            <a href="/orders" className="hover:text-forest" aria-current={pathname === '/orders' ? 'page' : undefined}>Orders</a>
          </nav>
          <a href={authenticated ? '/profile' : '/login'} className="justify-self-end rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark">{authenticated ? 'My account' : 'Log in'}</a>
        </div>
      </header>
      <main>{children}</main>
    </>
  )
}
