import { Layout } from './layout'
import { RouterProvider } from './router-provider'
import { useRouter } from './router'
import { matchRoute } from './routes'
import { useEffect, useState, type ReactNode } from 'react'
import { AuthRequestError, getCurrentAccount } from './lib/auth-api'
import { Button } from './components/button'

function OrganizerAccess({ children, creating = false }: { children: ReactNode; creating?: boolean }) {
  const [access, setAccess] = useState<'checking' | 'approved' | 'signed-out' | 'denied' | 'unavailable'>('checking')
  useEffect(() => {
    let active = true
    getCurrentAccount().then((account) => {
      if (active) setAccess((creating ? account.isEmailVerified : account.isOrganizer) ? 'approved' : 'denied')
    }).catch((cause: unknown) => {
      if (active) setAccess(cause instanceof AuthRequestError && cause.status === 401 ? 'signed-out' : 'unavailable')
    })
    return () => { active = false }
  }, [creating])

  if (access === 'approved') return <Layout>{children}</Layout>
  const returnTo = window.location.pathname + window.location.search
  return (
    <main className="page-width py-12">
      {access === 'checking' ? <p role="status">Checking workspace access…</p> : (
        <>
          <h1 className="page-title">{creating ? 'Create an event' : 'Organizer Workspace'}</h1>
          <p className="page-description">
            {access === 'signed-out' ? 'Sign in to continue.' : access === 'denied' ? (creating ? 'Verify your email before creating an event.' : 'Create your first event to set up your workspace.') : 'We couldn’t check your account. Try reloading the page.'}
          </p>
          <Button className="mt-5" href={access === 'signed-out' ? '/login?returnTo=' + encodeURIComponent(returnTo) : access === 'denied' && !creating ? '/events/create' : '/tickets'}>
            {access === 'signed-out' ? 'Log in' : access === 'denied' && !creating ? 'Create event' : 'Browse events'}
          </Button>
        </>
      )}
    </main>
  )
}

function RoutedApp() {
  const { pathname, navigate } = useRouter()
  const match = matchRoute(pathname)

  useEffect(() => {
    if (!match && pathname !== '/') {
      navigate('/')
    }
  }, [match, navigate, pathname])

  const Component = match?.component
  const params = match?.params ?? {}

  const pageKey = pathname + window.location.search
  const page = Component ? <Component key={pageKey} params={params} /> : null
  if (Component && pathname === '/events/create') {
    return <OrganizerAccess key={pageKey} creating>{page}</OrganizerAccess>
  }
  if (Component && pathname.startsWith('/admin/')) {
    return <OrganizerAccess key={pageKey}>{page}</OrganizerAccess>
  }
  return <Layout>{page}</Layout>
}

export default function App() {
  return (
    <RouterProvider>
      <RoutedApp />
    </RouterProvider>
  )
}
