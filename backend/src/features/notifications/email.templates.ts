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
    .token-box { background: #edf2f7; border-radius: 6px; padding: 16px; font-family: monospace; font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 2px; margin: 24px 0; color: #2b6cb0; word-break: break-all; }
    .footer { text-align: center; font-size: 12px; color: #718096; padding: 16px 24px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Party Tickets</h1>
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

export function buildVerificationEmail(to: string, token: string): EmailMessage {
  const subject = "Verify your email - Party Tickets";
  const text = `Welcome to Party Tickets!\n\nYour email verification token is:\n${token}\n\nEnter this token to complete your registration.\n\nIf you did not create an account, you can safely ignore this email.`;
  const safeToken = escapeHtml(token);
  const html = baseLayout(
    "Verify Your Email",
    `<h2>Welcome!</h2>
     <p>Thank you for signing up with Party Tickets. Please enter the verification token below to activate your account:</p>
     <div class="token-box">${safeToken}</div>
     <p>This token will expire shortly.</p>`
  );

  return { to, subject, text, html };
}

export function buildPasswordResetEmail(to: string, token: string): EmailMessage {
  const subject = "Reset your password - Party Tickets";
  const text = `You requested a password reset for Party Tickets.\n\nYour password reset token is:\n${token}\n\nIf you did not request a password reset, please secure your account immediately.`;
  const safeToken = escapeHtml(token);
  const html = baseLayout(
    "Reset Your Password",
    `<h2>Password Reset Request</h2>
     <p>We received a request to reset your password. Use the token below to set a new password:</p>
     <div class="token-box">${safeToken}</div>
     <p>If you did not request this, please ignore this email.</p>`
  );

  return { to, subject, text, html };
}

export function buildTicketEmail(
  to: string,
  eventTitle: string,
  ticketCodes: string[]
): EmailMessage {
  const subject = `Your Tickets for ${eventTitle}`;
  const text = `Congratulations! Your purchase for "${eventTitle}" was successful.\n\nYour Ticket Code(s):\n${ticketCodes
    .map((code, index) => `${index + 1}. ${code}`)
    .join("\n")}\n\nPlease present these codes at the event venue.`;

  const safeTitle = escapeHtml(eventTitle);
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
     <p>Please present these ticket codes at the venue entry.</p>`
  );

  return { to, subject, text, html };
}
