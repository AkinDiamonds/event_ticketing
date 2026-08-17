import { cn } from '../lib/cn'
import { MinusIcon, PlusIcon } from './icons'

type FieldProps = {
  label: string
  placeholder?: string
  value?: string
  optional?: boolean
}

export function Field({ label, placeholder, value, optional }: FieldProps) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-[#3b3b3b]">
        <span>
          {label}
          {optional ? <span className="ml-1 font-normal text-[#8c867d]">(Optional)</span> : null}
        </span>
      </div>
      <div className="rounded-[10px] border border-[#e7e1d7] bg-white px-4 py-3 text-[13px] text-[#1d1d1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {value ?? placeholder}
      </div>
    </label>
  )
}

type SearchProps = {
  placeholder: string
}

export function SearchField({ placeholder }: SearchProps) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e0d7] bg-white px-4 py-3 text-sm text-[#8c867d] shadow-[0_8px_18px_rgba(17,24,39,0.05)]">
      <span className="flex-1">{placeholder}</span>
      <span className="text-[#3a3a3a]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15 15 4 4" />
        </svg>
      </span>
    </div>
  )
}

type QuantityProps = {
  value: number
}

export function QuantityControl({ value }: QuantityProps) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#ece6d9] bg-white px-4 py-3">
      <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-[#f6f2ea] text-[#4b4b4b]">
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="text-[14px] font-semibold text-[#1f1f1f]">{value}</span>
      <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-[#f6f2ea] text-[#4b4b4b]">
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

type StepperItem = {
  label: string
  active?: boolean
  complete?: boolean
}

export function Stepper({ items }: { items: StepperItem[] }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {items.map((item, index) => {
        const dotClass = item.complete
          ? 'bg-[#1f6b42] text-white'
          : item.active
            ? 'bg-[#f2bf20] text-white'
            : 'border border-[#d9d2c6] bg-white text-[#8b857b]'

        return (
          <div key={item.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={cn('grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold', dotClass)}>
                {item.complete ? (
                  <span className="text-base">✓</span>
                ) : item.active ? (
                  <span>2</span>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={cn('text-[11px] font-medium', item.complete || item.active ? 'text-[#173b27]' : 'text-[#8d8577]')}>
                {item.label}
              </span>
            </div>
            {index < items.length - 1 ? (
              <div className={cn('mx-2 h-[2px] flex-1 rounded-full', item.complete ? 'bg-[#1f6b42]' : 'bg-[#dfd8cb]')} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

