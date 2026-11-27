import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "#config/db.js";
import { env } from "#config/env.js";
import { users } from "#db/schema.js";
import { AppError, ConflictError, ForbiddenError } from "#shared/utils/errors.js";
import { comparePassword } from "#shared/utils/password.js";
import { organizerPayouts } from "./payouts.schema.js";

export const MINIMUM_NGN_CHARGE_KOBO = 5_000;

export const payoutBankDetails = z.object({
  bankCode: z.string().regex(/^\d{2,12}$/),
  accountNumber: z.string().regex(/^\d{10}$/),
}).strict();

export const confirmPayoutSchema = payoutBankDetails.extend({
  businessName: z.string().trim().min(2).max(120),
  accountName: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(72),
});

export function paymentPolicy(): { basisPoints: number; bearer: "account" | "subaccount" } {
  const { PAYSTACK_PLATFORM_FEE_BPS: basisPoints, PAYSTACK_FEE_BEARER: bearer } = env;
  if (basisPoints === undefined || !bearer) {
    throw new AppError(503, "Paid ticket sales are temporarily unavailable.");
  }
  return { basisPoints, bearer };
}

export function payoutTerms(): { basisPoints: number; bearer: "account" | "subaccount" } | null {
  return env.PAYSTACK_PLATFORM_FEE_BPS !== undefined && env.PAYSTACK_FEE_BEARER ? paymentPolicy() : null;
}

async function requestPaystack(path: string, body?: Record<string, unknown>) {
  try {
    const response = await fetch(new URL(path, "https://api.paystack.co"), {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 400 || response.status === 422) {
      throw new AppError(422, "Paystack could not accept these account details. Check the bank and account number.");
    }
    if (!response.ok) throw new Error("Provider request failed");
    return z.object({ status: z.literal(true), data: z.unknown(), meta: z.unknown().optional() }).parse(await response.json());
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "Could not reach Paystack. Please try again.");
  }
}

const bankSchema = z.object({ name: z.string(), code: z.string(), active: z.boolean(), is_deleted: z.boolean().optional() });

export async function listPayoutBanks(): Promise<Array<{ name: string; code: string }>> {
  const banks = new Map<string, string>();
  let next: string | undefined;
  for (let page = 0; page < 10; page++) {
    const query = new URLSearchParams({ country: "nigeria", currency: "NGN", use_cursor: "true", perPage: "100" });
    if (next) query.set("next", next);
    const result = await requestPaystack(`/bank?${query.toString()}`);
    for (const bank of z.array(bankSchema).parse(result.data)) {
      if (bank.active && !bank.is_deleted) banks.set(bank.code, bank.name);
    }
    const cursor = z.object({ next: z.string().nullable().optional() }).parse(result.meta ?? {}).next;
    if (!cursor) break;
    next = cursor;
  }
  return [...banks].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolvePayoutAccount(
  details: z.infer<typeof payoutBankDetails>
): Promise<{ accountName: string }> {
  const query = new URLSearchParams({ bank_code: details.bankCode, account_number: details.accountNumber });
  const result = await requestPaystack(`/bank/resolve?${query.toString()}`);
  const account = z.object({ account_name: z.string().trim().min(1).max(255), account_number: z.string() }).parse(result.data);
  if (account.account_number !== details.accountNumber) {
    throw new AppError(422, "Paystack returned a different account number.");
  }
  return { accountName: account.account_name };
}

function maskedAccount(payout: typeof organizerPayouts.$inferSelect) {
  return { accountName: payout.accountName, bankCode: payout.bankCode, accountLast4: payout.accountLast4 };
}

export async function getPayoutAccount(organizerId: string): Promise<ReturnType<typeof maskedAccount> | null> {
  const [payout] = await getDb().select().from(organizerPayouts).where(eq(organizerPayouts.organizerId, organizerId));
  return payout ? maskedAccount(payout) : null;
}

export async function confirmPayoutAccount(
  organizerId: string,
  details: z.infer<typeof confirmPayoutSchema>
): Promise<ReturnType<typeof maskedAccount>> {
  const policy = paymentPolicy();
  const eligibility = and(eq(users.id, organizerId), eq(users.isEmailVerified, true),
    isNotNull(users.organizerApprovedAt), isNull(users.organizerSuspendedAt), isNull(users.deletedAt));
  const [account] = await getDb().select({ passwordHash: users.passwordHash }).from(users).where(eligibility);
  if (!account || !(await comparePassword(details.password, account.passwordHash))) {
    throw new ForbiddenError("Enter your current password to confirm this payout account.");
  }
  if (await getPayoutAccount(organizerId)) throw new ConflictError("A payout account is already configured.");
  const { accountName } = await resolvePayoutAccount(details);
  if (accountName !== details.accountName) {
    throw new ConflictError("The account name changed. Verify the bank details again.");
  }

  return getDb().transaction(async (tx) => {
    // Serialize setup for this organizer. Recheck eligibility and the password after locking.
    const [locked] = await tx.select({ passwordHash: users.passwordHash }).from(users).where(eligibility).for("update");
    if (!locked || locked.passwordHash !== account.passwordHash) throw new ForbiddenError("Sign in again to set up payouts.");
    const [existing] = await tx.select().from(organizerPayouts).where(eq(organizerPayouts.organizerId, organizerId));
    if (existing) throw new ConflictError("A payout account is already configured.");

    const result = await requestPaystack("/subaccount", {
      business_name: details.businessName,
      bank_code: details.bankCode,
      account_number: details.accountNumber,
      percentage_charge: policy.basisPoints / 100,
    });
    const subaccount = z.object({
      id: z.number().int().positive(), subaccount_code: z.string().regex(/^ACCT_[a-zA-Z0-9]+$/),
      account_number: z.string(), currency: z.literal("NGN"), active: z.union([z.literal(true), z.literal(1)]),
    }).parse(result.data);
    if (subaccount.account_number !== details.accountNumber) throw new AppError(502, "Paystack returned a different payout account.");
    const [created] = await tx.insert(organizerPayouts).values({
      organizerId, subaccountCode: subaccount.subaccount_code, subaccountId: String(subaccount.id),
      accountName, bankCode: details.bankCode, accountLast4: details.accountNumber.slice(-4),
    }).returning();
    if (!created) throw new Error("Payout account insert failed");
    return maskedAccount(created);
  });
}

type Settlement = { amountKobo: number; status: "pending" | "success" | "failed"; date: string };

export async function listOrganizerSettlements(organizerId: string): Promise<Settlement[]> {
  const [account] = await getDb().select({ id: organizerPayouts.subaccountId }).from(organizerPayouts)
    .where(eq(organizerPayouts.organizerId, organizerId));
  if (!account) return [];
  const query = new URLSearchParams({ subaccount: account.id, perPage: "10" });
  const result = await requestPaystack(`/settlement?${query.toString()}`);
  return z.array(z.object({
    effective_amount: z.number().int(),
    status: z.enum(["pending", "success", "failed"]),
    settlement_date: z.string(),
    currency: z.literal("NGN"),
  })).parse(result.data).map((settlement) => ({
    amountKobo: settlement.effective_amount, status: settlement.status, date: settlement.settlement_date,
  }));
}
