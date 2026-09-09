// Test environment setup.
// Sets the minimum env vars required by src/config/env.ts so tests
// that don't touch real infrastructure can still import the app.
// Override any of these in individual test files if needed.

process.env["NODE_ENV"] = "test";
process.env["PORT"] = "3001";
process.env["DATABASE_URL"] =
  process.env["TEST_DATABASE_URL"] ??
  "postgresql://test:test@localhost:5433/event_ticketing_test";
process.env["JWT_SECRET"] = "test_secret_at_least_32_chars_long_xxxxx";
process.env["JWT_REFRESH_SECRET"] = "test_refresh_secret_32_chars_long_xxxx";
process.env["PAYSTACK_SECRET_KEY"] = "sk_test_placeholder";
process.env["PAYSTACK_PUBLIC_KEY"] = "pk_test_placeholder";
process.env["CLOUDINARY_CLOUD_NAME"] = "test_cloud";
process.env["CLOUDINARY_API_KEY"] = "test_key";
process.env["CLOUDINARY_API_SECRET"] = "test_secret";
process.env["EMAIL_PROVIDER_API_KEY"] = "re_test_placeholder";
process.env["EMAIL_FROM_ADDRESS"] = "test@example.com";
process.env["CORS_ORIGINS"] = "http://localhost:5173";
