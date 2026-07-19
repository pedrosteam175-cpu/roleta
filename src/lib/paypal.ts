import { db } from '@/db';
import { appConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function getConfig(key: string, env?: string): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(appConfig)
      .where(eq(appConfig.key, key));

    if (row?.value) return row.value;
  } catch {}

  return env ?? "";
}

export async function getPaypalClientId() {
  return getConfig(
    "paypal_client_id",
    process.env.PAYPAL_CLIENT_ID
  );
}

export async function getPaypalSecret() {
  return getConfig(
    "paypal_client_secret",
    process.env.PAYPAL_CLIENT_SECRET
  );
}

export async function getPaypalEnvironment() {
  return (
    await getConfig(
      "paypal_environment",
      process.env.PAYPAL_ENVIRONMENT
    )
  ) || "sandbox";
}

function getBaseUrl(env: string) {
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getAccessToken(): Promise<string> {
  const clientId = await getPaypalClientId();
  const secret = await getPaypalSecret();
  const env = await getPaypalEnvironment();

  if (!clientId || !secret)
    throw new Error("PayPal não configurado.");

  const auth = Buffer.from(
    `${clientId}:${secret}`
  ).toString("base64");

  const response = await fetch(
    `${getBaseUrl(env)}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    }
  );

  if (!response.ok) {
    throw new Error("Erro ao autenticar no PayPal.");
  }

  const json = await response.json();

  return json.access_token;
}

export interface PaypalPayoutDTO {
  email: string;
  amount: number;
  note?: string;
  senderItemId?: string;
}

export async function sendPaypalPayout(
  payout: PaypalPayoutDTO
) {
  const token = await getAccessToken();
  const env = await getPaypalEnvironment();

  const response = await fetch(
    `${getBaseUrl(env)}/v1/payments/payouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id:
            payout.senderItemId ??
            crypto.randomUUID(),
          email_subject:
            "Você recebeu um pagamento",
          email_message:
            payout.note ??
            "Seu saque foi processado."
        },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: payout.email,
            amount: {
              currency: "BRL",
              value: payout.amount.toFixed(2)
            },
            note:
              payout.note ??
              "Pagamento",
            sender_item_id:
              payout.senderItemId ??
              crypto.randomUUID()
          }
        ]
      })
    }
  );

  const json = await response.json();

  if (!response.ok) {
    console.error(json);
    throw new Error(
      json.message ??
      "Erro ao enviar pagamento."
    );
  }

  return json;
}
