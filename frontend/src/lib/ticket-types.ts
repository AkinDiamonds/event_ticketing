import type { EventTier } from './events-api'

export function ticketsRemaining(tier: EventTier) {
  return tier.isActive === false ? 0 : tier.quantityRemaining ?? tier.quantityAvailable
}

export const ticketTypes = ['Regular', 'Early Bird', 'VIP'] as const

export type InventoryDraft = { price: string; quantity: string }

export function readInventory({ price, quantity }: InventoryDraft) {
  return { price: Math.round(Number(price) * 100), quantityAvailable: Number(quantity) }
}
