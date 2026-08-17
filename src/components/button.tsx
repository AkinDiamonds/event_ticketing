import type { ButtonHTMLAttributes, AnchorHTMLAttributes, MouseEvent } from 'react'
import { useRouter } from '../router'
import { cn } from '../lib/cn'

type SharedProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & SharedProps

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  href,
  ...props
}: ButtonProps) {
  const { navigate } = useRouter()

  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6b42]/30',
    variant === 'primary' &&
      'bg-[#ffbf1f] text-[#241800] shadow-[0_10px_24px_rgba(255,191,31,0.28)] hover:bg-[#f4b50d]',
    variant === 'secondary' &&
      'bg-white text-[#163b27] ring-1 ring-[#e4e2db] hover:bg-[#faf9f7]',
    variant === 'ghost' && 'bg-transparent text-[#2d2d2d] hover:bg-[#f4f3ef]',
    variant === 'accent' &&
      'bg-[#163b27] text-white shadow-[0_10px_24px_rgba(22,59,39,0.22)] hover:bg-[#112f1f]',
    size === 'sm' && 'h-9 px-3 text-sm',
    size === 'md' && 'h-12 px-4 text-sm',
    size === 'lg' && 'h-14 px-5 text-base',
    className,
  )

  if (href) {
    const anchorProps = props as AnchorHTMLAttributes<HTMLAnchorElement>

    return (
      <a
        href={href}
        className={classes}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          anchorProps.onClick?.(event)
          if (event.defaultPrevented) return
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return
          }
          event.preventDefault()
          navigate(href)
        }}
        {...anchorProps}
      />
    )
  }

  return (
    <button
      className={classes}
      {...props}
    />
  )
}
