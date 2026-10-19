import nodemailer, { type Transporter } from "nodemailer";
import type { EmailSender, EmailMessage } from "#shared/utils/email.js";
import { env } from "#config/env.js";

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

/**
 * Implementation of EmailSender using SMTP via nodemailer.
 * Supports Gmail (with App Password), Mailtrap, or any standard SMTP server.
 */
export class SmtpEmailSender implements EmailSender {
  private transporter: Transporter;
  private fromAddress: string;

  constructor(config?: SmtpConfig) {
    const host = config?.host ?? env.SMTP_HOST;
    const port = config?.port ?? env.SMTP_PORT;
    const secure = config?.secure ?? env.SMTP_SECURE;
    const user = config?.user ?? env.SMTP_USER;
    const pass = config?.pass ?? env.SMTP_PASS;
    this.fromAddress = config?.from ?? env.EMAIL_FROM_ADDRESS;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`SMTP email delivery failed: ${details}`);
    }
  }
}
