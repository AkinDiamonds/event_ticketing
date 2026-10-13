import type { Request, Response } from "express";
import { sendSuccess } from "#shared/utils/response.js";
import * as authService from "./auth.service.js";
import {
  type RegisterInput,
  type LoginInput,
  type VerifyEmailInput,
  type RefreshInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SetWhatsAppInput,
} from "./auth.schemas.js";

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body as RegisterInput);
  sendSuccess(res, result, "Registration successful", 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput);
  sendSuccess(res, result, "Login successful");
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  await authService.verifyEmail(req.body as VerifyEmailInput);
  sendSuccess(res, null, "Email verified successfully");
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  await authService.resendVerification(req.user!.userId);
  sendSuccess(res, null, "Verification email sent");
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshInput;
  const result = await authService.refresh(refreshToken);
  sendSuccess(res, result, "Token refreshed");
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshInput;
  await authService.logout(refreshToken);
  sendSuccess(res, null, "Logged out successfully");
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  await authService.logoutAll(req.user!.userId);
  sendSuccess(res, null, "Logged out from all devices");
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.forgotPassword(req.body as ForgotPasswordInput);
  sendSuccess(res, null, "If the email exists, a reset link has been sent");
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body as ResetPasswordInput);
  sendSuccess(res, null, "Password reset successfully");
}

export async function setWhatsAppNumber(req: Request, res: Response): Promise<void> {
  const input = req.body as SetWhatsAppInput;
  await authService.setWhatsAppNumber(req.user!.userId, input);
  sendSuccess(res, null, "WhatsApp number updated successfully");
}

