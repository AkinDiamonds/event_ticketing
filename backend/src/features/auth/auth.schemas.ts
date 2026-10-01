import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const email = z.string().trim().toLowerCase().email().max(255);
const password = z.string().min(8).max(72);
const token = z.string().trim().min(1);
const whatsappNumber = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, {message:"Must be E.164 format, e.g. +2348012345678"})

export const registerSchema = z.object({
  email,
  password,
});

export const loginSchema = registerSchema;

export const verifyEmailSchema = z.object({
  token,
});

export const refreshSchema = z.object({
  refreshToken: token,
});

export const logoutSchema = refreshSchema;

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token,
  password,
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const setWhatsAppSchema = z.object({
  whatsappNumber: whatsappNumber.nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SetWhatsAppInput = z.infer<typeof setWhatsAppSchema>;
