import { and, asc, count, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "#config/db.js";
import { organizerPayouts, orders, users } from "#db/schema.js";
import { ConflictError, ForbiddenError, NotFoundError } from "#shared/utils/errors.js";
import { MINIMUM_NGN_CHARGE_KOBO, payoutTerms } from "#features/payments/index.js";
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
type EventListItem = PublicEvent & { isPublished: boolean };

/**
 * Public-facing ticket tier projection — excludes internal inventory fields like quantityReserved and quantitySold.
 * Unauthenticated clients see only the tier name, price, and available quantity.
 */
export type PublicTicketTier = Pick<
  typeof ticketTiers.$inferSelect,
  "id" | "name" | "price" | "quantityAvailable"
> & { quantityRemaining: number };

export async function listActiveEvents(input: { limit: number; offset: number; organizerId?: string }): Promise<{
  items: EventListItem[];
  total: number;
}> {
  const db = getDb();
  const condition = and(isNull(events.deletedAt),
    input.organizerId === undefined ? eq(events.isPublished, true) : eq(events.organizerId, input.organizerId));
  const [items, countRows] = await Promise.all([
    db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        bannerImageUrl: events.bannerImageUrl,
        venue: events.venue,
        startsAt: events.startsAt,
        isPublished: events.isPublished,
      })
      .from(events)
      .where(condition)
      .orderBy(asc(events.startsAt), asc(events.createdAt), asc(events.id))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ total: count() }).from(events).where(condition),
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
  if (!event?.isPublished || event.deletedAt) {
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

  if (!payoutTerms()) return { event: publicEvent, tiers: [] };
  const [payout] = await getDb().select({ organizerId: organizerPayouts.organizerId }).from(organizerPayouts)
    .innerJoin(users, eq(organizerPayouts.organizerId, users.id))
    .where(and(eq(organizerPayouts.organizerId, event.organizerId),
      isNull(users.deletedAt), isNull(users.organizerSuspendedAt), eq(users.isEmailVerified, true)));
  if (!payout) return { event: publicEvent, tiers: [] };

  const tiers = await getDb()
    .select({
      id: ticketTiers.id,
      name: ticketTiers.name,
      price: ticketTiers.price,
      quantityAvailable: ticketTiers.quantityAvailable,
      quantityRemaining: sql<number>`${ticketTiers.quantityAvailable} - ${ticketTiers.quantityReserved} - ${ticketTiers.quantitySold}`,
    })
    .from(ticketTiers)
    .where(and(eq(ticketTiers.eventId, eventId), eq(ticketTiers.isActive, true), gte(ticketTiers.price, MINIMUM_NGN_CHARGE_KOBO)))
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

export async function listEventTiers(eventId: string): Promise<TicketTier[]> {
  return getDb().select().from(ticketTiers).where(eq(ticketTiers.eventId, eventId))
    .orderBy(asc(ticketTiers.price), asc(ticketTiers.name));
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
    isActive?: boolean | undefined;
  }>;
}): Promise<{ event: Event; tiers: TicketTier[] }> {
  return getDb().transaction(async (tx) => {
    const [organizer] = await tx.update(users).set({
      organizerApprovedAt: sql`coalesce(${users.organizerApprovedAt}, now())`,
    }).where(and(eq(users.id, input.organizerId), eq(users.isEmailVerified, true),
      isNull(users.organizerSuspendedAt), isNull(users.deletedAt))).returning({ id: users.id });
    if (!organizer) throw new ForbiddenError("This account cannot create events.");

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

    const tiers = input.tiers.length ? await tx
      .insert(ticketTiers)
      .values(input.tiers.map((tier) => ({ ...tier, eventId: event.id })))
      .returning() : [];

    return { event, tiers };
  });
}

export async function publishOwnedEvent(eventId: string, organizerId: string): Promise<Event> {
  return getDb().transaction(async (tx) => {
    const condition = and(eq(events.id, eventId), eq(events.organizerId, organizerId), isNull(events.deletedAt));
    const [event] = await tx.select().from(events).where(condition).for("update");
    if (!event) throw new NotFoundError("Event not found");
    if (event.isPublished) return event;

    const [payout] = await tx.select({ organizerId: organizerPayouts.organizerId }).from(organizerPayouts)
      .where(eq(organizerPayouts.organizerId, organizerId));
    if (!payout) throw new ConflictError("Set up your payout account before publishing.");

    const [tier] = await tx.select({ id: ticketTiers.id }).from(ticketTiers)
      .where(and(eq(ticketTiers.eventId, eventId), eq(ticketTiers.isActive, true), gte(ticketTiers.price, MINIMUM_NGN_CHARGE_KOBO))).limit(1).for("share");
    if (!tier) throw new ConflictError("Enable at least one ticket tier priced at ₦50 or more before publishing.");

    const [published] = await tx.update(events).set({ isPublished: true, updatedAt: new Date() }).where(condition).returning();
    return published!;
  });
}

export async function getEventSales(eventId: string): Promise<{ grossKobo: number; platformFeeKobo: number }> {
  const [summary] = await getDb().select({
    grossKobo: sql<number>`coalesce(sum(${orders.totalKobo}), 0)`.mapWith(Number),
    platformFeeKobo: sql<number>`coalesce(sum(${orders.platformFeeKobo}), 0)`.mapWith(Number),
  }).from(orders).where(and(eq(orders.eventId, eventId), eq(orders.status, "paid"), isNull(orders.deletedAt)));
  return summary ?? { grossKobo: 0, platformFeeKobo: 0 };
}

export async function updateEvent(
  eventId: string,
  organizerId: string,
  input: Partial<
    Pick<Event, "title" | "description" | "bannerImageUrl" | "venue" | "startsAt">
  >
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

export async function softDeleteEvent(
  eventId: string,
  organizerId: string
): Promise<Event | undefined> {
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
  isActive?: boolean | undefined;
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
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
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
  input: Partial<Pick<TicketTier, "name" | "price" | "quantityAvailable" | "isActive">>
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

export async function findEventById(eventId: string): Promise<Event | undefined> {
  const [event] = await getDb().select().from(events).where(eq(events.id, eventId)).limit(1);
  return event;
}
