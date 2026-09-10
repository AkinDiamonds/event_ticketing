import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "#shared/middleware/authenticate.js";
import { validate } from "#shared/middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";
import * as authController from "./auth.controller.js";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register
);
router.post("/login", authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post(
  "/verify-email",
  validate({ body: verifyEmailSchema }),
  authController.verifyEmail
);
router.post(
  "/resend-verification",
  authenticate,
  authRateLimiter,
  authController.resendVerification
);
router.post("/refresh", validate({ body: refreshSchema }), authController.refresh);
router.post("/logout", authenticate, validate({ body: logoutSchema }), authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.post(
  "/forgot-password",
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

export default router;
