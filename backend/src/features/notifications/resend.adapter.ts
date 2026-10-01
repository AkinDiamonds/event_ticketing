import type { EmailSender, EmailMessage } from "#shared/utils/email.js";
import { env } from "#config/env.js";

/**
 * Implementation of EmailSender using Resend HTTP API via native fetch.
 * Justification: Uses native fetch to avoid adding external SDK dependencies to the project.
 */
export class ResendEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM_ADDRESS,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend email delivery failed (${response.status}): ${errorText}`);
    }
  }
}
