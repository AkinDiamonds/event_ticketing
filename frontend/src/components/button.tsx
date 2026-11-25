import type { ButtonHTMLAttributes, AnchorHTMLAttributes, MouseEvent } from 'react'
import { useRouter } from '../router'
import { cn } from '../lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

export function Button({ className, variant = 'primary', size = 'md', href, ...props }: ButtonProps) {
  const { navigate } = useRouter()
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-lg text-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary' && 'bg-amber text-[#211700] hover:bg-[#f2b100] md:bg-forest md:text-white md:hover:bg-forest-dark',
    variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-mint',
    variant === 'ghost' && 'text-forest hover:bg-mint',
    variant === 'accent' && 'bg-forest text-white hover:bg-forest-dark',
    size === 'sm' && 'min-h-10 px-3 text-[13px]',
    size === 'md' && 'min-h-12 px-4 text-sm',
    size === 'lg' && 'min-h-14 px-5 text-base',
    className,
  )

  if (href) {
    const { onClick, ...anchorProps } = props as AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <a {...anchorProps} href={href} className={classes}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event)
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
          if (event.currentTarget.origin !== window.location.origin || event.currentTarget.hasAttribute('download') || event.currentTarget.target) return
          event.preventDefault()
          navigate(href)
        }}
      />
    )
  }

  return <button type="button" {...props} className={classes} />
}
