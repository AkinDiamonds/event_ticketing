import { Card } from '../components/card'
import { TopBar } from '../components/navbar'
import { Button } from '../components/button'
import { PencilIcon } from '../components/icons'

function TicketType({
  title,
  price,
  limit,
  sold,
  accent = 'green',
}: {
  title: string
  price: string
  limit: string
  sold: string
  accent?: 'green' | 'gold'
}) {
  return (
    <Card className="relative px-4 py-4">
      <div
        className={[
          'absolute inset-y-0 left-0 w-[4px] rounded-l-[24px]',
          accent === 'green' ? 'bg-[#1f6b42]' : 'bg-[#f2bf20]',
        ].join(' ')}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#171717]">{title}</p>
            <p className="mt-2 text-[18px] font-black text-[#171717]">{price}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-11 rounded-full bg-[#1f6b42] p-0.5">
              <div className="ml-auto h-5 w-5 rounded-full bg-white shadow-sm" />
            </div>
            <PencilIcon className="h-5 w-5 text-[#7d766b]" />
          </div>
        </div>
        <div className="mt-3 space-y-1 text-[12px] text-[#736b60]">
          <p>Limit: {limit}</p>
          <p>Sold: {sold}</p>
        </div>
      </div>
    </Card>
  )
}

type TicketSettingsScreenProps = {
  backHref: string
}

export function TicketSettingsScreen({ backHref }: TicketSettingsScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar title="Ticket Types" subtitle="Tech Summit 2026" backHref={backHref} />
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className="space-y-3">
          <TicketType title="Early Bird" price="NGN 3,000" limit="150" sold="120" />
          <TicketType title="Regular" price="NGN 5,000" limit="500" sold="240" />
          <TicketType title="VIP" price="NGN 15,000" limit="50" sold="20" accent="gold" />
        </div>
        <div className="mt-5">
          <Button className="w-full">+ Add Ticket Type</Button>
        </div>
      </div>
    </div>
  )
}
