import { createHash, randomBytes } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "#config/env.js";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  isEmailVerified: boolean;
  isOrganizer: boolean;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

function signToken(
  payload: AccessTokenPayload | RefreshTokenPayload,
  secret: string,
  expiresIn: string
): string {
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as NonNullable<SignOptions["expiresIn"]>,
  });
}

export function createAccessToken(payload: AccessTokenPayload): string {
  return signToken(payload, env.JWT_SECRET, env.JWT_EXPIRES_IN);
}

export function createRefreshToken(userId: string): string {
  return signToken(
    { userId, tokenId: randomBytes(16).toString("hex") },
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRES_IN
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
