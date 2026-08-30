import {pgTable, pgEnum, varchar, uuid, numeric, text, timestamp, integer,} from "drizzle-orm/pg-core";

import { events } from "./events";

export const ticketTypeStatusEnum = pgEnum("ticket_type_status", [
    "DRAFT",
    "ACTIVE",
    "INACTIVE",
]); 

export const ticketTypes = pgTable("ticket_types", {
    id: uuid("id").defaultRandom().primaryKey(),

    eventId: uuid("event_id").notNull().references(() => events.id),

    name: varchar("name", {length: 100}).notNull(),

    description: text("description"),

    price: numeric("price", {precision: 12, scale: 2}).notNull(),

    quantity: integer("quantity").notNull(),

    status: ticketTypeStatusEnum("status").default("DRAFT").notNull(),

    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow()
})