export interface WhatsAppMessage {
  phone: string;
  text: string;
}

export interface WhatsAppSender {
  send(message: WhatsAppMessage): Promise<void>;
}

export class NoopWhatsAppSender implements WhatsAppSender {
  send(_message: WhatsAppMessage): Promise<void> {
    return Promise.resolve();
  }
}

export class MemoryWhatsAppSender implements WhatsAppSender {
  public readonly messages: WhatsAppMessage[] = [];

  send(message: WhatsAppMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }
}
