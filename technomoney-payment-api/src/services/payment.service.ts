import "dotenv/config";
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
