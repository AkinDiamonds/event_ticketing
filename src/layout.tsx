import type { ComponentType, ReactNode } from 'react'
import { LogoMark, HomeIcon, TicketsIcon, OrdersIcon, ProfileIcon } from './components/icons'
import { useRouter } from './router'
import { cn } from './lib/cn'

const navigation: { label: string; href: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: 'Discover', href: '/', icon: HomeIcon },
  { label: 'Events', href: '/tickets', icon: TicketsIcon },
  { label: 'My tickets', href: '/my-ticket', icon: TicketsIcon },
  { label: 'Orders', href: '/orders', icon: OrdersIcon },
  { label: 'Profile', href: '/profile', icon: ProfileIcon },
]

function Brand({ dark = false }: { dark?: boolean }) {
  const { navigate } = useRouter()
  return (
    <button type="button" onClick={() => navigate('/')} className={cn('flex items-center gap-3 text-left', dark && 'text-[#153c28]')}>
      <LogoMark className="h-10 w-10" />
      <span>
        <span className="block text-[12px] font-extrabold tracking-[0.12em]">LASU EVENTS</span>
        <span className={cn('mt-0.5 block text-[10px]', dark ? 'text-[#748078]' : 'text-white/55')}>Campus, in good company.</span>
      </span>
    </button>
  )
}

function NavLinks({ compact = false }: { compact?: boolean }) {
  const { pathname, navigate } = useRouter()
  return (
    <nav aria-label="Main navigation" className={compact ? 'flex w-full items-center justify-between gap-1' : 'space-y-1'}>
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <button
            key={href}
            type="button"
            onClick={() => navigate(href)}
            className={cn(
              compact
                ? 'flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[11px] font-semibold transition'
                : 'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition',
              active
                ? compact ? 'bg-[#e9f4ed] text-[#08743d]' : 'bg-white/12 text-white'
                : compact ? 'text-[#69746d] hover:bg-[#f1f6f2] hover:text-[#143d27]' : 'text-white/65 hover:bg-white/8 hover:text-white',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

function AuthActions({ compact = false }: { compact?: boolean }) {
  const { navigate } = useRouter()
  const authenticated = Boolean(localStorage.getItem('lasu_access_token'))
  if (authenticated) {
    return <button type="button" onClick={() => navigate('/profile')} className={compact ? 'rounded-full bg-[#e9f4ed] px-4 py-2 text-[12px] font-semibold text-[#086b38] hover:bg-[#dff0e5]' : 'w-full rounded-xl bg-white/12 px-4 py-3 text-left text-[13px] font-semibold text-white hover:bg-white/18'}>My account</button>
  }
  return (
    <div className={compact ? 'flex items-center gap-2' : 'mt-auto space-y-2'}>
      <button type="button" onClick={() => navigate('/login')} className={compact ? 'rounded-full px-3 py-2 text-[12px] font-semibold text-[#086b38] hover:bg-[#eff6f1]' : 'w-full rounded-xl border border-white/20 px-4 py-3 text-[13px] font-semibold text-white hover:bg-white/8'}>Log in</button>
      <button type="button" onClick={() => navigate('/register')} className={compact ? 'rounded-full bg-[#08743d] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#005b30]' : 'w-full rounded-xl bg-[#0d9a50] px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-black/10 hover:bg-[#12a85a]'}>Create account</button>
    </div>
  )
}

function isAuthRoute(pathname: string) {
  return ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/password-reset-success'].includes(pathname)
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter()

  if (isAuthRoute(pathname)) {
    return <main className="auth-layout min-h-dvh w-full bg-white text-[#121a15]">{children}</main>
  }

  return (
    <main className="min-h-dvh bg-[#f3f6f2] text-[#121a15]">
      <div className="min-h-dvh lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col bg-[radial-gradient(circle_at_10%_0%,rgba(30,142,75,.22),transparent_32%),linear-gradient(160deg,#0d281b,#071910)] px-5 py-7 text-white lg:flex">
          <Brand />
          <div className="my-8 h-px bg-white/10" />
          <NavLinks />
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[12px] font-semibold">Good things happen here.</p>
            <p className="mt-1 text-[11px] leading-5 text-white/55">Find your people, discover campus events, and make a night of it.</p>
          </div>
          <AuthActions />
        </aside>

        <div className="min-w-0 lg:col-start-2">
          <header className="sticky top-0 z-40 hidden border-b border-[#e8ece8] bg-white/95 px-6 py-2.5 backdrop-blur-xl md:flex md:flex-col md:gap-1.5 lg:hidden">
            <div className="flex items-center justify-between">
              <Brand dark />
              <AuthActions compact />
            </div>
            <NavLinks compact />
          </header>
          <div className="app-stage mx-auto min-h-dvh w-full max-w-[430px] overflow-x-hidden bg-[#fbfaf7] shadow-[0_0_60px_rgba(14,37,22,.04)] md:max-w-none">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
