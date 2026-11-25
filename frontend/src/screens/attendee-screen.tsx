import type { AttendeeDetails } from '../lib/checkout-state'
import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { Stepper } from '../components/form'

type Props = {
  backHref: string
  attendee: AttendeeDetails
  onChange: (key: keyof AttendeeDetails, value: string) => void
  onContinue: () => void
  unavailable: boolean
}

const fields: { key: keyof AttendeeDetails; label: string; type?: string; autoComplete?: string; wide?: boolean; optional?: boolean }[] = [
  { key: 'firstName', label: 'First Name', autoComplete: 'given-name' },
  { key: 'lastName', label: 'Last Name', autoComplete: 'family-name' },
  { key: 'email', label: 'Email Address', type: 'email', autoComplete: 'email', wide: true },
  { key: 'phone', label: 'Phone Number', type: 'tel', autoComplete: 'tel', wide: true },
  { key: 'organization', label: 'Organization or Institution', autoComplete: 'organization', optional: true },
  { key: 'department', label: 'Department or Team', optional: true },
]

export function AttendeeScreen({ backHref, attendee, onChange, onContinue, unavailable }: Props) {
  return (
    <div className="pb-10">
      <TopBar narrow backHref={backHref} />
      <div className="flow-width pt-3 md:pt-7">
        <h1 className="page-title">Attendee Information</h1>
        <p className="page-description">Fill in your details.</p>
        {unavailable ? (
          <div role="alert" className="mt-6 rounded-xl border border-line p-4 text-sm">
            Your ticket selection is missing. <a className="font-semibold text-forest underline" href={backHref}>Choose tickets</a> to continue.
          </div>
        ) : (
          <>
            <div className="mx-auto mt-7 max-w-[620px]">
              <Stepper items={[{ label: 'Ticket', complete: true }, { label: 'Information', active: true }, { label: 'Payment' }]} />
            </div>
            <form className="mt-7" onSubmit={(event) => { event.preventDefault(); onContinue() }}>
              <div className="grid gap-4 md:grid-cols-2 md:gap-x-5">
                {fields.map((field) => (
                  <label key={field.key} className={field.wide ? 'form-label md:col-span-2' : 'form-label'}>
                    {field.label}{field.optional ? <span className="ml-1 font-normal text-muted">(Optional)</span> : null}
                    <input name={field.key} required={!field.optional} type={field.type || 'text'} autoComplete={field.autoComplete}
                      value={attendee[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)} className="form-input" />
                  </label>
                ))}
              </div>
              <Button type="submit" className="mt-7 w-full">Continue to Payment</Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
