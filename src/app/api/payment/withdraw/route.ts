import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, generateId } from "@/lib/auth";
import { sendPaypalPayout } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }


    const { amount, paypalEmail } = await req.json();

    const value = Number(amount);


    if (!value || value <= 0) {
      return NextResponse.json(
        { error: "Valor inválido" },
        { status: 400 }
      );
    }


    if (
      !paypalEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)
    ) {
      return NextResponse.json(
        { error: "E-mail PayPal inválido." },
        { status: 400 }
      );
    }


    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id));


    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }


    if (user.balance < value) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 }
      );
    }


    const txId = generateId();


    const payout = await sendPaypalPayout({
      email: paypalEmail,
      amount: value,
      note: "Saque Roleta da Sorte",
      senderItemId: txId,
    });


    const payoutId =
      payout?.batch_header?.payout_batch_id || null;


    const newBalance = Number(
      (user.balance - value).toFixed(2)
    );


    await db
      .update(users)
      .set({
        balance: newBalance,

        totalWithdrawn:
          user.totalWithdrawn + value,

        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));



    await db.insert(transactions).values({

      id: txId,

      userId: user.id,

      type: "withdrawal",

      status: "completed",

      amount: value,


      paypalEmail,

      paypalBatchId: payoutId,

      paypalPayoutId: payoutId,


      description:
        `Saque PayPal R$ ${value.toFixed(2)}`,

    });



    return NextResponse.json({

      success: true,

      payout,

      newBalance,

    });


  } catch (err) {

    console.error(
      "WITHDRAW ERROR:",
      err
    );


    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro ao processar saque."
      },
      {
        status: 500
      }
    );

  }
}
