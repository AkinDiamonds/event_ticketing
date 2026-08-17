import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh lg:w-full max-w-[375px] overflow-x-hidden bg-[#fbfaf7]  text-[#121212]">
      {children}
    </main>
  )
}
