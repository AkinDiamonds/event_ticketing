import type { PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

type PhoneFrameProps = PropsWithChildren<{
  className?: string
}>

export function PhoneFrame({ className, children }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full hidden max-w-[392px] overflow-hidden border border-[#e7e2d8] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.14)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
