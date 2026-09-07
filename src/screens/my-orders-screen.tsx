import { Card } from '../components/card'
import { TopBar } from '../components/navbar'
import { Button } from '../components/button'

function OrderEntry({
  title,
  date,
  ticket,
  price,
}: {
  title: string
  date: string
  ticket: string
  price: string
}) {
  return (
    <Card className="px-4 py-4">
      <p className="text-[14px] font-bold text-[#1b1b1b]">{title}</p>
      <p className="mt-1 text-[11px] text-[#7d776c]">{date}</p>
      <div className="mt-3 flex items-center justify-between text-[12px]">
        <span className="rounded-full bg-[#edf5ef] px-2.5 py-1 font-semibold text-[#1f6b42]">
          Confirmed
        </span>
        <span className="text-[#353535]">{ticket}</span>
        <span className="font-bold text-[#1b1b1b]">{price}</span>
      </div>
      <div className="mt-3">
        <Button variant="secondary" className="w-full">
          View Ticket
        </Button>
      </div>
    </Card>
  )
}

type MyOrdersScreenProps = {
  backHref: string
}

export function MyOrdersScreen({ backHref }: MyOrdersScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar title="My Orders" backHref={backHref} homeRef='/' />
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className="grid grid-cols-2 rounded-[0.5rem] bg-[#f4f1ea] p-1 text-center text-[12px] font-semibold text-[#6f695e]">
          <div className="rounded-[14px] bg-white py-2 text-[#171717] shadow-sm">Upcoming</div>
          <div className="py-2">Past</div>
        </div>

        <div className="mt-4 space-y-3">
          <OrderEntry
            title="Tech Summit 2026"
            date="Oct 24, 2026 • 09:00 AM"
            ticket="Early Bird Ticket x1"
            price="NGN 3,200"
          />
          <OrderEntry
            title="Freshers' Welcome Week"
            date="Nov 10, 2026 • 10:00 AM"
            ticket="Regular Ticket x1"
            price="NGN 1,200"
          />
          <OrderEntry
            title="Entrepreneurship Conference"
            date="Nov 28, 2026 • 09:00 AM"
            ticket="VIP Ticket x1"
            price="NGN 12,000"
          />
        </div>
      </div>
    </div>
  )
}
