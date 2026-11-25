import { API_V1_URL } from './api-config'
import { authenticatedFetch } from './auth-api'

export type EventTier = {
  id: string
  name: string
  price: number
  quantityAvailable: number
  quantityRemaining?: number
  quantitySold?: number
  isActive?: boolean
  description?: string
}

export type EventRecord = {
  id: string
  title: string
  description?: string
  bannerImageUrl?: string
  venue?: string
  startsAt?: string
  tiers: EventTier[]
}

class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type ApiEnvelope<T> = { success?: boolean; message?: string; data?: T }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(`${API_V1_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const result = await response.json().catch(() => ({})) as ApiEnvelope<T> & { error?: string }
  if (!response.ok) throw new ApiError(result.message || result.error || `Request failed (${response.status})`, response.status)
  return result.data as T
}

function normalizeEvent(value: unknown): EventRecord {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const event = (record.event && typeof record.event === 'object' ? record.event : record) as Record<string, unknown>
  const id = String(event.id ?? event._id ?? '')
  const rawTiers = [record.tiers, record.ticketTiers, event.tiers, event.ticketTiers].find(Array.isArray) ?? []
  const tiers = rawTiers.map((value) => {
    const tier = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
    return {
      id: String(tier.id ?? tier._id ?? ''),
      name: String(tier.name ?? tier.title ?? ''),
      price: Number(tier.price),
      quantityAvailable: Number(tier.quantityAvailable ?? tier.quantity),
      quantityRemaining: typeof tier.quantityRemaining === 'number' ? tier.quantityRemaining : undefined,
      quantitySold: typeof tier.quantitySold === 'number' ? tier.quantitySold : undefined,
      isActive: typeof tier.isActive === 'boolean' ? tier.isActive : undefined,
      description: typeof tier.description === 'string' ? tier.description : undefined,
    }
  })
  return {
    id,
    title: typeof event.title === 'string' ? event.title : '',
    description: typeof event.description === 'string' ? event.description : undefined,
    bannerImageUrl: typeof event.bannerImageUrl === 'string' ? event.bannerImageUrl : undefined,
    venue: typeof event.venue === 'string' ? event.venue : undefined,
    startsAt: typeof event.startsAt === 'string' ? event.startsAt : typeof event.startAt === 'string' ? event.startAt : undefined,
    tiers: tiers.filter((tier) => tier.id && tier.name && Number.isFinite(tier.price) && tier.price >= 0 && Number.isFinite(tier.quantityAvailable) && tier.quantityAvailable >= 0),
  }
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of ['events', 'items', 'results']) if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  return []
}

export async function getEvents(page = 1, limit = 20) {
  const data = await request<unknown>(`/events?page=${page}&limit=${limit}`)
  return unwrapList(data).map(normalizeEvent).filter((event) => event.id && event.title)
}

export async function getEvent(eventId: string) {
  const data = await request<unknown>(`/events/${encodeURIComponent(eventId)}`)
  const event = normalizeEvent(data)
  if (!event.id || !event.title) throw new Error('The event service returned incomplete event details.')
  return event
}

export async function getOrganizerEvent(eventId: string) {
  try {
    return normalizeEvent(await request<unknown>(`/events/${encodeURIComponent(eventId)}/tiers`))
  } catch (cause) {
    // Older deployments return an unstructured 404 for the new organizer route.
    if (!(cause instanceof ApiError) || cause.status !== 404 || cause.message !== 'Request failed (404)') throw cause
    return getEvent(eventId)
  }
}

export type CreateEventInput = {
  title: string
  description: string
  bannerImageUrl?: string | null
  venue: string
  startsAt: string
  tiers: { name: string; price: number; quantityAvailable: number }[]
}

export async function createEvent(input: CreateEventInput) {
  const data = await request<unknown>('/events', { method: 'POST', body: JSON.stringify(input) })
  return normalizeEvent(data)
}

export async function updateEvent(eventId: string, input: Partial<CreateEventInput>) {
  return request<unknown>(`/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function deleteEvent(eventId: string) {
  return request<unknown>(`/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}

export async function addEventTier(eventId: string, tier: CreateEventInput['tiers'][number]) {
  return request<unknown>(`/events/${encodeURIComponent(eventId)}/tiers`, { method: 'POST', body: JSON.stringify(tier) })
}

export async function updateEventTier(eventId: string, tierId: string, tier: Partial<CreateEventInput['tiers'][number]> & { isActive?: boolean }) {
  return request<unknown>(`/events/${encodeURIComponent(eventId)}/tiers/${encodeURIComponent(tierId)}`, { method: 'PATCH', body: JSON.stringify(tier) })
}

export async function deleteEventTier(eventId: string, tierId: string) {
  return request<unknown>(`/events/${encodeURIComponent(eventId)}/tiers/${encodeURIComponent(tierId)}`, { method: 'DELETE' })
}

export async function checkInTicket(eventId: string, code: string) {
  return request<unknown>(`/events/${encodeURIComponent(eventId)}/check-in`, { method: 'POST', body: JSON.stringify({ code }) })
}

export type CheckoutInput = {
  eventId: string
  items: { tierId: string; quantity: number }[]
  callbackUrl: string
}

export async function checkout(input: CheckoutInput) {
  return request<unknown>('/orders/checkout', { method: 'POST', body: JSON.stringify(input) })
}

export async function getOrder(orderId: string) {
  return request<unknown>(`/orders/${encodeURIComponent(orderId)}`)
}

export async function cleanupExpiredOrders() {
  return request<unknown>('/orders/admin/cleanup-expired', { method: 'POST' })
}
