import { env } from "#config/env.js";
import { NoopEmailSender, type EmailSender } from "#shared/utils/email.js";
import { ResendEmailSender } from "./resend.adapter.js";
import { SmtpEmailSender } from "./smtp.adapter.js";
import logger from "#shared/utils/logger.js";

/**
 * Creates an EmailSender instance according to the EMAIL_PROVIDER environment setting.
 * Resiliently validates prerequisites and configures the appropriate adapter.
 */
export function createEmailSender(): EmailSender {
  switch (env.EMAIL_PROVIDER) {
    case "resend": {
      if (!env.EMAIL_PROVIDER_API_KEY) {
        throw new Error("EMAIL_PROVIDER is 'resend' but EMAIL_PROVIDER_API_KEY is missing");
      }
      return new ResendEmailSender();
    }

    case "smtp": {
      if (!env.SMTP_USER || !env.SMTP_PASS) {
        if (env.NODE_ENV === "production") {
          throw new Error("EMAIL_PROVIDER is 'smtp' in production but SMTP_USER or SMTP_PASS is missing");
        }
        logger.warn(
          "EMAIL_PROVIDER is 'smtp' but SMTP_USER or SMTP_PASS is not set. Outbound emails will fail until configured in .env."
        );
      }
      return new SmtpEmailSender();
    }

    case "noop":
      return new NoopEmailSender();

    default: {
      const exhaustiveCheck: never = env.EMAIL_PROVIDER;
      throw new Error(`Unknown EMAIL_PROVIDER: ${String(exhaustiveCheck)}`);
    }
  }
}
