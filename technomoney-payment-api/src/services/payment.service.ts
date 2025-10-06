import "dotenv/config";
import crypto from "crypto";
import MercadoPagoConfig, { Preference, Payment } from "mercadopago";
import repo from "../repositories/payment.repository";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 },
});

const preferenceClient = new Preference(mpClient);
const paymentClient = new Payment(mpClient);

export interface CreatePreferenceInput {
  fullName: string;
  cpf: string;
  email: string;
  amount: number;
}

export class ValidationError extends Error {}

export class UnauthorizedError extends Error {}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const digitsOnly = (value: string) => value.replace(/\D+/g, "");

export function validateCreatePreferencePayload(data: any): CreatePreferenceInput {
  if (typeof data !== "object" || data === null) {
    throw new ValidationError("payload must be an object");
  }

  const fullName = String((data as any).fullName || "").trim();
  if (!fullName) {
    throw new ValidationError("fullName is required");
  }

  const rawEmail = String((data as any).email || "").trim();
  if (!emailRegex.test(rawEmail)) {
    throw new ValidationError("email is invalid");
  }

  const rawCpf = String((data as any).cpf || "");
  const cpf = digitsOnly(rawCpf);
  if (cpf.length !== 11) {
    throw new ValidationError("cpf must contain 11 digits");
  }

  const amount = Number((data as any).amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError("amount must be a positive number");
  }

  return { fullName, email: rawEmail.toLowerCase(), cpf, amount };
}

export async function createPreference({
  fullName,
  cpf,
  email,
  amount,
}: CreatePreferenceInput) {
  const pref = await preferenceClient.create({
    body: {
      items: [
        {
          id: "item-1",
          title: "Compra Technomoney",
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      payer: {
        name: fullName,
        email,
        identification: { type: "CPF", number: cpf },
      },
      notification_url: `${process.env.APP_URL}/webhooks/mercadopago`,
      metadata: { email },
    },
  });

  if (!pref.id || !pref.init_point) {
    throw new Error("Mercado Pago não retornou id ou init_point");
  }

  await repo.create({
    fullName,
    cpf,
    email,
    preferenceId: pref.id,
    status: "pending",
  });

  return { id: pref.id, init_point: pref.init_point };
}

export async function processWebhook(topic: string, resourceId: string) {
  if (topic !== "payment") return;

  const payment = await paymentClient.get({ id: Number(resourceId) });

  const preferenceId =
    (payment as any).preference_id ||
    (payment as any).order?.id ||
    (payment as any).external_reference;

  if (!preferenceId) return;

  await repo.updateStatus(
    preferenceId,
    (payment.status ?? "unknown") as string
  );
}

type HeaderDictionary = NodeJS.Dict<string | string[] | undefined>;

interface VerifyWebhookSecurityInput {
  topic: string;
  resourceId: string;
  headers: HeaderDictionary;
}

const headerValueToString = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const parseSignatureHeader = (raw: string) => {
  return raw.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...valueParts] = part.split("=");
    if (!key) return acc;
    const value = valueParts.join("=").trim();
    if (!value) return acc;
    const cleanValue = value.replace(/^"/, "").replace(/"$/, "");
    acc[key.trim()] = cleanValue;
    return acc;
  }, {});
};

const timingSafeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const verifySignature = ({
  topic,
  resourceId,
  headers,
}: VerifyWebhookSecurityInput) => {
  const signatureHeader = headerValueToString(headers["x-signature"]);
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!signatureHeader || !secret) {
    return false;
  }

  const parsed = parseSignatureHeader(signatureHeader);
  const signature = parsed.sha256?.toLowerCase();
  const ts = parsed.ts;
  const headerId = parsed.id || resourceId;
  const headerTopic = parsed.topic || topic;
  const requestId = headerValueToString(headers["x-request-id"])?.trim();

  if (!signature || !ts || !requestId) {
    throw new UnauthorizedError("missing webhook signature metadata");
  }

  const message = `${headerId}:${headerTopic}:${requestId}:${ts}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  if (!timingSafeEqual(expected, signature)) {
    throw new UnauthorizedError("invalid webhook signature");
  }

  return true;
};

const verifyToken = (headers: HeaderDictionary) => {
  const token = process.env.MP_WEBHOOK_TOKEN?.trim();
  if (!token) return false;

  const headerToken = headerValueToString(headers["x-token"])?.trim();
  if (!headerToken || !timingSafeEqual(headerToken, token)) {
    throw new UnauthorizedError("invalid webhook token");
  }

  return true;
};

export function verifyWebhookSecurity(input: VerifyWebhookSecurityInput) {
  const verifiedBySignature = verifySignature(input);
  if (verifiedBySignature) {
    return;
  }

  const verifiedByToken = verifyToken(input.headers);
  if (verifiedByToken) {
    return;
  }

  throw new ValidationError("webhook security configuration is missing");
}
