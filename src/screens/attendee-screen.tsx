import { Button } from '../components/button'
import { TopBar } from '../components/navbar'
import { Field, Stepper } from '../components/form'

type AttendeeScreenProps = {
  backHref: string
  continueHref: string
}

export function AttendeeScreen({ backHref, continueHref }: AttendeeScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfaf7]">
      <TopBar title="Attendee Information" subtitle="Fill in your details" backHref={backHref} />
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <Stepper
          items={[
            { label: 'Ticket', complete: true },
            { label: 'Information', active: true },
            { label: 'Payment' },
          ]}
        />

        <div className="mt-5 space-y-4">
          <Field label="First Name" value="John" />
          <Field label="Last Name" value="Doe" />
          <Field label="Email Address" value="john.doe@lasu.edu.ng" />
          <Field label="Phone Number" value="08012345678" />
          <Field label="Matric Number" value="20/123456" optional />
          <Field label="Department" value="Computer Science" optional />
        </div>

        <div className="mt-5">
          <Button className="w-full" href={continueHref}>
            Continue to Payment
          </Button>
        </div>
      </div>
    </div>
  )
}
