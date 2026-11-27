import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "#db/schema.js";

export const organizerPayouts = pgTable("organizer_payouts", {
  organizerId: uuid("organizer_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  subaccountCode: varchar("subaccount_code", { length: 100 }).notNull().unique(),
  subaccountId: varchar("subaccount_id", { length: 32 }).notNull().unique(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  bankCode: varchar("bank_code", { length: 12 }).notNull(),
  accountLast4: varchar("account_last4", { length: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
