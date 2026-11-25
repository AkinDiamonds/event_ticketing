import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RouterContext } from './router'

function currentLocation() {
  return window.location.pathname + window.location.search + window.location.hash
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(currentLocation)
  useEffect(() => {
    const onPopState = () => setLocation(currentLocation())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const value = useMemo(
    () => ({
      pathname: new URL(location, window.location.origin).pathname,
      navigate: (to: string) => {
        if (to === location) return
        window.history.pushState({}, '', to)
        setLocation(currentLocation())
        window.scrollTo(0, 0)
      },
      back: () => window.history.back(),
    }),
    [location],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}
