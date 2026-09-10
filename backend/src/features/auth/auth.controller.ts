import type { Request, Response } from "express";
import { sendSuccess } from "#shared/utils/response.js";
import * as authService from "./auth.service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(registerSchema.parse(req.body));
  sendSuccess(res, result, "Registration successful", 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(loginSchema.parse(req.body));
  sendSuccess(res, result, "Login successful");
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  await authService.verifyEmail(verifyEmailSchema.parse(req.body));
  sendSuccess(res, null, "Email verified successfully");
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  await authService.resendVerification(req.user!.userId);
  sendSuccess(res, null, "Verification email sent");
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  sendSuccess(res, result, "Token refreshed");
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = logoutSchema.parse(req.body);
  await authService.logout(refreshToken);
  sendSuccess(res, null, "Logged out successfully");
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  await authService.logoutAll(req.user!.userId);
  sendSuccess(res, null, "Logged out from all devices");
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.forgotPassword(forgotPasswordSchema.parse(req.body));
  sendSuccess(res, null, "If the email exists, a reset link has been sent");
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(resetPasswordSchema.parse(req.body));
  sendSuccess(res, null, "Password reset successfully");
}
