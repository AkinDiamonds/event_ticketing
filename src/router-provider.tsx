import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RouterContext } from './router'

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname || '/')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const value = useMemo(
    () => ({
      pathname,
      navigate: (to: string) => {
        if (to === pathname) return
        window.history.pushState({}, '', to)
        setPathname(to)
      },
      back: () => window.history.back(),
    }),
    [pathname],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

