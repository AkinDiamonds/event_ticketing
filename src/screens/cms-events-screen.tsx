import { Card } from '../components/card'
import { TopBar } from '../components/navbar'
import { Button } from '../components/button'
import { CalendarIcon } from '../components/icons'

function CmsEvent({
  title,
  date,
  tickets,
  status,
}: {
  title: string
  date: string
  tickets: string
  status: 'Published' | 'Draft'
}) {
  return (
    <Card className="px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-[0.5rem] bg-[radial-gradient(circle_at_70%_20%,rgba(242,191,32,0.2),transparent_16%),linear-gradient(135deg,#0a1510,#1b1b1b)]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#171717]">{title}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#7f786c]">
            <CalendarIcon className="h-4 w-4" />
            <span>{date}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#7a7267]">
            {tickets} •{' '}
            <span className={status === 'Published' ? 'text-[#1f6b42]' : 'text-[#b06500]'}>
              {status}
            </span>
          </p>
        </div>
      </div>
    </Card>
  )
}

type CmsEventsScreenProps = {
  backHref: string
  ticketSettingsHref: string
}

export function CmsEventsScreen({ backHref, ticketSettingsHref }: CmsEventsScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f5f7f3]">
      <TopBar variant="dark" backHref={backHref} />
      <div className="px-4 pb-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#f7faf8]">Events</h2>
          <Button variant="primary" size="sm">
            + New Event
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          <CmsEvent title="Tech Summit 2026" date="Oct 24, 2026" tickets="1000 tickets" status="Published" />
          <CmsEvent title="Freshers' Welcome Week" date="Nov 10, 2026" tickets="500 tickets" status="Published" />
          <CmsEvent title="Entrepreneurship Conf." date="Nov 28, 2026" tickets="800 tickets" status="Draft" />
          <CmsEvent title="Career Fair 2026" date="Dec 05, 2026" tickets="600 tickets" status="Published" />
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <a href={ticketSettingsHref} className="text-[13px] font-semibold text-[#1f6b42]">
            Ticket Settings
          </a>
        </div>
      </div>
    </div>
  )
}
