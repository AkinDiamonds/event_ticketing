import { ConflictError, UnauthorizedError } from "#shared/utils/errors.js";
import {
  createAccessToken,
  createOpaqueToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "#shared/utils/tokens.js";
import { hashPassword, comparePassword } from "#shared/utils/password.js";
import { env } from "#config/env.js";
import logger from "#shared/utils/logger.js";
import { NoopEmailSender, type EmailSender } from "#shared/utils/email.js";
import {
  deleteAllRefreshTokens,
  deleteRefreshToken,
  completeEmailVerification,
  completePasswordReset,
  deleteEmailVerificationTokens,
  findUserByEmail,
  findUserById,
  findValidEmailVerificationToken,
  findValidPasswordResetToken,
  findValidRefreshToken,
  insertEmailVerificationToken,
  insertPasswordResetToken,
  insertRefreshToken,
  insertUser,
  rotateRefreshToken,
  type User,
} from "./auth.repository.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.schemas.js";

let emailSender: EmailSender = new NoopEmailSender();

export function setEmailSender(sender: EmailSender): void {
  emailSender = sender;
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    throw new Error(`Unsupported duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return amount * multiplier * 1000;
}

function createSession(user: User) {
  const refreshToken = createRefreshToken(user.id);
  const accessToken = createAccessToken({
    userId: user.id,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    isOrganizer: user.isOrganizer,
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt: new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN)),
  };
}

async function sendEmail(message: Parameters<EmailSender["send"]>[0]): Promise<void> {
  try {
    await emailSender.send(message);
  } catch (error) {
    logger.warn("Auth email delivery failed", { error });
  }
}

async function createVerificationEmail(user: User): Promise<void> {
  const rawToken = createOpaqueToken();
  await deleteEmailVerificationTokens(user.id);
  await insertEmailVerificationToken({
    userId: user.id,
    token: hashToken(rawToken),
    expiresAt: new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000),
  });

  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    text: `Your email verification token is: ${rawToken}`,
  });
}

export async function register(input: RegisterInput) {
  if (await findUserByEmail(input.email)) {
    throw new ConflictError("Email is already registered");
  }

  let user: User;
  try {
    user = await insertUser({
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Email is already registered");
    }
    throw error;
  }

  const session = createSession(user);
  await insertRefreshToken({
    userId: user.id,
    token: session.refreshTokenHash,
    expiresAt: session.refreshTokenExpiresAt,
  });
  await createVerificationEmail(user);

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: publicUser(user),
  };
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const session = createSession(user);
  await insertRefreshToken({
    userId: user.id,
    token: session.refreshTokenHash,
    expiresAt: session.refreshTokenExpiresAt,
  });

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: publicUser(user),
  };
}

export async function verifyEmail(input: VerifyEmailInput): Promise<void> {
  const token = await findValidEmailVerificationToken(hashToken(input.token));
  if (!token) {
    throw new UnauthorizedError("Invalid or expired verification token");
  }

  await completeEmailVerification(token.userId, token.id);
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user || user.isEmailVerified) {
    throw new UnauthorizedError("Verification email cannot be sent");
  }

  await createVerificationEmail(user);
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await findValidRefreshToken(tokenHash);
  if (!storedToken || storedToken.userId !== payload.userId) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await findUserById(payload.userId);
  if (!user) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const session = createSession(user);
  await rotateRefreshToken({
    oldTokenHash: tokenHash,
    userId: user.id,
    newTokenHash: session.refreshTokenHash,
    newTokenExpiresAt: session.refreshTokenExpiresAt,
  });

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await deleteRefreshToken(hashToken(refreshToken));
}

export async function logoutAll(userId: string): Promise<void> {
  await deleteAllRefreshTokens(userId);
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    return;
  }

  const rawToken = createOpaqueToken();
  await insertPasswordResetToken({
    userId: user.id,
    token: hashToken(rawToken),
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000),
  });

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    text: `Your password reset token is: ${rawToken}`,
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const token = await findValidPasswordResetToken(hashToken(input.token));
  if (!token) {
    throw new UnauthorizedError("Invalid or expired password reset token");
  }

  await completePasswordReset({
    userId: token.userId,
    tokenId: token.id,
    passwordHash: await hashPassword(input.password),
  });
}

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    isOrganizer: user.isOrganizer,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "23505"
  );
}
