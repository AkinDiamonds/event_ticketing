export {
  sendTicketEmail,
  sendTicketWhatsApp,
  setEmailSender,
  setWhatsAppSender,
  type TicketEmailPayload,
  type TicketWhatsAppPayload,
} from "./notifications.service.js";

export {
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildTicketEmail,
} from "./email.templates.js";
export { ResendEmailSender } from "./resend.adapter.js";
export { SmtpEmailSender, type SmtpConfig } from "./smtp.adapter.js";
export { createEmailSender } from "./email.factory.js";
export { MetaCloudWhatsAppSender } from "./whatsapp.adapter.js";
