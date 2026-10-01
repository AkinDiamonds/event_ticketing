import { NoopEmailSender, type EmailSender } from "#shared/utils/email.js";
import { NoopWhatsAppSender, type WhatsAppSender } from "#shared/utils/whatsapp.js";
import { env } from "#config/env.js";
import logger from "#shared/utils/logger.js";

let emailSender: EmailSender = new NoopEmailSender();
let whatsappSender: WhatsAppSender = new NoopWhatsAppSender();

export function setEmailSender(sender: EmailSender): void {
  emailSender = sender;
}

export function setWhatsAppSender(sender: WhatsAppSender): void {
  whatsappSender = sender;
}

export interface TicketEmailPayload {
  to: string;
  eventTitle: string;
  ticketCodes: string[];
}

export interface TicketWhatsAppPayload {
  phone: string | null;
  eventTitle: string;
  ticketCodes: string[];
}

export async function sendTicketEmail(payload: TicketEmailPayload): Promise<void> {
  try {
    const text = `Congratulations! Your purchase for "${payload.eventTitle}" was successful.\n\nYour Ticket Code(s):\n${payload.ticketCodes
      .map((code, index) => `${index + 1}. ${code}`)
      .join("\n")}\n\nPlease present these codes at the event venue.`;

    await emailSender.send({
      to: payload.to,
      subject: `Your Tickets for ${payload.eventTitle}`,
      text,
    });
  } catch (error) {
    logger.warn("Ticket email delivery failed", { error, to: payload.to });
  }
}

export async function sendTicketWhatsApp(payload: TicketWhatsAppPayload): Promise<void> {
  if (!env.WHATSAPP_ENABLED) {
    logger.debug("WhatsApp notifications disabled, skipping");
    return;
  }

  if (!payload.phone) {
    logger.debug("No WhatsApp phone number provided for user, skipping");
    return;
  }

  try {
    const text = `Your tickets for "${payload.eventTitle}":\n\n${payload.ticketCodes
      .map((code, index) => `${index + 1}. ${code}`)
      .join("\n")}`;

    await whatsappSender.send({
      phone: payload.phone,
      text,
    });
  } catch (error) {
    logger.warn("Ticket WhatsApp delivery failed", { error, phone: payload.phone });
  }
}
