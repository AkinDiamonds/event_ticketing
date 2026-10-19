import { describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { SmtpEmailSender } from "./smtp.adapter.js";
import { ResendEmailSender } from "./resend.adapter.js";
import { createEmailSender } from "./email.factory.js";
import { NoopEmailSender } from "#shared/utils/email.js";
import { env } from "#config/env.js";

vi.mock("nodemailer");

describe("SmtpEmailSender", () => {
  it("sends email with provided parameters", async () => {
    const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-id" });
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: sendMailMock,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);

    const sender = new SmtpEmailSender({
      host: "smtp.example.com",
      port: 587,
      user: "user@example.com",
      pass: "secret",
      from: "no-reply@example.com",
    });

    await sender.send({
      to: "recipient@example.com",
      subject: "Test Subject",
      text: "Hello world",
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: "no-reply@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      text: "Hello world",
    });
  });

  it("wraps and throws error if sendMail fails", async () => {
    const sendMailMock = vi.fn().mockRejectedValue(new Error("Connection refused"));
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: sendMailMock,
    } as unknown as ReturnType<typeof nodemailer.createTransport>);

    const sender = new SmtpEmailSender();

    await expect(
      sender.send({
        to: "recipient@example.com",
        subject: "Test",
        text: "Test",
      })
    ).rejects.toThrow("SMTP email delivery failed: Connection refused");
  });
});

describe("createEmailSender", () => {
  it("creates SmtpEmailSender when EMAIL_PROVIDER is smtp", () => {
    vi.mocked(nodemailer.createTransport).mockReturnValue({} as unknown as ReturnType<typeof nodemailer.createTransport>);
    const sender = createEmailSender();
    expect(sender).toBeInstanceOf(SmtpEmailSender);
  });

  it("creates ResendEmailSender when EMAIL_PROVIDER is resend", () => {
    const originalProvider = env.EMAIL_PROVIDER;
    try {
      Object.defineProperty(env, "EMAIL_PROVIDER", { value: "resend", configurable: true });
      const sender = createEmailSender();
      expect(sender).toBeInstanceOf(ResendEmailSender);
    } finally {
      Object.defineProperty(env, "EMAIL_PROVIDER", { value: originalProvider, configurable: true });
    }
  });

  it("creates NoopEmailSender when EMAIL_PROVIDER is noop", () => {
    const originalProvider = env.EMAIL_PROVIDER;
    try {
      Object.defineProperty(env, "EMAIL_PROVIDER", { value: "noop", configurable: true });
      const sender = createEmailSender();
      expect(sender).toBeInstanceOf(NoopEmailSender);
    } finally {
      Object.defineProperty(env, "EMAIL_PROVIDER", { value: originalProvider, configurable: true });
    }
  });
});
