import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";

const emptyResponse = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    statusCode: { type: "integer" },
    message: { type: "string" },
    data: {},
  },
} as const;

export function registerAuthOpenApi(registry: OpenAPIRegistry): void {
  registry.register("RegisterRequest", registerSchema);
  registry.register("LoginRequest", loginSchema);
  registry.register("VerifyEmailRequest", verifyEmailSchema);
  registry.register("RefreshRequest", refreshSchema);
  registry.register("ForgotPasswordRequest", forgotPasswordSchema);
  registry.register("ResetPasswordRequest", resetPasswordSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/register",
    request: {
      body: { content: { "application/json": { schema: registerSchema } } },
    },
    responses: { 201: { description: "Registration successful" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/login",
    request: { body: { content: { "application/json": { schema: loginSchema } } } },
    responses: { 200: { description: "Login successful" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/verify-email",
    request: {
      body: { content: { "application/json": { schema: verifyEmailSchema } } },
    },
    responses: { 200: { description: "Email verified" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/refresh",
    request: { body: { content: { "application/json": { schema: refreshSchema } } } },
    responses: { 200: { description: "Token refreshed" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/forgot-password",
    request: {
      body: { content: { "application/json": { schema: forgotPasswordSchema } } },
    },
    responses: { 200: { description: "Reset request accepted" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/reset-password",
    request: {
      body: { content: { "application/json": { schema: resetPasswordSchema } } },
    },
    responses: { 200: { description: "Password reset" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/resend-verification",
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: "Verification email sent" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/logout",
    security: [{ bearerAuth: [] }],
    request: { body: { content: { "application/json": { schema: refreshSchema } } } },
    responses: { 200: { description: "Logged out" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/logout-all",
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: "Logged out everywhere" } },
  });

  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
  registry.registerComponent("schemas", "EmptyResponse", emptyResponse);
}
