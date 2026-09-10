import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "#config/db.js";
import {
  emailVerificationTokens,
  passwordResetTokens,
  refreshTokens,
  users,
} from "./auth.schema.js";

export type User = typeof users.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  return user;
}

export async function findUserById(userId: string): Promise<User | undefined> {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return user;
}

export async function insertUser(input: {
  email: string;
  passwordHash: string;
}): Promise<User> {
  const [user] = await getDb().insert(users).values(input).returning();

  if (!user) {
    throw new Error("User insert returned no row");
  }

  return user;
}

export async function createUserSessionAndVerification(input: {
  email: string;
  passwordHash: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  verificationToken: string;
  verificationTokenExpiresAt: Date;
}): Promise<User> {
  return getDb().transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: input.email, passwordHash: input.passwordHash })
      .returning();

    if (!user) {
      throw new Error("User insert returned no row");
    }

    await tx.insert(refreshTokens).values({
      userId: user.id,
      token: input.refreshToken,
      expiresAt: input.refreshTokenExpiresAt,
    });
    await tx.insert(emailVerificationTokens).values({
      userId: user.id,
      token: input.verificationToken,
      expiresAt: input.verificationTokenExpiresAt,
    });

    return user;
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ isEmailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function completeEmailVerification(
  userId: string,
  tokenId: string
): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set({ isEmailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tokenId));
  });
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function insertRefreshToken(input: {
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await getDb().insert(refreshTokens).values(input);
}

export async function findValidRefreshToken(
  tokenHash: string
): Promise<RefreshToken | undefined> {
  const [token] = await getDb()
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.token, tokenHash), gt(refreshTokens.expiresAt, new Date())))
    .limit(1);

  return token;
}

export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await getDb().delete(refreshTokens).where(eq(refreshTokens.token, tokenHash));
}

export async function rotateRefreshToken(input: {
  oldTokenHash: string;
  userId: string;
  newTokenHash: string;
  newTokenExpiresAt: Date;
}): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, input.oldTokenHash),
          eq(refreshTokens.userId, input.userId)
        )
      );
    await tx.insert(refreshTokens).values({
      userId: input.userId,
      token: input.newTokenHash,
      expiresAt: input.newTokenExpiresAt,
    });
  });
}

export async function deleteAllRefreshTokens(userId: string): Promise<void> {
  await getDb().delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function insertPasswordResetToken(input: {
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await getDb().insert(passwordResetTokens).values(input);
}

export async function findValidPasswordResetToken(
  tokenHash: string
): Promise<typeof passwordResetTokens.$inferSelect | undefined> {
  const [token] = await getDb()
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return token;
}

export async function markPasswordResetTokenUsed(tokenId: string): Promise<void> {
  await getDb()
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

export async function completePasswordReset(input: {
  userId: string;
  tokenId: string;
  passwordHash: string;
}): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: input.passwordHash, updatedAt: new Date() })
      .where(eq(users.id, input.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, input.tokenId));
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, input.userId));
  });
}

export async function insertEmailVerificationToken(input: {
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await getDb().insert(emailVerificationTokens).values(input);
}

export async function deleteEmailVerificationTokens(userId: string): Promise<void> {
  await getDb()
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));
}

export async function findValidEmailVerificationToken(
  tokenHash: string
): Promise<typeof emailVerificationTokens.$inferSelect | undefined> {
  const [token] = await getDb()
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.token, tokenHash),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return token;
}

export async function markEmailVerificationTokenUsed(tokenId: string): Promise<void> {
  await getDb()
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, tokenId));
}
