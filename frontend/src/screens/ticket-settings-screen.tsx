import { useEffect, useState, type FormEvent } from 'react'
import { TopBar } from '../components/navbar'
import { Button } from '../components/button'
import { PencilIcon, TicketsIcon } from '../components/icons'
import { Card } from '../components/card'
import { TicketInventoryFields, TicketTypePicker } from '../components/ticket-type-fields'
import { cn } from '../lib/cn'
import { formatPrice } from '../lib/format-event'
import { readInventory, ticketTypes, type InventoryDraft } from '../lib/ticket-types'
import { getOrganizerEvent, addEventTier, updateEventTier, deleteEventTier, type EventRecord, type EventTier } from '../lib/events-api'

export function TicketSettingsScreen({ backHref }: { backHref: string }) {
  const params = new URLSearchParams(window.location.search)
  const eventId = params.get('eventId') || ''
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [inventory, setInventory] = useState<InventoryDraft>({ price: '', quantity: '' })
  const [selected, setSelected] = useState('')
  const [customName, setCustomName] = useState('')
  const [editing, setEditing] = useState<EventTier>()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [togglingTier, setTogglingTier] = useState<string>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(params.get('created') === '1' ? 'Event created. Your first ticket type is ready.' : '')
  const availableTypes = ticketTypes.filter((name) => !event?.tiers.some((tier) => tier.name.toLowerCase() === name.toLowerCase()))

  useEffect(() => {
    if (!eventId) return
    let active = true
    getOrganizerEvent(eventId).then((item) => { if (active) setEvent(item) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load ticket types.') })
    return () => { active = false }
  }, [eventId])

  function startEdit(tier?: EventTier) {
    setEditing(tier)
    setInventory(tier ? { price: String(tier.price / 100), quantity: String(tier.quantityAvailable) } : { price: '', quantity: '' })
    setSelected(availableTypes[0] || '')
    setCustomName('')
    setError('')
    setNotice('')
    setOpen(true)
    window.scrollTo(0, 0)
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const name = selected || customName.trim()
    if (!editing && !name) {
      setError('Enter a name for the custom ticket type.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const values = readInventory(inventory)
      if (editing) {
        const patch = {
          ...(editing.price !== values.price ? { price: values.price } : {}),
          ...(editing.quantityAvailable !== values.quantityAvailable ? { quantityAvailable: values.quantityAvailable } : {}),
        }
        if (Object.keys(patch).length) {
          await updateEventTier(eventId, editing.id, patch)
          setEvent((current) => current && ({ ...current, tiers: current.tiers.map((tier) => tier.id === editing.id ? { ...tier, ...patch } : tier) }))
          setNotice('Ticket type updated.')
        }
      } else {
        await addEventTier(eventId, { name, ...values })
        setNotice(name + ' tickets added.')
        try { setEvent(await getOrganizerEvent(eventId)) }
        catch { setError('The ticket type was saved. Reload this page to see it.') }
      }
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save ticket type.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleTier(tier: EventTier) {
    if (togglingTier || tier.isActive === undefined) return
    const isActive = !tier.isActive
    setTogglingTier(tier.id)
    setError('')
    setNotice('')
    try {
      await updateEventTier(eventId, tier.id, { isActive })
      setEvent((current) => current && ({
        ...current,
        tiers: current.tiers.map((item) => item.id === tier.id ? { ...item, isActive } : item),
      }))
      setNotice(tier.name + (isActive ? ' is now on sale.' : ' is paused.'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change ticket availability.')
    } finally {
      setTogglingTier(undefined)
    }
  }

  async function remove(tier: EventTier) {
    if (busy || !window.confirm('Delete the ' + tier.name + ' ticket type?')) return
    setBusy(true)
    setError('')
    try {
      await deleteEventTier(eventId, tier.id)
      setEvent((current) => current && ({ ...current, tiers: current.tiers.filter((item) => item.id !== tier.id) }))
      setNotice('Ticket type deleted.')
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete ticket type.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar narrow backHref={backHref} backLabel="Back to events" />
      <div className="flow-width flex-1 pt-3 pb-5 md:pt-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Ticket Types</h1>
            {event ? <p className="mt-2 text-sm font-semibold">{event.title}</p> : null}
          </div>
          {event && !open ? <div className="hidden md:block"><Button size="sm" disabled={Boolean(togglingTier)} onClick={() => startEdit()}>+ Add Ticket Type</Button></div> : null}
        </div>
        {notice ? <p role="status" className="mt-4 rounded-lg bg-mint px-3 py-2.5 text-sm text-forest">{notice}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {!eventId ? <Card className="mt-5 p-5 text-sm">Choose an event to manage its ticket types.</Card> : null}
        {eventId && !event && !error ? <p role="status" className="mt-5 text-sm text-muted">Loading ticket types…</p> : null}
        {open ? (
          <form onSubmit={save} className="mt-5 space-y-4 rounded-xl border border-line p-4 md:p-5">
            <h2 className="font-bold">{editing ? 'Edit ' + editing.name : 'Add Ticket Type'}</h2>
            {!editing ? (
              <>
                <TicketTypePicker options={[...availableTypes, 'Custom']} value={selected || 'Custom'} onChange={(name) => setSelected(name === 'Custom' ? '' : name)} />
                {!selected ? <label className="form-label">Custom name<input required maxLength={100} className="form-input" value={customName} onChange={(e) => setCustomName(e.target.value)} /></label> : null}
              </>
            ) : null}
            <TicketInventoryFields value={inventory} onChange={setInventory} minimum={editing?.quantityAvailable === 0 ? 0 : 1} />
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Ticket Type'}</Button>
            <div className="flex items-center justify-between">
              <Button variant="ghost" disabled={busy} onClick={() => { setOpen(false); setError('') }}>Cancel</Button>
              {editing ? <button type="button" disabled={busy} onClick={() => void remove(editing)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete ticket type</button> : null}
            </div>
          </form>
        ) : event ? (
          <div className="mt-5 grid gap-3">
            {event.tiers.map((tier) => (
              <article key={tier.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-l-[3px] border-line px-3.5 py-3', tier.name.toLowerCase() === 'vip' ? 'border-l-amber' : 'border-l-forest')}>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold">{tier.name}</h2>
                  <p className="mt-1 text-lg font-bold tabular-nums">{formatPrice(tier.price)}</p>
                  <p className="mt-1.5 text-xs text-muted">Limit: {tier.quantityAvailable.toLocaleString()}</p>
                  {tier.quantitySold !== undefined ? <p className="mt-1 text-xs text-muted">Sold: {tier.quantitySold.toLocaleString()}</p> : null}
                </div>
                <div className="grid justify-items-end gap-1">
                  {tier.isActive !== undefined ? (
                    <button type="button" role="switch" aria-label={tier.name + ' on sale'} aria-checked={tier.isActive}
                      disabled={Boolean(togglingTier)} onClick={() => void toggleTier(tier)}
                      className="grid min-h-11 min-w-12 place-items-center rounded-lg disabled:opacity-60">
                      <span className={cn('relative h-[22px] w-10 rounded-full border transition-colors', tier.isActive ? 'border-forest bg-forest' : 'border-[#c6cfc8] bg-[#e7ece8]')}>
                        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none', tier.isActive && 'translate-x-[18px]')} />
                      </span>
                    </button>
                  ) : null}
                  <button type="button" aria-label={'Edit ' + tier.name} disabled={Boolean(togglingTier)} onClick={() => startEdit(tier)} className="grid size-11 place-items-center rounded-lg text-ink hover:bg-mint disabled:opacity-50"><PencilIcon className="size-[18px]" /></button>
                </div>
              </article>
            ))}
            {event.tiers.some((tier) => tier.isActive === undefined) ? <p className="text-xs text-muted">The connected API does not support pausing ticket sales yet.</p> : null}
            {!event.tiers.length ? <Card className="p-5 text-sm text-muted"><TicketsIcon className="mb-2 size-5 text-forest" />Add a ticket type to let people book this event.</Card> : null}
          </div>
        ) : null}
      </div>
      {event && !open ? <div className="sticky bottom-0 border-t border-line bg-white pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"><div className="flow-width"><Button className="w-full" disabled={Boolean(togglingTier)} onClick={() => startEdit()}>+ Add Ticket Type</Button></div></div> : null}
    </div>
  )
}
