import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES: z.coerce.number().int().positive().default(1440),

  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_PUBLIC_KEY: z.string().min(1),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  EMAIL_PROVIDER_API_KEY: z.string().min(1),
  EMAIL_FROM_ADDRESS: z.string().email(),

  WHATSAPP_ENABLED: z
    .preprocess((v) => (typeof v === "string" ? v === "true" : false), z.boolean())
    .default(false),
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),

  ENABLE_SWAGGER: z
    .preprocess((v) => (typeof v === "string" ? v !== "false" : true), z.boolean())
    .default(true),
});

// CORS_ORIGINS is comma-separated in the env file — parse it here so consumers
// always get string[].
const rawResult = envSchema.safeParse(process.env);

if (!rawResult.success) {
  const formatted = rawResult.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // Use console.error here because the logger depends on env, so it isn't ready yet.
  console.error(`\n[startup] Missing or invalid environment variables:\n${formatted}\n`);
  process.exit(1);
}

const parsed = rawResult.data;

export const env = {
  ...parsed,
  corsOrigins: parsed.CORS_ORIGINS.split(",").map((s) => s.trim()),
} as const;

export type Env = typeof env;
