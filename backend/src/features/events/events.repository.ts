import { and, asc, count, eq, isNull } from "drizzle-orm";
import { getDb } from "#config/db.js";
import { promoteUserToOrganizer } from "#features/auth/index.js";
import { events, ticketTiers } from "./events.schema.js";

export type Event = typeof events.$inferSelect;
export type TicketTier = typeof ticketTiers.$inferSelect;

export async function listActiveEvents(input: { limit: number; offset: number }): Promise<{
  items: Event[];
  total: number;
}> {
  const db = getDb();
  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(events)
      .where(isNull(events.deletedAt))
      .orderBy(asc(events.startsAt), asc(events.createdAt))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ total: count() }).from(events).where(isNull(events.deletedAt)),
  ]);

  return { items, total: Number(countRows[0]?.total ?? 0) };
}

export async function findActiveEventById(eventId: string): Promise<
  | {
      event: Event;
      tiers: TicketTier[];
    }
  | undefined
> {
  const event = await findEventById(eventId);
  if (!event || event.deletedAt) {
    return undefined;
  }

  const tiers = await getDb()
    .select()
    .from(ticketTiers)
    .where(eq(ticketTiers.eventId, eventId))
    .orderBy(asc(ticketTiers.price), asc(ticketTiers.name));

  return { event, tiers };
}

export async function findOwnedEvent(
  eventId: string,
  organizerId: string
): Promise<Event | undefined> {
  const [event] = await getDb()
    .select()
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizerId, organizerId),
        isNull(events.deletedAt)
      )
    )
    .limit(1);

  return event;
}

export async function findOwnedTier(
  eventId: string,
  tierId: string,
  organizerId: string
): Promise<TicketTier | undefined> {
  const [tier] = await getDb()
    .select({ tier: ticketTiers })
    .from(ticketTiers)
    .innerJoin(events, eq(ticketTiers.eventId, events.id))
    .where(
      and(
        eq(ticketTiers.id, tierId),
        eq(ticketTiers.eventId, eventId),
        eq(events.organizerId, organizerId),
        isNull(events.deletedAt)
      )
    )
    .limit(1);

  return tier?.tier;
}

export async function createEventWithTiers(input: {
  organizerId: string;
  title: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  venue: string;
  startsAt: Date;
  tiers: Array<{
    name: string;
    price: number;
    quantityAvailable: number;
  }>;
}): Promise<{ event: Event; tiers: TicketTier[] }> {
  return getDb().transaction(async (tx) => {
    await promoteUserToOrganizer(tx, input.organizerId);

    const [event] = await tx
      .insert(events)
      .values({
        organizerId: input.organizerId,
        title: input.title,
        description: input.description,
        bannerImageUrl: input.bannerImageUrl,
        venue: input.venue,
        startsAt: input.startsAt,
      })
      .returning();

    if (!event) {
      throw new Error("Event insert returned no row");
    }

    const tiers = await tx
      .insert(ticketTiers)
      .values(input.tiers.map((tier) => ({ ...tier, eventId: event.id })))
      .returning();

    return { event, tiers };
  });
}

export async function updateEvent(
  eventId: string,
  input: Partial<Pick<Event, "title" | "description" | "bannerImageUrl" | "venue" | "startsAt">>
): Promise<Event | undefined> {
  const [event] = await getDb()
    .update(events)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  return event;
}

export async function softDeleteEvent(eventId: string): Promise<Event | undefined> {
  const [event] = await getDb()
    .update(events)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  return event;
}

export async function createTier(input: {
  eventId: string;
  name: string;
  price: number;
  quantityAvailable: number;
}): Promise<TicketTier> {
  const [tier] = await getDb().insert(ticketTiers).values(input).returning();

  if (!tier) {
    throw new Error("Ticket tier insert returned no row");
  }

  return tier;
}

export async function updateTier(
  tierId: string,
  input: Partial<Pick<TicketTier, "name" | "price" | "quantityAvailable">>
): Promise<TicketTier | undefined> {
  const [tier] = await getDb()
    .update(ticketTiers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(ticketTiers.id, tierId))
    .returning();

  return tier;
}

export async function deleteTier(tierId: string): Promise<TicketTier | undefined> {
  const [tier] = await getDb().delete(ticketTiers).where(eq(ticketTiers.id, tierId)).returning();
  return tier;
}

async function findEventById(eventId: string): Promise<Event | undefined> {
  const [event] = await getDb().select().from(events).where(eq(events.id, eventId)).limit(1);
  return event;
}