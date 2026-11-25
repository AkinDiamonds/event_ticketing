import type { EventRecord } from './events-api'

const KEY = 'lasu_checkout_draft'

export type AttendeeDetails = {
  firstName: string
  lastName: string
  email: string
  phone: string
  organization?: string
  department: string
}

export type CheckoutDraft = {
  event: EventRecord
  tierId: string
  quantity: number
  attendee?: AttendeeDetails
  orderId?: string
  paymentUrl?: string
}

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as CheckoutDraft
    return draft?.event?.id && draft.tierId ? draft : null
  } catch {
    return null
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft))
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(KEY)
}
