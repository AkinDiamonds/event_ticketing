import { BottomNav, TopBar } from '../components/navbar'
import { Button } from '../components/button'
import { Card } from '../components/card'
import { OrdersIcon } from '../components/icons'

export function MyOrdersScreen({ backHref }: { backHref: string }) {
  return (
    <div className="flex min-h-dvh flex-col md:min-h-[calc(100dvh-73px)]">
      <TopBar narrow backHref={backHref} />
      <div className="flow-width flex-1 pt-3 pb-10 md:pt-7">
        <h1 className="page-title">My Orders</h1>
        <Card className="mt-6 flex flex-col items-center p-7 text-center md:p-9">
          <span className="grid size-12 place-items-center rounded-xl bg-mint text-forest"><OrdersIcon className="size-6" /></span>
          <h2 className="mt-4 font-bold">Find a confirmed order</h2>
          <p className="mt-2 max-w-[40ch] text-sm leading-6 text-muted">Open your order from the payment confirmation screen or the confirmation email. Your entry codes are in the email.</p>
          <Button className="mt-5" href="/tickets">Browse Events</Button>
        </Card>
      </div>
      <BottomNav />
    </div>
  )
}
