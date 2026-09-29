import { Card } from '../components/card'
import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { QuantityControl } from '../components/form'
import { TicketOption } from '../components/ticket'

type TicketSelectionScreenProps = {
  backHref: string
  continueHref: string
}

export function TicketSelectionScreen({ backHref, continueHref }: TicketSelectionScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar title="Choose Your Ticket" subtitle="Pick a ticket, set quantity and proceed" backHref={backHref} />
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-8 lg:mx-auto lg:grid lg:w-full lg:max-w-[1160px] lg:grid-cols-[1.35fr_.65fr] lg:items-start lg:gap-8 lg:px-0 lg:pt-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <TicketOption
            title="Early Bird"
            subtitle="Limited offer"
            price="NGN 3,000"
            availability="Available: 150"
            selected
          />
          <TicketOption
            title="Regular"
            subtitle="Standard access"
            price="NGN 5,000"
            availability="Available: 500"
          />
          <TicketOption
            title="VIP"
            subtitle="Full access + perks"
            price="NGN 15,000"
            availability="Available: 50"
            accent="gold"
          />
        </div>

        <aside className="mt-5 rounded-[24px] border border-[#e8ede9] bg-white p-5 shadow-[0_16px_45px_rgba(18,50,31,.05)] lg:sticky lg:top-8 lg:mt-0 lg:p-6">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-[#3a3a3a]">Quantity</p>
          <QuantityControl value={1} />
        </div>

        <Card className="mt-4 px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#686257]">Total Amount</p>
            <p className="text-[20px] font-black text-[#101010]">NGN 3,000</p>
          </div>
        </Card>

        <div className="mt-5">
          <Button className="w-full" href={continueHref}>
            Continue
          </Button>
        </div>
        </aside>
      </div>
    </div>
  )
}
