import { createContext, useContext } from 'react'

type RouterContextValue = {
  pathname: string
  navigate: (to: string) => void
  back: () => void
}

export const RouterContext = createContext<RouterContextValue | null>(null)

export function useRouter() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider')
  }
  return context
}

export type { RouterContextValue }

