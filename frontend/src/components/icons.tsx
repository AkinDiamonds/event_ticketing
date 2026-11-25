export {
  ArrowLeft as BackIcon,
  ArrowRight as ArrowRightIcon,
  CalendarDays as CalendarIcon,
  Check as CheckIcon,
  CircleAlert as AlertIcon,
  CircleUserRound as ProfileIcon,
  ClipboardList as OrdersIcon,
  Clock3 as ClockIcon,
  CreditCard as CardIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  House as HomeIcon,
  Mail as MailIcon,
  MapPin as LocationIcon,
  Menu as MenuIcon,
  Minus as MinusIcon,
  Pencil as PencilIcon,
  Plus as PlusIcon,
  Printer as PrintIcon,
  Search as SearchIcon,
  Share2 as ShareIcon,
  ShieldCheck as ShieldCheckIcon,
  Ticket as TicketsIcon,
  UserRound as UserIcon,
  X as CloseIcon,
} from 'lucide-react'

type IconProps = { className?: string }

export function LogoMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#075431" />
      <path d="M7 9h18v4a3 3 0 0 0 0 6v4H7v-4a3 3 0 0 0 0-6V9Z" fill="#fff" />
      <path d="M19 11v10" stroke="#075431" strokeWidth="1.4" strokeDasharray="2 1.4" />
      <path d="M10 16h5" stroke="#075431" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
