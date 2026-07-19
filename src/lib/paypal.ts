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


export async function getAccessToken() {
  const clientId = await getPaypalClientId();
  const secret = await getPaypalSecret();
  const env = await getPaypalEnvironment();

  if (!clientId || !secret) {
    throw new Error("PayPal não configurado.");
  }


  const auth = Buffer
    .from(`${clientId}:${secret}`)
    .toString("base64");


  const response = await fetch(
    `${getBaseUrl(env)}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body:
        "grant_type=client_credentials",
    }
  );


  if (!response.ok) {
    throw new Error(
      "Falha ao autenticar no PayPal."
    );
  }


  const data = await response.json();

  return data.access_token;
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

  if (
    !payout.email ||
    payout.amount <= 0
  ) {
    throw new Error(
      "Dados do payout inválidos."
    );
  }


  const token = await getAccessToken();
  const env = await getPaypalEnvironment();


  const batchId =
    payout.senderItemId ??
    crypto.randomUUID();


  const response = await fetch(
    `${getBaseUrl(env)}/v1/payments/payouts`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },


      body: JSON.stringify({

        sender_batch_header: {

          sender_batch_id: batchId,

          email_subject:
            "Seu saque foi enviado",

          email_message:
            payout.note ??
            "Seu pagamento foi processado."

        },


        items: [

          {

            recipient_type:
              "EMAIL",

            receiver:
              payout.email,

            amount: {

              value:
                payout.amount.toFixed(2),

              currency:
                "BRL"

            },

            note:
              payout.note ??
              "Saque",

            sender_item_id:
              batchId

          }

        ]

      })
    }
  );


  const data = await response.json();


  if (!response.ok) {

    console.error(
      "PayPal Payout Error:",
      data
    );

    throw new Error(
      data.message ||
      "Erro no PayPal Payout."
    );

  }


  return data;
}
