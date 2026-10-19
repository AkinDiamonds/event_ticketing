import { createEmailSender } from "../src/features/notifications/index.js";

const sender = createEmailSender();
await sender.send({
  to: "simeonakinrinola7@gmail.com",
  subject: "Test Ticket Email",
  html: "<h1>Test email from local backend</h1>",
});
console.log("Email sent successfully!");
