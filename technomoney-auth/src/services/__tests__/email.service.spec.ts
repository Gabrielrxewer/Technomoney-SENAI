import assert from "node:assert/strict";
import test from "node:test";

import { EmailService, MailPayload } from "../email.service";

test("sendPasswordReset sanitiza quebras de linha para evitar header injection", async () => {
  const messages: MailPayload[] = [];
  const service = new EmailService({
    async send(message) {
      messages.push(message);
    },
  });

  const maliciousLink = "https://app.example/reset\n\n\nhttps://evil";
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await service.sendPasswordReset("user@example.com", maliciousLink, expiresAt);

  assert.equal(messages.length, 1);
  const payload = messages[0];
  assert.equal(payload.to, "user@example.com");
  assert.equal(payload.subject, "Recuperação de senha");
  assert.equal(payload.text.includes("\r"), false, "texto não deve conter CR");
  assert.equal(
    payload.text.includes("\n\n\n"),
    false,
    "texto não deve preservar mais que duas quebras consecutivas"
  );
  assert.ok(
    payload.text.includes("https://app.example/reset\n\nhttps://evil"),
    "link deve ser preservado com sanitização controlada"
  );
});

test("sendEmailVerification preserva mensagem e mantém sanitização", async () => {
  const messages: MailPayload[] = [];
  const service = new EmailService({
    async send(message) {
      messages.push(message);
    },
  });

  const link = "https://app.example/verify?token=abc123";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await service.sendEmailVerification("verify@example.com", link, expiresAt);

  assert.equal(messages.length, 1);
  const payload = messages[0];
  assert.equal(payload.to, "verify@example.com");
  assert.equal(payload.subject, "Confirmação de e-mail");
  assert.equal(payload.text.includes("\r"), false);
  assert.ok(payload.text.includes(link));
  assert.ok(
    payload.text.includes("Confirme seu endereço de e-mail"),
    "mensagem base deve ser mantida"
  );
});
