export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class NoopEmailSender implements EmailSender {
  send(_message: EmailMessage): Promise<void> {
    return Promise.resolve();
  }
}

export class MemoryEmailSender implements EmailSender {
  public readonly messages: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }
}
