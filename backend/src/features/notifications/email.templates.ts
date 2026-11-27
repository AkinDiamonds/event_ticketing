import type { EmailMessage } from "#shared/utils/email.js";

/**
 * Shared email message templates for all transactional notifications.
 * Renders both accessible plain text and clean, branded responsive HTML.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #2d3748; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: #1a202c; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .footer { text-align: center; font-size: 12px; color: #718096; padding: 16px 24px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Event Tickets</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>If you did not request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildVerificationEmail(to: string, verificationUrl: string): EmailMessage {
  if (!/^https?:\/\//i.test(verificationUrl)) {
    throw new Error("Invalid verification URL scheme; must be http or https");
  }

  const subject = "Verify your email - Event Tickets";
  const text = `Welcome to Event Tickets!\n\nVerify your email to activate your account.\n${verificationUrl}\n\nThis link will expire shortly. If you did not create an account, you can ignore this email.`;
  const safeUrl = escapeHtml(verificationUrl);
  const html = baseLayout(
    "Verify Your Email",
    `<h2>Verify your email</h2>
     <p>Welcome to Event Tickets. Verify your email to activate your account.</p>
     <div style="text-align:center;margin:32px 0;">
       <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2b6cb0;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">Verify Email</a>
     </div>
     <p>This link will expire shortly.</p>`
  );

  return { to, subject, text, html };
}

export function buildPasswordResetEmail(to: string, resetUrl: string): EmailMessage {
  if (!/^https?:\/\//i.test(resetUrl)) {
    throw new Error("Invalid password reset URL scheme; must be http or https");
  }

  const subject = "Reset your password - Event Tickets";
  const text = `Use the link below to set a new password for your Event Tickets account.\n${resetUrl}\n\nThis link will expire shortly. If you did not request a password reset, you can ignore this email.`;
  const safeUrl = escapeHtml(resetUrl);
  const html = baseLayout(
    "Reset Your Password",
    `<h2>Reset your password</h2>
     <p>Use the button below to set a new password for your Event Tickets account.</p>
     <div style="text-align:center;margin:32px 0;">
       <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2b6cb0;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">Reset Password</a>
     </div>
     <p>This link will expire shortly.</p>`
  );

  return { to, subject, text, html };
}

export function buildTicketEmail(
  to: string,
  eventTitle: string,
  ticketCodes: string[],
  orderUrl: string
): EmailMessage {
  if (!/^https?:\/\//i.test(orderUrl)) {
    throw new Error("Invalid order URL scheme; must be http or https");
  }

  const subject = `Your tickets for ${eventTitle} - Event Tickets`;
  const text = `Your Event Tickets purchase for "${eventTitle}" is confirmed.\n\nEntry codes:\n${ticketCodes
    .map((code, index) => `${index + 1}. ${code}`)
    .join("\n")}\n\nShow these codes at the venue.\n\nView your paid order:\n${orderUrl}`;

  const safeTitle = escapeHtml(eventTitle);
  const safeUrl = escapeHtml(orderUrl);
  const codeListHtml = ticketCodes
    .map(
      (code, index) =>
        `<li style="margin-bottom: 8px;"><strong>Ticket #${index + 1}:</strong> <code style="font-size: 16px; background: #edf2f7; padding: 2px 6px; border-radius: 4px;">${escapeHtml(code)}</code></li>`
    )
    .join("");

  const html = baseLayout(
    "Your Tickets",
    `<h2>Payment Confirmed!</h2>
     <p>Your tickets for <strong>${safeTitle}</strong> are ready.</p>
     <ul style="list-style: none; padding-left: 0;">
       ${codeListHtml}
     </ul>
     <p>Show these codes at the venue.</p>
     <div style="text-align:center;margin:32px 0;">
       <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2b6cb0;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">View Order</a>
     </div>`
  );

  return { to, subject, text, html };
}
