import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-[#ece8df] bg-white shadow-[0_12px_34px_rgba(17,24,39,0.06)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardInset({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-[#ece8df] bg-[#faf9f6] px-4 py-3',
        className,
      )}
      {...props}
    />
  )
}

export function DarkPanel({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-tl-[10px] rounded-tr-[10px] bg-[#081810] text-white',
        className,
      )}
      {...props}
    />
  )
}
