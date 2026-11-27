import { useEffect, useState, type FormEvent } from 'react'
import { TopBar } from '../components/navbar'
import { Button } from '../components/button'
import { PencilIcon, TicketsIcon } from '../components/icons'
import { Card } from '../components/card'
import { PayoutSetup } from '../components/payout-setup'
import { TicketInventoryFields, TicketTypePicker } from '../components/ticket-type-fields'
import { cn } from '../lib/cn'
import { formatPrice } from '../lib/format-event'
import { readInventory, ticketTypes, type InventoryDraft } from '../lib/ticket-types'
import { getOrganizerEvent, addEventTier, updateEventTier, deleteEventTier, getPayoutAccount, publishEvent, type EventRecord, type EventTier, type PayoutAccount } from '../lib/events-api'

function SaleSwitch({ active, label, disabled, onChange }: {
  active: boolean; label: string; disabled?: boolean; onChange: () => void
}) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={active} disabled={disabled} onClick={onChange}
      className="grid min-h-11 min-w-12 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-60">
      <span className={cn('relative h-[22px] w-10 rounded-full border transition-colors', active ? 'border-forest bg-forest' : 'border-[#b8c4bd] bg-[#e7ece8]')}>
        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none', active && 'translate-x-[18px]')} />
      </span>
    </button>
  )
}

export function TicketSettingsScreen({ backHref }: { backHref: string }) {
  const params = new URLSearchParams(window.location.search)
  const eventId = params.get('eventId') || ''
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>()
  const [payoutError, setPayoutError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [inventory, setInventory] = useState<InventoryDraft>({ price: '', quantity: '' })
  const [selected, setSelected] = useState('')
  const [customName, setCustomName] = useState('')
  const [onSale, setOnSale] = useState(false)
  const [editing, setEditing] = useState<EventTier>()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [togglingTier, setTogglingTier] = useState<string>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(params.get('created') === '1' ? 'Draft saved. Add ticket types and set up payouts when you’re ready to sell.' : '')
  const availableTypes = ticketTypes.filter((name) => !event?.tiers.some((tier) => tier.name.toLowerCase() === name.toLowerCase()))

  useEffect(() => {
    if (!eventId) return
    let active = true
    getOrganizerEvent(eventId).then((item) => { if (active) setEvent(item) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load ticket types.') })
    getPayoutAccount().then((payout) => { if (active) setPayoutAccount(payout) })
      .catch(() => { if (active) setPayoutError('Could not load payout details. Reload the page to try again.') })
    return () => { active = false }
  }, [eventId])

  async function publish() {
    if (!event || publishing) return
    setPublishing(true)
    setError('')
    setNotice('')
    try {
      await publishEvent(eventId)
      setEvent({ ...event, isPublished: true })
      setNotice('Event published. Enabled tickets can now be purchased.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish the event.')
    } finally {
      setPublishing(false)
    }
  }

  function startEdit(tier?: EventTier) {
    setEditing(tier)
    setInventory(tier ? { price: String(tier.price / 100), quantity: String(tier.quantityAvailable) } : { price: '', quantity: '' })
    setSelected(availableTypes[0] || '')
    setCustomName(tier?.name ?? '')
    setOnSale(tier?.isActive === true)
    setError('')
    setNotice('')
    setOpen(true)
    window.scrollTo(0, 0)
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const name = editing ? customName.trim() : selected || customName.trim()
    if (!name) {
      setError('Enter a ticket type name.')
      return
    }
    if (event?.tiers.some((tier) => tier.id !== editing?.id && tier.name.toLowerCase() === name.toLowerCase())) {
      setError('A ticket type with that name already exists.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const values = { name, ...readInventory(inventory), isActive: onSale }
      if (editing) {
        const changes = {
          ...(editing.name === values.name ? {} : { name }),
          ...(editing.price === values.price ? {} : { price: values.price }),
          ...(editing.quantityAvailable === values.quantityAvailable ? {} : { quantityAvailable: values.quantityAvailable }),
          ...(editing.isActive === values.isActive ? {} : { isActive: onSale }),
        }
        if (Object.keys(changes).length) {
          const updated = await updateEventTier(eventId, editing.id, changes)
          setEvent((current) => current && ({ ...current, tiers: current.tiers.map((tier) => tier.id === updated.id ? updated : tier) }))
          setNotice(name + ' updated.')
        }
      } else {
        const added = await addEventTier(eventId, values)
        setEvent((current) => current && ({ ...current, tiers: [...current.tiers, added] }))
        setNotice(name + (onSale ? (event?.isPublished ? ' is now on sale.' : ' will go on sale when you publish.') : ' was added with sales paused.'))
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
      const updated = await updateEventTier(eventId, tier.id, { isActive })
      setEvent((current) => current && ({
        ...current,
        tiers: current.tiers.map((item) => item.id === tier.id ? updated : item),
      }))
      setNotice(tier.name + (isActive ? (event?.isPublished ? ' is now on sale.' : ' will go on sale when you publish.') : ' is paused.'))
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
            <h1 className="page-title">Ticket Setup</h1>
            {event ? <p className="mt-2 text-sm font-semibold">{event.title} <span className="ml-2 text-xs text-muted">{event.isPublished ? 'Published' : 'Private draft'}</span></p> : null}
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
              </>
            ) : null}
            {editing || !selected ? <label className="form-label">{editing ? 'Ticket name' : 'Custom name'}<input required maxLength={100} className="form-input" value={customName} onChange={(e) => setCustomName(e.target.value)} /></label> : null}
            <TicketInventoryFields value={inventory} onChange={setInventory} minimum={Math.max(1, (editing?.quantityReserved ?? 0) + (editing?.quantitySold ?? 0))} />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-line p-3">
              <div>
                <p className="text-sm font-semibold">Put tickets on sale</p>
                <p className="mt-1 text-xs text-muted">{event?.isPublished ? 'Switch off to pause new purchases. Existing orders keep their tickets.' : 'Enable this tier to offer it when the event is published.'}</p>
              </div>
              <SaleSwitch active={onSale} label="Put tickets on sale" disabled={busy} onChange={() => setOnSale(!onSale)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Ticket Type'}</Button>
            <div className="flex items-center justify-between">
              <Button variant="ghost" disabled={busy} onClick={() => { setOpen(false); setError('') }}>Cancel</Button>
              {editing && (editing.quantitySold ?? 0) + (editing.quantityReserved ?? 0) === 0 ? <button type="button" disabled={busy} onClick={() => void remove(editing)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete ticket type</button> : null}
            </div>
          </form>
        ) : event ? (
          <div className="mt-5 grid gap-3">
            {event.tiers.map((tier) => (
              <article key={tier.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-l-[3px] border-line px-3.5 py-3', tier.name.toLowerCase() === 'vip' ? 'border-l-amber' : 'border-l-forest')}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-bold">{tier.name}</h2>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tier.isActive ? 'bg-mint text-forest' : 'bg-surface text-muted')}>{tier.isActive ? (event.isPublished ? 'On sale' : 'Ready for launch') : 'Paused'}</span>
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums">{formatPrice(tier.price)}</p>
                  <p className="mt-1.5 text-xs text-muted">{(tier.quantitySold ?? 0).toLocaleString()} sold of {tier.quantityAvailable.toLocaleString()}{tier.quantityReserved ? ' · ' + tier.quantityReserved.toLocaleString() + ' reserved' : ''}</p>
                </div>
                <div className="grid justify-items-end gap-1">
                  <SaleSwitch active={tier.isActive === true} label={tier.name + ' on sale'} disabled={Boolean(togglingTier)} onChange={() => void toggleTier(tier)} />
                  <button type="button" aria-label={'Edit ' + tier.name} disabled={Boolean(togglingTier)} onClick={() => startEdit(tier)} className="grid size-11 place-items-center rounded-lg text-ink hover:bg-mint disabled:opacity-50"><PencilIcon className="size-[18px]" /></button>
                </div>
              </article>
            ))}
            {!event.tiers.length ? <Card className="p-5 text-sm text-muted"><TicketsIcon className="mb-2 size-5 text-forest" />Add a ticket type to let people book this event.</Card> : null}
          </div>
        ) : null}
        {event && !open ? (
          <>
            {event.sales && event.isPublished ? <Card className="mt-5 flex flex-wrap items-baseline justify-between gap-2 p-4">
              <h2 className="text-sm font-semibold">Confirmed ticket revenue</h2>
              <span className="font-bold tabular-nums">{formatPrice(event.sales.grossKobo)}</span>
            </Card> : null}
            {payoutError ? <p role="alert" className="mt-5 text-sm text-red-700">{payoutError}</p> : null}
            {payoutAccount !== undefined ? <PayoutSetup account={payoutAccount} onConfigured={setPayoutAccount} /> : null}
            {!event.isPublished ? <Card className="mt-5 space-y-3 p-4 md:p-5">
              <h2 className="font-bold">Publish event</h2>
              <p className="text-sm text-muted">Your event stays private until you publish. Set up payouts and enable at least one ticket tier to open sales.</p>
              <Button variant="accent" disabled={!payoutAccount || !event.tiers.some((tier) => tier.isActive) || publishing || Boolean(togglingTier)} onClick={() => void publish()}>
                {publishing ? 'Publishing…' : 'Publish and open sales'}
              </Button>
            </Card> : null}
          </>
        ) : null}
      </div>
      {event && !open ? <div className="sticky bottom-0 border-t border-line bg-white pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"><div className="flow-width"><Button className="w-full" disabled={Boolean(togglingTier)} onClick={() => startEdit()}>+ Add Ticket Type</Button></div></div> : null}
    </div>
  )
}
