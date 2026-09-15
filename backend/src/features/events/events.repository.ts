import { and, asc, count, eq, isNull } from "drizzle-orm";
import { getDb } from "#config/db.js";
import { promoteUserToOrganizer } from "#features/auth/index.js";
import { events, ticketTiers } from "./events.schema.js";

export type Event = typeof events.$inferSelect;
export type TicketTier = typeof ticketTiers.$inferSelect;

/**
 * Public-facing event projection — excludes internal fields like organizerId, createdAt, updatedAt.
 * Unauthenticated clients see only the event details needed for browsing and purchasing.
 */
export type PublicEvent = Pick<
  typeof events.$inferSelect,
  "id" | "title" | "description" | "bannerImageUrl" | "venue" | "startsAt"
>;

/**
 * Public-facing ticket tier projection — excludes internal inventory fields like quantityReserved and quantitySold.
 * Unauthenticated clients see only the tier name, price, and available quantity.
 */
export type PublicTicketTier = Pick<typeof ticketTiers.$inferSelect, "id" | "name" | "price" | "quantityAvailable">;

export async function listActiveEvents(input: { limit: number; offset: number }): Promise<{
  items: PublicEvent[];
  total: number;
}> {
  const db = getDb();
  const [items, countRows] = await Promise.all([
    db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        bannerImageUrl: events.bannerImageUrl,
        venue: events.venue,
        startsAt: events.startsAt,
      })
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
      event: PublicEvent;
      tiers: PublicTicketTier[];
    }
  | undefined
> {
  const event = await findEventById(eventId);
  if (!event || event.deletedAt) {
    return undefined;
  }

  const publicEvent: PublicEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    bannerImageUrl: event.bannerImageUrl,
    venue: event.venue,
    startsAt: event.startsAt,
  };

  const tiers = await getDb()
    .select({
      id: ticketTiers.id,
      name: ticketTiers.name,
      price: ticketTiers.price,
      quantityAvailable: ticketTiers.quantityAvailable,
    })
    .from(ticketTiers)
    .where(eq(ticketTiers.eventId, eventId))
    .orderBy(asc(ticketTiers.price), asc(ticketTiers.name));

  return { event: publicEvent, tiers };
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
  organizerId: string,
  input: Partial<Pick<Event, "title" | "description" | "bannerImageUrl" | "venue" | "startsAt">>
): Promise<Event | undefined> {
  const [event] = await getDb()
    .update(events)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizerId, organizerId),
        isNull(events.deletedAt)
      )
    )
    .returning();

  return event;
}

export async function softDeleteEvent(eventId: string, organizerId: string): Promise<Event | undefined> {
  const [event] = await getDb()
    .update(events)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizerId, organizerId),
        isNull(events.deletedAt)
      )
    )
    .returning();

  return event;
}

export async function createTier(input: {
  eventId: string;
  organizerId: string;
  name: string;
  price: number;
  quantityAvailable: number;
}): Promise<TicketTier | undefined> {
  return getDb().transaction(async (tx) => {
    // Atomically verify event exists, is owned, and not deleted before inserting tier
    const [event] = await tx
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, input.eventId),
          eq(events.organizerId, input.organizerId),
          isNull(events.deletedAt)
        )
      )
      .limit(1);

    if (!event) {
      return undefined;
    }

    const [tier] = await tx
      .insert(ticketTiers)
      .values({
        eventId: input.eventId,
        name: input.name,
        price: input.price,
        quantityAvailable: input.quantityAvailable,
      })
      .returning();

    if (!tier) {
      throw new Error("Ticket tier insert returned no row");
    }

    return tier;
  });
}

export async function updateTier(
  tierId: string,
  eventId: string,
  organizerId: string,
  input: Partial<Pick<TicketTier, "name" | "price" | "quantityAvailable">>
): Promise<TicketTier | undefined> {
  return getDb().transaction(async (tx) => {
    // Atomically verify event exists, is owned, and not deleted before updating tier
    const [event] = await tx
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

    if (!event) {
      return undefined;
    }

    const [tier] = await tx
      .update(ticketTiers)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(ticketTiers.id, tierId), eq(ticketTiers.eventId, eventId)))
      .returning();

    return tier;
  });
}

export async function deleteTier(
  tierId: string,
  eventId: string,
  organizerId: string
): Promise<TicketTier | undefined> {
  return getDb().transaction(async (tx) => {
    // Atomically verify event exists, is owned, and not deleted before deleting tier
    const [event] = await tx
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

    if (!event) {
      return undefined;
    }

    const [tier] = await tx
      .delete(ticketTiers)
      .where(and(eq(ticketTiers.id, tierId), eq(ticketTiers.eventId, eventId)))
      .returning();

    return tier;
  });
}

async function findEventById(eventId: string): Promise<Event | undefined> {
  const [event] = await getDb().select().from(events).where(eq(events.id, eventId)).limit(1);
  return event;
}