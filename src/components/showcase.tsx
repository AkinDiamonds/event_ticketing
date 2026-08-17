import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { PhoneFrame } from './phone-frame'

type ShowcaseProps = {
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function ShowcaseCard({ title, description, children, className }: ShowcaseProps) {
  return (
    <section className={cn('flex flex-col items-center', className)}>
      <PhoneFrame>{children}</PhoneFrame>
      <div className="mt-3  text-center">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#141414]">
          {title}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-[#6f6860]">{description}</p>
      </div>
    </section>
  )
}
