import {pgEnum, pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", [
    "CUSTOMER",
    "ORGANIZER",
    "ADMIN",
]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),

    email: varchar("email", {length: 225}).notNull().unique(),

    whatsapp: varchar("whatsapp", {length: 20}).unique(),

    password: varchar("password", {length: 225}).notNull(),

    firstName: varchar("first_name", {length: 100}).notNull(),

    lastName: varchar("last_name", {length: 100}).notNull(),

    role: userRoleEnum("role").default("CUSTOMER").notNull(),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow()

})