import { useState } from 'react'
import { Card } from '../components/card'
import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { OrdersIcon, TicketsIcon, ShieldCheckIcon, ProfileIcon } from '../components/icons'
import { useRouter } from '../router'
import { logout } from '../lib/auth-api'

type ProfileScreenProps = {
  backHref: string
  ordersHref: string
  adminHref: string
}

export function ProfileScreen({ backHref, ordersHref, adminHref }: ProfileScreenProps) {
  const { navigate } = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const isAuthenticated = Boolean(localStorage.getItem('lasu_access_token'))
  const email = localStorage.getItem('lasu_profile_email')
  const name = localStorage.getItem('lasu_profile_name')

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // The local session is cleared even if the API logout request fails.
    } finally {
      navigate('/login')
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar title="Profile" backHref={backHref} />
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-8 lg:mx-auto lg:w-full lg:max-w-[1050px] lg:px-0 lg:pt-8">
        <div className="grid gap-5 md:grid-cols-[1fr_1fr] lg:grid-cols-[1.15fr_.85fr] lg:gap-7">
        <Card className="px-4 py-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#eaf4ed] text-[#08743d]">
              <ProfileIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#171717]">
                {isAuthenticated ? name || 'Your LASU Events account' : 'Browsing as a guest'}
              </p>
              <p className="mt-1 truncate text-[12px] text-[#736b60]">
                {isAuthenticated ? email || 'Email not available' : 'Sign in to view your account details'}
              </p>
            </div>
          </div>
          {!isAuthenticated ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="w-full" href="/login">Log in</Button>
              <Button variant="accent" className="w-full" href="/register">Sign up</Button>
            </div>
          ) : null}
        </Card>

        <div className="mt-4 space-y-3 md:mt-0 md:self-start">
          <Button variant="secondary" className="w-full justify-start" href={ordersHref}>
            <OrdersIcon className="h-5 w-5" />
            My Orders
          </Button>
          <Button variant="secondary" className="w-full justify-start">
            <ShieldCheckIcon className="h-5 w-5" />
            Security Settings
          </Button>
          <Button variant="secondary" className="w-full justify-start" href={adminHref}>
            <TicketsIcon className="h-5 w-5" />
            Admin Dashboard
          </Button>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="h-12 w-full rounded-[10px] border border-[#9ac5aa] bg-white text-[13px] font-semibold text-[#08743d] transition hover:bg-[#f3faf5] disabled:opacity-60"
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  )
}
