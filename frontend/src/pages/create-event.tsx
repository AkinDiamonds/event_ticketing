import { CmsEventsScreen } from '../screens/cms-events-screen'

export default function CreateEventPage() {
  return <CmsEventsScreen backHref="/tickets" ticketSettingsHref="/admin/tickets" createOnly />
}
