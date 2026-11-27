import { NoopEmailSender, type EmailSender } from "#shared/utils/email.js";
import { NoopWhatsAppSender, type WhatsAppSender } from "#shared/utils/whatsapp.js";
import { env } from "#config/env.js";
import logger from "#shared/utils/logger.js";
import { buildTicketEmail } from "./email.templates.js";

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
  eventId: string;
  orderId: string;
}

export interface TicketWhatsAppPayload {
  phone: string | null;
  eventTitle: string;
  ticketCodes: string[];
}

export async function sendTicketEmail(payload: TicketEmailPayload): Promise<void> {
  try {
    const orderUrl = new URL(`${env.FRONTEND_URL}/tickets/${encodeURIComponent(payload.eventId)}/ticket`);
    orderUrl.searchParams.set("orderId", payload.orderId);
    const message = buildTicketEmail(payload.to, payload.eventTitle, payload.ticketCodes, orderUrl.href);
    await emailSender.send(message);
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
    const text = `Your Event Tickets entry codes for "${payload.eventTitle}":\n\n${payload.ticketCodes
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
