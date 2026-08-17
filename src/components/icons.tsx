import type { PropsWithChildren } from 'react'

type IconProps = {
  className?: string
}

function Icon({
  className,
  children,
}: PropsWithChildren<IconProps>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function LogoMark({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 9.5 16 5l11 4.5V22L16 27l-11-5V9.5Z" fill="#163b27" />
      <path d="M5 9.5 16 5l11 4.5" stroke="#f2c11f" strokeWidth="1.4" />
      <path d="M8.5 11.3 16 8l7.5 3.3V20L16 23.3 8.5 20v-8.7Z" fill="#ffffff" />
      <path d="M11 13h10l-1.6 6.3H12.6L11 13Z" fill="#163b27" />
      <path d="m13.5 12.6 1.6 6.4m2.8-6.4-1.6 6.4" stroke="#f2c11f" strokeWidth="1.2" />
    </svg>
  )
}

export function BackIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M14.5 5 7.5 12l7 7" />
    </Icon>
  )
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 7.5h14" />
      <path d="M5 12h14" />
      <path d="M5 16.5h14" />
    </Icon>
  )
}

export function ShareIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m16.5 8.5-7 4" />
      <path d="m9.5 11.5 7 4" />
      <circle cx="18" cy="6.5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="17.5" r="2" />
    </Icon>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="5.5" />
      <path d="m15 15 4 4" />
    </Icon>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4.5" y="5.5" width="15" height="14" rx="3" />
      <path d="M4.5 9.5h15" />
      <path d="M9 4v3m6-3v3" />
    </Icon>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8.5V12l2.5 1.5" />
    </Icon>
  )
}

export function LocationIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 20s5-4.2 5-9a5 5 0 1 0-10 0c0 4.8 5 9 5 9Z" />
      <circle cx="12" cy="11" r="1.5" />
    </Icon>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m7 12 3.2 3.2L17 8.4" />
    </Icon>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8.2" r="3" />
      <path d="M5.5 19c1.5-3.7 4.2-5.5 6.5-5.5S16.5 15.3 18.5 19" />
    </Icon>
  )
}

export function CardIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4.5" y="6" width="15" height="12" rx="3" />
      <path d="M4.5 10h15" />
      <path d="M8 14h3" />
    </Icon>
  )
}

export function BankIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 10.5 12 5l7 5.5" />
      <path d="M7 10.5V18" />
      <path d="M10 10.5V18" />
      <path d="M14 10.5V18" />
      <path d="M17 10.5V18" />
      <path d="M4.5 18h15" />
    </Icon>
  )
}

export function WalletIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 8.5h12.2a2.5 2.5 0 0 1 2.5 2.5V17a2 2 0 0 1-2 2H7a2.5 2.5 0 0 1-2.5-2.5v-8Z" />
      <path d="M18.5 11.5h-2a1.5 1.5 0 0 0 0 3h2" />
    </Icon>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M9 4.5h6l1 2.2v10.6l-1 2.2H9l-1-2.2V6.7L9 4.5Z" />
      <path d="M10.5 16.5h3" />
    </Icon>
  )
}

export function MinusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6.5 12h11" />
    </Icon>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 6.5v11" />
      <path d="M6.5 12h11" />
    </Icon>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 4.5v9" />
      <path d="m8.5 10 3.5 3.5L15.5 10" />
      <path d="M5 17.5h14" />
    </Icon>
  )
}

export function ShareStrokeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m17 8-6.5 4" />
      <path d="m10.5 12 6.5 4" />
      <circle cx="18" cy="6.5" r="1.8" />
      <circle cx="6" cy="12" r="1.8" />
      <circle cx="18" cy="17.5" r="1.8" />
    </Icon>
  )
}

export function TicketIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 8a2 2 0 0 1 2-2h10a2 2 0 0 0 2 2 2 2 0 0 0 0 4 2 2 0 0 0 0 4 2 2 0 0 0 0 4 2 2 0 0 0-2-2H7a2 2 0 0 1-2-2V8Z" />
    </Icon>
  )
}

export function PencilIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m5 18 1.4-4.8L15.8 3.8a1.4 1.4 0 0 1 2 0l2.4 2.4a1.4 1.4 0 0 1 0 2L10.8 18.6 5 18Z" />
      <path d="m15 5 4 4" />
    </Icon>
  )
}

export function QrIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="5" y="5" width="5" height="5" rx="1" />
      <rect x="14" y="5" width="5" height="5" rx="1" />
      <rect x="5" y="14" width="5" height="5" rx="1" />
      <path d="M15 14h2v2h-2zM12 12h2v2h-2zM17 12h2v2h-2zM12 17h2v2h-2zM15 17h2v2h-2z" />
    </Icon>
  )
}

export function HomeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5.5 11.5 12 6l6.5 5.5" />
      <path d="M7.5 10.5V18h9v-7.5" />
    </Icon>
  )
}

export function TicketsIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 8a2 2 0 0 1 2-2h10a2 2 0 0 0 2 2 2 2 0 0 0 0 4 2 2 0 0 0 0 4 2 2 0 0 0 0 4 2 2 0 0 0-2-2H7a2 2 0 0 1-2-2V8Z" />
      <path d="M9 10.5h6" />
      <path d="M9 13.5h4" />
    </Icon>
  )
}

export function OrdersIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M7 6.5h10l-.8 13H7.8L7 6.5Z" />
      <path d="M9 9.5h6" />
      <path d="M9 13h6" />
    </Icon>
  )
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8.5" r="3" />
      <path d="M5.5 19c1.6-3.5 4.1-5 6.5-5s4.9 1.5 6.5 5" />
    </Icon>
  )
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 4.5 18 7v5.1c0 4.2-2.8 6.8-6 8.4-3.2-1.6-6-4.2-6-8.4V7l6-2.5Z" />
      <path d="m9.5 12.1 1.8 1.8 3.5-3.7" />
    </Icon>
  )
}

export function DotMenuIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="5.5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="12" cy="18.5" r="1.2" />
    </Icon>
  )
}

export function StarIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m12 4.8 1.9 3.9 4.3.6-3.1 3  .7 4.3L12 14.6 8.2 16.6l.7-4.3-3.1-3 4.3-.6L12 4.8Z" />
    </Icon>
  )
}
