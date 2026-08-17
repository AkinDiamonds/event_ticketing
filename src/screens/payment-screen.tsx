import type { ComponentType } from 'react'
import { Card } from '../components/card'
import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { BankIcon, CardIcon, CheckIcon, ShieldCheckIcon, WalletIcon } from '../components/icons'

function SummaryRow({
  label,
  value,
  muted = false,
  total = false,
}: {
  label: string
  value: string
  muted?: boolean
  total?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <p className={muted ? 'text-[13px] text-[#7f786c]' : 'text-[13px] text-[#282828]'}>
        {label}
      </p>
      <p className={total ? 'text-[18px] font-black text-[#1f6b42]' : 'text-[13px] font-semibold text-[#1d1d1d]'}>
        {value}
      </p>
    </div>
  )
}

function MethodCard({
  icon: Icon,
  title,
  subtitle,
  selected = false,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  subtitle: string
  selected?: boolean
}) {
  return (
    <Card className={selected ? 'border-[#2b7a4c] bg-[#fbfdf9]' : ''}>
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="grid h-11 w-11 place-items-center rounded-[0.5rem] bg-[#f5f1e8] text-[#1c382a]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#191919]">{title}</p>
          <p className="text-[12px] text-[#797267]">{subtitle}</p>
        </div>
        <div
          className={
            selected
              ? 'grid h-5 w-5 place-items-center rounded-full bg-[#1f6b42] text-white'
              : 'h-5 w-5 rounded-full border border-[#cfc8bc]'
          }
        >
          {selected ? <CheckIcon className="h-4 w-4" /> : null}
        </div>
      </div>
    </Card>
  )
}

type PaymentScreenProps = {
  backHref: string
  payHref: string
}

export function PaymentScreen({ backHref, payHref }: PaymentScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar title="Payment" subtitle="Complete your purchase" backHref={backHref} />
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <Card className="px-4 py-4">
          <p className="text-[14px] font-bold text-[#1a1a1a]">Order Summary</p>
          <div className="mt-3 space-y-1">
            <SummaryRow label="Tech Summit 2026" value="" muted />
            <SummaryRow label="Early Bird Ticket" value="x1    NGN 3,000" />
            <SummaryRow label="Service Fee" value="NGN 200" />
          </div>
          <div className="mt-3 border-t border-[#ece6db] pt-2">
            <SummaryRow label="Total Amount" value="NGN 3,200" total />
          </div>
        </Card>

        <div className="mt-5">
          <p className="text-[14px] font-bold text-[#161616]">Payment Method</p>
          <div className="mt-3 space-y-3">
            <MethodCard
              icon={CardIcon}
              title="Card"
              subtitle="Visa, Mastercard, Verve"
              selected
            />
            <MethodCard icon={BankIcon} title="Bank Transfer" subtitle="Pay via bank" />
            <MethodCard icon={WalletIcon} title="USSD" subtitle="*737#" />
          </div>
        </div>

        <div className="mt-5">
          <Button className="w-full" href={payHref}>
            Pay NGN 3,200
          </Button>
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#7f786c]">
            <ShieldCheckIcon className="h-4 w-4 text-[#1f6b42]" />
            <span>Secured by Paystack</span>
          </div>
        </div>
      </div>
    </div>
  )
}
