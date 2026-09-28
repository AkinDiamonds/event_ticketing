import { timestamp, uuid, varchar, integer, pgTable, pgEnum } from "drizzle-orm/pg-core";
import { users, events, ticketTiers } from "#db/schema.js";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "failed",
  "payment_exception",
]);

export const ticketStatusEnum = pgEnum("ticket_status", ["valid", "used"]);

export const orders = pgTable("orders", {
  id: uuid().defaultRandom().primaryKey(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  totalKobo: integer("total_kobo").notNull(),
  status: orderStatusEnum().notNull().default("pending"),
  paystackReference: varchar("paystack_reference", { length: 100 }).notNull().unique(),
  reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_items", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  ticketTierId: uuid("ticket_tier_id")
    .notNull()
    .references(() => ticketTiers.id),
  quantity: integer().notNull(),
  unitPriceKobo: integer("unit_price_kobo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: uuid().defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  ticketTierId: uuid("ticket_tier_id")
    .notNull()
    .references(() => ticketTiers.id),
  code: varchar({ length: 6 }).notNull().unique(),
  status: ticketStatusEnum().notNull().default("valid"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
