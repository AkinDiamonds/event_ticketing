import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "#config/db.js";
import { events, ticketTiers } from "#features/events/events.schema.js";
import { orders, tickets } from "#features/orders/orders.schema.js";
import { ConflictError, NotFoundError } from "#shared/utils/errors.js";
import logger from "#shared/utils/logger.js";

export interface CheckInResult {
  code: string;
  tierName: string;
  checkedInAt: string;
}

/**
 * Atomically redeems a ticket code for an event door check-in.
 *
 * Requirements & Behavior:
 * 1. Single atomic UPDATE conditionally transitions status from 'valid' -> 'used'
 *    and records the UTC timestamp.
 * 2. Scoped to the requesting organizer and specific event (ownership check in EXISTS subquery).
 * 3. If valid and unredeemed -> returns 200 payload { code, tierName, checkedInAt }.
 * 4. If already redeemed -> returns 409 Conflict with structured error containing prior check-in timestamp.
 * 5. If nonexistent or belongs to another event/organizer -> returns 404 Not Found (no existence leakage).
 */
export async function checkInTicket(
  eventId: string,
  organizerId: string,
  code: string
): Promise<CheckInResult> {
  const db = getDb();

  // ── Step 1: Atomic conditional update ──────────────────────────────────
  const [updated] = await db
    .update(tickets)
    .set({
      status: "used",
      checkedInAt: sql`NOW()`,
    })
    .where(
      and(
        eq(tickets.code, code),
        eq(tickets.status, "valid"),
        sql`EXISTS (
          SELECT 1 FROM ${orders} o
          JOIN ${events} e ON e.id = o.event_id
          WHERE o.id = ${tickets.orderId}
            AND e.id = ${eventId}
            AND e.organizer_id = ${organizerId}
            AND e.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND o.status = 'paid'
        )`
      )
    )
    .returning({
      id: tickets.id,
      code: tickets.code,
      checkedInAt: tickets.checkedInAt,
      ticketTierId: tickets.ticketTierId,
    });

  if (updated) {
    const [tier] = await db
      .select({ name: ticketTiers.name })
      .from(ticketTiers)
      .where(eq(ticketTiers.id, updated.ticketTierId))
      .limit(1);

    const checkedInAtIso = updated.checkedInAt
      ? updated.checkedInAt.toISOString()
      : new Date().toISOString();

    logger.info("checkInTicket: ticket checked in successfully", {
      ticketId: updated.id,
      code: updated.code,
      eventId,
      organizerId,
    });

    return {
      code: updated.code,
      tierName: tier?.name ?? "Standard",
      checkedInAt: checkedInAtIso,
    };
  }

  // ── Step 2: Differentiate 409 vs 404 ───────────────────────────────────
  const [existingTicket] = await db
    .select({
      id: tickets.id,
      status: tickets.status,
      checkedInAt: tickets.checkedInAt,
    })
    .from(tickets)
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .innerJoin(events, eq(events.id, orders.eventId))
    .where(
      and(
        eq(tickets.code, code),
        eq(events.id, eventId),
        eq(events.organizerId, organizerId),
        eq(orders.status, "paid"),
        isNull(events.deletedAt),
        isNull(orders.deletedAt)
      )
    )
    .limit(1);

  if (existingTicket && existingTicket.status === "used") {
    const previousCheckInIso = existingTicket.checkedInAt
      ? existingTicket.checkedInAt.toISOString()
      : undefined;

    logger.warn("checkInTicket: duplicate scan attempt", {
      ticketId: existingTicket.id,
      code,
      eventId,
      organizerId,
      checkedInAt: previousCheckInIso,
    });

    throw new ConflictError("Ticket already checked in", [
      {
        code: "TICKET_USED",
        ...(previousCheckInIso ? { checked_in_at: previousCheckInIso } : {}),
      },
    ]);
  }

  logger.warn("checkInTicket: ticket not found or wrong organizer/event", {
    code,
    eventId,
    organizerId,
  });

  throw new NotFoundError("Ticket not found");
}
