import {pgEnum, pgTable, uuid, varchar, text, timestamp} from "drizzle-orm/pg-core";
import { users } from "./users";

export const eventstatusEnum = pgEnum("event_status", [
    "DRAFT",
    "PUBLISHED",
    "CANCELLED",
    "COMPLETED"
]);

export const events = pgTable("events", {
    id: uuid("id").defaultRandom().primaryKey(),

    organizerId: uuid("organizer_id").notNull().references(() => users.id),

    name: varchar("name", {length: 225}).notNull(),

    description: text("description"),

    status: eventstatusEnum("status").default("DRAFT").notNull(),

    venue: varchar("venue", {length: 225}).notNull(),

    startAt: timestamp("start_at", {withTimezone: true}).notNull(),

    endAt: timestamp("end_at", {withTimezone: true}).notNull(),

    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow()

})