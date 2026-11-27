import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { closeDb, getDb } from "../dist/config/db.js";
import { users } from "../dist/features/auth/auth.schema.js";

const [action, address, ...extra] = process.argv.slice(2);
const email = address?.trim().toLowerCase();

try {
  if (action === "list" && !address && !extra.length) {
    const accounts = await getDb().select({
      email: users.email,
      legacyOrganizer: users.isOrganizer,
      approvedAt: users.organizerApprovedAt,
      suspendedAt: users.organizerSuspendedAt,
    }).from(users).where(and(
      isNull(users.deletedAt),
      or(eq(users.isOrganizer, true), isNotNull(users.organizerApprovedAt))
    )).orderBy(users.email);
    console.table(accounts);
  } else if ((action === "approve" || action === "revoke") && email && !extra.length) {
    const now = new Date();
    const changes = action === "approve"
      ? { organizerApprovedAt: now, organizerSuspendedAt: null }
      : { organizerSuspendedAt: now };
    const [account] = await getDb().update(users).set(changes)
      .where(and(
        eq(users.email, email),
        isNull(users.deletedAt),
        action === "approve" ? eq(users.isEmailVerified, true) : undefined
      )).returning({ email: users.email });

    if (!account) throw new Error(action === "approve" ? "Verified account not found" : "Account not found");
    console.log(`Organizer access ${action === "approve" ? "approved" : "revoked"} for ${account.email}`);
  } else {
    throw new Error("Usage: npm run client:access -- list | approve <email> | revoke <email>");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
