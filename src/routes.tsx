import type { ComponentType } from 'react'
import HomePage from './pages/home'
import TicketsPage from './pages/tickets/index'
import TicketDetailPage from './pages/tickets/[id]'
import TicketSelectPage from './pages/tickets/[id]/select'
import TicketAttendeePage from './pages/tickets/[id]/attendee'
import TicketPaymentPage from './pages/tickets/[id]/payment'
import TicketSuccessPage from './pages/tickets/[id]/success'
import TicketWalletPage from './pages/tickets/[id]/ticket'
import MyTicketPage from './pages/my-ticket'
import OrdersPage from './pages/orders'
import ProfilePage from './pages/profile'
import AdminEventsPage from './pages/admin/events'
import AdminTicketsPage from './pages/admin/tickets'

export type RouteModule = {
  path: string
  component: ComponentType<{ params: Record<string, string> }>
}

export const routes: RouteModule[] = [
  { path: '/', component: HomePage },
  { path: '/tickets', component: TicketsPage },
  { path: '/tickets/:id', component: TicketDetailPage },
  { path: '/tickets/:id/select', component: TicketSelectPage },
  { path: '/tickets/:id/attendee', component: TicketAttendeePage },
  { path: '/tickets/:id/payment', component: TicketPaymentPage },
  { path: '/tickets/:id/success', component: TicketSuccessPage },
  { path: '/tickets/:id/ticket', component: TicketWalletPage },
  { path: '/my-ticket', component: MyTicketPage },
  { path: '/orders', component: OrdersPage },
  { path: '/profile', component: ProfilePage },
  { path: '/admin/events', component: AdminEventsPage },
  { path: '/admin/tickets', component: AdminTicketsPage },
]

export type RouteMatch = {
  component: ComponentType<{ params: Record<string, string> }>
  params: Record<string, string>
}

function splitPath(path: string) {
  return path.replace(/\/+$/, '').split('/').filter(Boolean)
}

export function matchRoute(pathname: string): RouteMatch | null {
  const current = splitPath(pathname || '/')

  for (const route of routes) {
    const pattern = splitPath(route.path)
    if (pattern.length !== current.length) continue

    const params: Record<string, string> = {}
    let matched = true

    for (let index = 0; index < pattern.length; index += 1) {
      const expected = pattern[index]
      const actual = current[index]

      if (expected.startsWith(':')) {
        params[expected.slice(1)] = actual
        continue
      }

      if (expected !== actual) {
        matched = false
        break
      }
    }

    if (matched) {
      return {
        component: route.component,
        params,
      }
    }
  }

  return null
}
