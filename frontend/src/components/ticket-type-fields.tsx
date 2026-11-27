import { cn } from '../lib/cn'
import type { InventoryDraft } from '../lib/ticket-types'

export function TicketTypePicker({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (name: string) => void }) {
  return (
    <fieldset>
      <legend className="form-label">Ticket type</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((name) => (
          <label key={name} className="cursor-pointer">
            <input type="radio" name="ticket-type" value={name} checked={value === name} onChange={() => onChange(name)} className="peer sr-only" />
            <span className={cn(
              'flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest',
              value === name ? 'border-forest bg-mint text-forest' : 'border-line bg-white hover:bg-mint',
            )}>{name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function TicketInventoryFields({ value, onChange, minimum = 1 }: { value: InventoryDraft; onChange: (value: InventoryDraft) => void; minimum?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="form-label">Price (₦)
        <input required type="number" inputMode="decimal" min="50" max="21474836.47" step="0.01" className="form-input" value={value.price} onChange={(e) => onChange({ ...value, price: e.target.value })} />
      </label>
      <label className="form-label">Quantity
        <input required type="number" inputMode="numeric" min={minimum} max="2147483647" step="1" className="form-input" value={value.quantity} onChange={(e) => onChange({ ...value, quantity: e.target.value })} />
      </label>
    </div>
  )
}
