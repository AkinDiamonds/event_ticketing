import { Layout } from './layout'
import { RouterProvider } from './router-provider'
import { useRouter } from './router'
import { matchRoute } from './routes'
import { useEffect } from 'react'

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

  return <Layout>{Component ? <Component params={params} /> : null}</Layout>
}

export default function App() {
  return (
    <RouterProvider>
      <RoutedApp />
    </RouterProvider>
  )
}
