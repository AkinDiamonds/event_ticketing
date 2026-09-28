import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "#config/db.js";
import { events, ticketTiers } from "#db/schema.js";
import logger from "#shared/utils/logger.js";
import { AppError, ConflictError, NotFoundError } from "#shared/utils/errors.js";
import { orderItems, orders, tickets } from "./orders.schema.js";

// Inferred types
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;

// Shape of each item passed into fulfillOrder's ticket insert.
export type TicketInsert = {
  orderId: string;
  ticketTierId: string;
  code: string;
};

// Helpers
// Internal transaction type derived from getDb() so it always matches.
type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
// createOrderWithReservation

/**
 * The most critical write path in the application.
 *
 * Atomically, inside a single PostgreSQL transaction:
 *   1. Verifies that the event exists and is not soft-deleted.
 *   2. For every requested item:
 *      a. Verifies the tier exists.
 *      b. Verifies the tier belongs to the requested event.
 *      c. Atomically increments `quantityReserved` — but ONLY if the invariant holds:
 *         `quantitySold + quantityReserved + newQty <= quantityAvailable`.
 *         If the UPDATE hits 0 rows, the function distinguishes between
 *         "tier not found / wrong event" and "genuinely out of stock" and
 *         emits a structured log entry for each case before throwing.
 *   3. Inserts the `orders` row (status "pending").
 *   4. Inserts one `order_items` row per requested tier.
 *
 * Any failure auto-rolls back ALL changes, so inventory is never left
 * in a partially-decremented state.
 */
export async function createOrderWithReservation(input: {
  buyerId: string;
  eventId: string;
  items: Array<{ tierId: string; quantity: number; unitPriceKobo?: number }>;
  totalKobo?: number;
  paystackReference: string;
  reservationExpiresAt: Date;
}): Promise<Order> {
  return getDb().transaction(async (tx: DbTransaction) => {
    // ── Step 1: Verify event exists and is not soft-deleted ───────────────
    const [event] = await tx
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(and(eq(events.id, input.eventId), isNull(events.deletedAt)))
      .limit(1);

    if (!event) {
      logger.warn("createOrderWithReservation: event not found or deleted", {
        eventId: input.eventId,
        buyerId: input.buyerId,
      });
      throw new NotFoundError(`Event does not exist or has been removed`);
    }

    // ── Step 2: Reserve inventory for every item and resolve prices ───────
    const orderItemsToInsert: Array<{
      ticketTierId: string;
      quantity: number;
      unitPriceKobo: number;
    }> = [];
    let calculatedTotalKobo = 0;

    for (const item of input.items) {
      // Peek at the tier inside the transaction to verify existence and read current price.
      const [existingTier] = await tx
        .select({
          id: ticketTiers.id,
          eventId: ticketTiers.eventId,
          price: ticketTiers.price,
          quantityAvailable: ticketTiers.quantityAvailable,
          quantityReserved: ticketTiers.quantityReserved,
          quantitySold: ticketTiers.quantitySold,
        })
        .from(ticketTiers)
        .where(eq(ticketTiers.id, item.tierId))
        .limit(1);

      if (!existingTier) {
        logger.warn("createOrderWithReservation: ticket tier not found", {
          tierId: item.tierId,
          eventId: input.eventId,
          buyerId: input.buyerId,
        });
        throw new NotFoundError(`Ticket tier does not exist`);
      }

      if (existingTier.eventId !== input.eventId) {
        logger.warn("createOrderWithReservation: tier belongs to a different event", {
          tierId: item.tierId,
          tierEventId: existingTier.eventId,
          requestedEventId: input.eventId,
          buyerId: input.buyerId,
        });
        throw new AppError(422, `Ticket tier does not belong to event`);
      }

      const unitPriceKobo = item.unitPriceKobo ?? existingTier.price;
      orderItemsToInsert.push({
        ticketTierId: item.tierId,
        quantity: item.quantity,
        unitPriceKobo,
      });
      calculatedTotalKobo += unitPriceKobo * item.quantity;

      // Atomic conditional UPDATE — Postgres evaluates the WHERE clause as one
      // indivisible operation, preventing two concurrent checkouts from both
      // seeing "enough stock" and both succeeding when only one slot remains.
      const [reserved] = await tx
        .update(ticketTiers)
        .set({
          quantityReserved: sql`quantity_reserved + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ticketTiers.id, item.tierId),
            eq(ticketTiers.eventId, input.eventId),
            // Invariant: new total must not exceed available capacity
            sql`quantity_sold + quantity_reserved + ${item.quantity} <= quantity_available`
          )
        )
        .returning({ id: ticketTiers.id });

      if (!reserved) {
        // Tier exists and belongs to the event — so the only reason the
        // UPDATE matched 0 rows is that stock is exhausted.
        const remaining =
          existingTier.quantityAvailable -
          existingTier.quantityReserved -
          existingTier.quantitySold;

        logger.warn("createOrderWithReservation: tier out of stock", {
          tierId: item.tierId,
          eventId: input.eventId,
          buyerId: input.buyerId,
          requested: item.quantity,
          remaining,
        });

        throw new ConflictError(
          `Not enough stock for tier ${item.tierId}. ` +
            `Requested ${item.quantity}, but only ${remaining} ${remaining === 1 ? "spot" : "spots"} remaining`
        );
      }

      logger.debug("createOrderWithReservation: inventory reserved", {
        tierId: item.tierId,
        quantity: item.quantity,
        buyerId: input.buyerId,
      });
    }

    const orderTotalKobo = input.totalKobo ?? calculatedTotalKobo;

    // ── Step 3: Insert the order row ──────────────────────────────────────
    const [order] = await tx
      .insert(orders)
      .values({
        buyerId: input.buyerId,
        eventId: input.eventId,
        totalKobo: orderTotalKobo,
        status: "pending",
        paystackReference: input.paystackReference,
        reservationExpiresAt: input.reservationExpiresAt,
      })
      .returning();

    if (!order) {
      throw new Error(
        "Order insert returned no row — this is an internal invariant violation"
      );
    }

    // ── Step 4: Insert order items ────────────────────────────────────────
    await tx.insert(orderItems).values(
      orderItemsToInsert.map((item) => ({
        orderId: order.id,
        ticketTierId: item.ticketTierId,
        quantity: item.quantity,
        unitPriceKobo: item.unitPriceKobo,
      }))
    );

    logger.info("createOrderWithReservation: order created successfully", {
      orderId: order.id,
      eventId: input.eventId,
      buyerId: input.buyerId,
      totalKobo: orderTotalKobo,
      reference: input.paystackReference,
      itemCount: input.items.length,
      reservationExpiresAt: input.reservationExpiresAt.toISOString(),
    });

    return order;
  });
}

// ---------------------------------------------------------------------------
// findOrderById
// ---------------------------------------------------------------------------

/**
 * Looks up an order by its primary key.
 *
 * When `buyerId` is provided, the query also filters on `buyer_id` so that
 * a buyer cannot access another buyer's order.  Returns `undefined` (not a
 * 403) to avoid leaking whether the order exists at all.
 */
export async function findOrderById(
  orderId: string,
  buyerId?: string
): Promise<Order | undefined> {
  const conditions = [eq(orders.id, orderId)];
  if (buyerId) {
    conditions.push(eq(orders.buyerId, buyerId));
  }

  const [order] = await getDb()
    .select()
    .from(orders)
    .where(and(...conditions))
    .limit(1);

  return order;
}

// ---------------------------------------------------------------------------
// findOrderByReference
// ---------------------------------------------------------------------------

/**
 * Looks up an order by its Paystack reference string.
 *
 * Used exclusively by the webhook handler to map an incoming payment
 * notification back to the correct order row.
 */
export async function findOrderByReference(reference: string): Promise<Order | undefined> {
  const [order] = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.paystackReference, reference))
    .limit(1);

  return order;
}

// ---------------------------------------------------------------------------
// getOrderWithItems
// ---------------------------------------------------------------------------

/**
 * Fetches an order and all of its associated line items transactionally.
 *
 * Returns `undefined` if the order does not exist.
 * Used during fulfillment and cleanup to know which tiers and quantities
 * to move between reserved / sold.
 */
export async function getOrderWithItems(
  orderId: string
): Promise<{ order: Order; items: OrderItem[] } | undefined> {
  return getDb().transaction(async (tx: DbTransaction) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      logger.warn("getOrderWithItems: order not found", { orderId });
      return undefined;
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    return { order, items };
  });
}

// ---------------------------------------------------------------------------
// updateOrderStatus
// ---------------------------------------------------------------------------

/**
 * Updates only the `status` (and `updatedAt`) of an order.
 *
 * Does NOT touch inventory.  Call `fulfillOrder` or `releaseReservation`
 * when an inventory change is also required.
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"]
): Promise<void> {
  await getDb()
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  logger.debug("updateOrderStatus", { orderId, status });
}

// ---------------------------------------------------------------------------
// fulfillOrder
// ---------------------------------------------------------------------------

/**
 * The fulfillment transaction — called after a successful Paystack payment
 * has been independently verified.
 *
 * Atomically:
 *   1. For each order item, converts `quantityReserved → quantitySold` on
 *      the corresponding `ticket_tiers` row with floor guard.
 *   2. Inserts all pre-generated ticket rows.
 *   3. Sets `orders.status = "paid"`.
 */
export async function fulfillOrder(
  orderId: string,
  ticketsToInsert: TicketInsert[]
): Promise<Ticket[]> {
  return getDb().transaction(async (tx: DbTransaction) => {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    if (items.length === 0) {
      logger.error("fulfillOrder: no order items found", { orderId });
      throw new Error(`fulfillOrder: order ${orderId} has no items — cannot fulfill`);
    }

    // ── Step 1: reserved → sold with floor guard ─────────────────────────
    for (const item of items) {
      const [updated] = await tx
        .update(ticketTiers)
        .set({
          quantityReserved: sql`quantity_reserved - ${item.quantity}`,
          quantitySold: sql`quantity_sold + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ticketTiers.id, item.ticketTierId),
            sql`quantity_reserved >= ${item.quantity}`
          )
        )
        .returning({ id: ticketTiers.id });

      if (!updated) {
        logger.error("fulfillOrder: reserved quantity insufficient to convert to sold", {
          orderId,
          tierId: item.ticketTierId,
          quantity: item.quantity,
        });
        throw new Error(
          `fulfillOrder: insufficient reserved quantity for tier ${item.ticketTierId}`
        );
      }

      logger.debug("fulfillOrder: moved reserved→sold", {
        orderId,
        tierId: item.ticketTierId,
        quantity: item.quantity,
      });
    }

    // ── Step 2: Insert tickets ────────────────────────────────────────────
    const createdTickets = await tx.insert(tickets).values(ticketsToInsert).returning();

    // ── Step 3: Mark order paid ───────────────────────────────────────────
    await tx
      .update(orders)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    logger.info("fulfillOrder: order fulfilled", {
      orderId,
      ticketCount: createdTickets.length,
    });

    return createdTickets;
  });
}

// ---------------------------------------------------------------------------
// releaseReservation
// ---------------------------------------------------------------------------

/**
 * Releases held inventory and sets the final failure status on an order.
 *
 * Called when:
 *  - The Paystack initialisation call fails → status "failed"
 *  - The cleanup job finds an expired pending order → status "expired"
 *
 * Atomically decrements `quantityReserved` on every affected tier row (with floor guard)
 * so those slots immediately return to the available pool, then updates the order status.
 */
export async function releaseReservation(
  orderId: string,
  items: OrderItem[],
  status: "failed" | "expired"
): Promise<void> {
  await getDb().transaction(async (tx: DbTransaction) => {
    for (const item of items) {
      await tx
        .update(ticketTiers)
        .set({
          quantityReserved: sql`quantity_reserved - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ticketTiers.id, item.ticketTierId),
            sql`quantity_reserved >= ${item.quantity}`
          )
        );

      logger.debug("releaseReservation: decremented quantityReserved", {
        orderId,
        tierId: item.ticketTierId,
        quantity: item.quantity,
      });
    }

    await tx
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  });

  logger.info("releaseReservation: reservation released", {
    orderId,
    itemCount: items.length,
    newStatus: status,
  });
}

// ---------------------------------------------------------------------------
// getExpiredPendingOrders
// ---------------------------------------------------------------------------

/**
 * Returns all orders whose reservation window has elapsed but whose status
 * is still "pending".
 *
 * An order is eligible once `reservationExpiresAt < NOW()`.
 * Called by the admin cleanup endpoint to release stale inventory.
 */
export async function getExpiredPendingOrders(): Promise<Order[]> {
  const expired = await getDb()
    .select()
    .from(orders)
    .where(and(eq(orders.status, "pending"), lt(orders.reservationExpiresAt, new Date())));

  if (expired.length > 0) {
    logger.info("getExpiredPendingOrders: found expired pending orders", {
      count: expired.length,
      ids: expired.map((o) => o.id),
    });
  }

  return expired;
}

// ---------------------------------------------------------------------------
// findTicketByCode
// ---------------------------------------------------------------------------

/**
 * Checks whether a given 6-character ticket code already exists in the DB.
 *
 * Used during ticket code generation to ensure global uniqueness before
 * inserting.  Returns `undefined` if the code is free.
 */
export async function findTicketByCode(code: string): Promise<Ticket | undefined> {
  const [ticket] = await getDb().select().from(tickets).where(eq(tickets.code, code)).limit(1);

  return ticket;
}
