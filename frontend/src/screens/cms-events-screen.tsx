import { useEffect, useState, type FormEvent } from 'react'
import { TopBar } from '../components/navbar'
import { Button } from '../components/button'
import { EventBanner } from '../components/ticket'
import { Card } from '../components/card'
import { PencilIcon } from '../components/icons'
import { TicketInventoryFields, TicketTypePicker } from '../components/ticket-type-fields'
import { readInventory, ticketTypes, type InventoryDraft } from '../lib/ticket-types'
import { useRouter } from '../router'
import { formatEventSchedule } from '../lib/format-event'
import { getEvents, createEvent, updateEvent, deleteEvent, type EventRecord, type CreateEventInput } from '../lib/events-api'

type EventForm = Omit<CreateEventInput, 'tiers' | 'bannerImageUrl'> & { bannerImageUrl: string }
const blank: EventForm = { title: '', description: '', bannerImageUrl: '', venue: '', startsAt: '' }
type Props = { backHref: string; ticketSettingsHref: string }

export function CmsEventsScreen({ backHref, ticketSettingsHref }: Props) {
  const [events, setEvents] = useState<EventRecord[]>([])
  const { navigate } = useRouter()
  const [form, setForm] = useState<EventForm>(blank)
  const [ticketType, setTicketType] = useState<string>(ticketTypes[0])
  const [inventory, setInventory] = useState<InventoryDraft>({ price: '', quantity: '' })
  const [editing, setEditing] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getEvents().then((items) => { if (active) setEvents(items) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load events.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function startCreate() {
    setEditing(null)
    setForm(blank)
    setTicketType(ticketTypes[0])
    setInventory({ price: '', quantity: '' })
    setError('')
    setOpen(true)
  }

  function startEdit(event: EventRecord) {
    const date = event.startsAt ? new Date(event.startsAt) : null
    const localDate = date && !Number.isNaN(date.valueOf()) ? new Date(date.valueOf() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
    setEditing(event.id)
    setForm({ title: event.title, description: event.description || '', bannerImageUrl: event.bannerImageUrl || '', venue: event.venue || '', startsAt: localDate })
    setError('')
    setOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, bannerImageUrl: form.bannerImageUrl.trim() || null, startsAt: new Date(form.startsAt).toISOString() }
      if (editing) {
        await updateEvent(editing, payload)
      } else {
        const created = await createEvent({ ...payload, tiers: [{ name: ticketType, ...readInventory(inventory) }] })
        if (created.id) {
          navigate(ticketSettingsHref + '?eventId=' + encodeURIComponent(created.id) + '&created=1')
          return
        }
      }
      setNotice(editing ? 'Event updated.' : 'Event created.')
      setOpen(false)
      try {
        setEvents(await getEvents())
      } catch {
        setError('Could not refresh the events list. Reload this page to see the latest events.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save event.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(event: EventRecord) {
    if (!window.confirm('Delete “' + event.title + '”? This cannot be undone.')) return
    setError('')
    try {
      await deleteEvent(event.id)
      setEvents((current) => current.filter((item) => item.id !== event.id))
      setNotice('Event deleted.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete event.')
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <TopBar organizer menu />
      <div className="page-width py-6 md:py-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="page-title">{open ? (editing ? 'Edit Event' : 'Create New Event') : 'Events'}</h1>
          {open ? <Button size="sm" variant="secondary" disabled={saving} onClick={() => { setOpen(false); setError('') }}>Cancel</Button> : <Button size="sm" onClick={startCreate}>+ New Event</Button>}
        </div>
        {notice && !open ? <p role="status" className="mb-4 text-sm font-medium text-forest">{notice}</p> : null}
        {error ? <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {open ? (
          <form onSubmit={save} className="grid gap-5 rounded-xl border border-line bg-white p-4 md:grid-cols-[1.05fr_.95fr] md:gap-7 md:p-7">
            <div className="space-y-4">
              <label className="form-label">Event Name<input required className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label className="form-label">Event Description<textarea required rows={4} className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="form-label">Venue<input required className="form-input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
              <label className="form-label">Start Date and Time<input required type="datetime-local" className="form-input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
            </div>
            <div className="flex flex-col gap-4">
              {!editing ? (
                <div className="space-y-3 border-t border-line pt-4 md:order-2">
                  <TicketTypePicker options={ticketTypes} value={ticketType} onChange={setTicketType} />
                  <TicketInventoryFields value={inventory} onChange={setInventory} />
                </div>
              ) : null}
              <div className="space-y-3 md:order-1">
                <label className="form-label">Banner image URL <span className="font-normal text-muted">(optional)</span><input type="url" className="form-input" value={form.bannerImageUrl} placeholder="https://example.com/banner.jpg" onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })} /></label>
                <EventBanner title={form.title || 'Event banner'} imageUrl={/^https?:\/\//i.test(form.bannerImageUrl) ? form.bannerImageUrl : undefined}
                  className={form.bannerImageUrl ? 'aspect-[1.8] rounded-lg p-5' : 'hidden aspect-[1.8] rounded-lg p-5 md:flex'} />
              </div>
              <Button type="submit" disabled={saving} className="w-full md:order-3">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Event'}</Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-3">
            {loading ? <p role="status" className="text-sm text-muted">Loading events…</p> : null}
            {!loading && !error && !events.length ? <Card className="p-5 text-sm text-muted">No events found. Create your first event.</Card> : null}
            {events.map((event) => (
              <article key={event.id} className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-line bg-white p-3 md:grid-cols-[100px_minmax(0,1fr)_auto] md:gap-5 md:p-4">
                <EventBanner title="" imageUrl={event.bannerImageUrl} className="aspect-square rounded-lg p-0" />
                <div className="min-w-0">
                  <h2 className="font-bold">{event.title}</h2>
                  <p className="mt-1 text-[13px] text-muted">{[formatEventSchedule(event.startsAt)?.day, event.venue].filter(Boolean).join(' · ')}</p>
                  {event.tiers.length ? <p className="mt-1 text-xs text-muted">{event.tiers.length} ticket {event.tiers.length === 1 ? 'type' : 'types'}</p> : null}
                </div>
                <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(event)}><PencilIcon className="size-4" /> Edit Event</Button>
                  <Button size="sm" href={ticketSettingsHref + '?eventId=' + encodeURIComponent(event.id)}>Manage Tickets</Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(event)}>Delete</Button>
                </div>
              </article>
            ))}
            <div className="mt-2 flex flex-wrap gap-3"><Button href="/tickets" variant="ghost">View Public Events</Button><Button href={backHref} variant="ghost">Back to Profile</Button></div>
          </div>
        )}
      </div>
    </div>
  )
}
