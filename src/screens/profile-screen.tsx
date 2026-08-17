import { Card, CardInset } from '../components/card'
import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { OrdersIcon, TicketsIcon, ShieldCheckIcon, ProfileIcon } from '../components/icons'

type ProfileScreenProps = {
  backHref: string
  ordersHref: string
  adminHref: string
}

export function ProfileScreen({ backHref, ordersHref, adminHref }: ProfileScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar title="Profile" backHref={backHref} />
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <Card className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-[0.5rem] bg-[#163b27] text-white">
              <ProfileIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#171717]">John Doe</p>
              <p className="text-[12px] text-[#736b60]">john.doe@lasu.edu.ng</p>
            </div>
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <CardInset>
            <div className="flex items-center gap-3">
              <TicketsIcon className="h-5 w-5 text-[#1f6b42]" />
              <div>
                <p className="text-[12px] text-[#7b7368]">Tickets</p>
                <p className="text-[16px] font-black text-[#171717]">12</p>
              </div>
            </div>
          </CardInset>
          <CardInset>
            <div className="flex items-center gap-3">
              <OrdersIcon className="h-5 w-5 text-[#1f6b42]" />
              <div>
                <p className="text-[12px] text-[#7b7368]">Orders</p>
                <p className="text-[16px] font-black text-[#171717]">4</p>
              </div>
            </div>
          </CardInset>
        </div>

        <div className="mt-4 space-y-3">
          <Button variant="secondary" className="w-full justify-start" href={ordersHref}>
            <OrdersIcon className="h-5 w-5" />
            My Orders
          </Button>
          <Button variant="secondary" className="w-full justify-start">
            <ShieldCheckIcon className="h-5 w-5" />
            Security Settings
          </Button>
          <Button variant="secondary" className="w-full justify-start" href={adminHref}>
            <TicketsIcon className="h-5 w-5" />
            Admin Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
