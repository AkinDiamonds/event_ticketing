import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "#features/auth/auth.schema.js";

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    bannerImageUrl: text("banner_image_url"),
    venue: varchar("venue", { length: 255 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("events_organizer_id_idx").on(table.organizerId)]
);

export const ticketTiers = pgTable(
  "ticket_tiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    name: varchar("name", { length: 100 }).notNull(),
    price: integer("price").notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    quantityReserved: integer("quantity_reserved").notNull().default(0),
    quantitySold: integer("quantity_sold").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("ticket_tiers_event_id_name_unique").on(table.eventId, table.name),
    index("ticket_tiers_event_id_idx").on(table.eventId),
    check("ticket_tiers_price_nonnegative", sql`${table.price} >= 0`),
    check("ticket_tiers_quantity_available_positive", sql`${table.quantityAvailable} > 0`),
    check("ticket_tiers_quantity_reserved_nonnegative", sql`${table.quantityReserved} >= 0`),
    check("ticket_tiers_quantity_sold_nonnegative", sql`${table.quantitySold} >= 0`),
    check(
      "ticket_tiers_inventory_within_available",
      sql`${table.quantityReserved} + ${table.quantitySold} <= ${table.quantityAvailable}`
    ),
  ]
);

