import type { WhatsAppSender, WhatsAppMessage } from "#shared/utils/whatsapp.js";
import { env } from "#config/env.js";

/**
 * Implementation of WhatsAppSender using Meta Cloud API via native fetch.
 * Justification: Uses native fetch to avoid adding external SDK dependencies.
 */
export class MetaCloudWhatsAppSender implements WhatsAppSender {
  async send(message: WhatsAppMessage): Promise<void> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.phone,
          type: "text",
          text: {
            preview_url: false,
            body: message.text,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp delivery failed (${response.status}): ${errorText}`);
    }
  }
}
