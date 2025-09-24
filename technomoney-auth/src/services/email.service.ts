import { getLogger } from "../utils/log/logger";
import { getLogContext } from "../utils/log/logging-context";
import { maskEmail } from "../utils/log/log.helpers";

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
};

export interface MailTransport {
  send(message: MailPayload): Promise<void>;
}

class LogOnlyTransport implements MailTransport {
  async send(message: MailPayload): Promise<void> {
    const log = getLogger({
      svc: "EmailTransport",
      ...getLogContext(),
    });
    log.info(
      {
        evt: "email.stub.send",
        to: maskEmail(message.to),
        subject: message.subject,
      },
      "email_stub.sent"
    );
  }
}

const defaultTransport = new LogOnlyTransport();

const sanitizeText = (input: string): string => {
  return input.replace(/[\r\n]+/g, (match) => (match.length > 2 ? "\n\n" : "\n"));
};

export class EmailService {
  constructor(private readonly transport: MailTransport = defaultTransport) {}

  async sendPasswordReset(
    to: string,
    link: string,
    expiresAt: Date
  ): Promise<void> {
    const subject = "Recuperação de senha";
    const text = sanitizeText(
      `Olá,\n\nRecebemos uma solicitação para redefinir sua senha. ` +
        `Use o link abaixo e conclua o processo em até ${Math.ceil(
          (expiresAt.getTime() - Date.now()) / 60000
        )} minutos:\n\n${link}\n\n` +
        "Se você não solicitou essa ação, ignore esta mensagem."
    );
    await this.transport.send({ to, subject, text });
  }

  async sendEmailVerification(
    to: string,
    link: string,
    expiresAt: Date
  ): Promise<void> {
    const subject = "Confirmação de e-mail";
    const text = sanitizeText(
      `Olá,\n\nConfirme seu endereço de e-mail utilizando o link seguro abaixo. ` +
        `O link expira em ${Math.ceil(
          (expiresAt.getTime() - Date.now()) / 60000
        )} minutos:\n\n${link}\n\n` +
        "Se você não criou uma conta, nenhuma ação adicional é necessária."
    );
    await this.transport.send({ to, subject, text });
  }
}
