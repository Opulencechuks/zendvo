import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { validateCurrency } from "@/lib/validation";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export interface ProcessGiftTransactionParams {
  senderId: string | null;
  recipientId: string;
  amount: number;
  currency: string;
}

export async function processGiftTransaction(
  params: ProcessGiftTransactionParams,
) {
  const { senderId, recipientId, amount, currency } = params;
  const normalizedCurrency = currency.toUpperCase();

  if (!validateCurrency(normalizedCurrency)) {
    throw new Error("Unsupported currency. Accepted: NGN, USD");
  }

  const transactionId = `txn_${crypto.randomUUID()}`;

  
  if (senderId) {
    const senderWallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, senderId),
        eq(wallets.currency, normalizedCurrency),
      ),
    });

    if (!senderWallet || senderWallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    
    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(wallets.userId, senderId), eq(wallets.currency, normalizedCurrency)),
      );
  }

  
  await db
    .insert(wallets)
    .values({
      userId: recipientId,
      currency: normalizedCurrency,
      balance: amount,
    })
    .onConflictDoUpdate({
      target: [wallets.userId, wallets.currency],
      set: {
        balance: sql`${wallets.balance} + ${amount}`,
        updatedAt: new Date(),
      },
    });

  return transactionId;
}

export interface ProcessGiftBankPayoutParams {
  senderId: string | null;
  amount: number;
  currency: string;
}

export async function processGiftBankPayout(
  params: ProcessGiftBankPayoutParams,
) {
  const { senderId, amount, currency } = params;
  const normalizedCurrency = currency.toUpperCase();

  if (!validateCurrency(normalizedCurrency)) {
    throw new Error("Unsupported currency. Accepted: NGN, USD");
  }

  const transactionId = `payout_${crypto.randomUUID()}`;

  if (senderId) {
    const senderWallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, senderId),
        eq(wallets.currency, normalizedCurrency),
      ),
    });

    if (!senderWallet || senderWallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(wallets.userId, senderId), eq(wallets.currency, normalizedCurrency)),
      );
  }

  return transactionId;
}

export interface ProcessRefundTransactionParams {
  senderId: string | null;
  recipientId: string;
  amount: number;
  currency: string;
}

export async function processRefundTransaction(
  params: ProcessRefundTransactionParams,
) {
  const { senderId, recipientId, amount, currency } = params;
  const transactionId = `txn_ref_${crypto.randomUUID()}`;

  
  const recipientWallet = await db.query.wallets.findFirst({
    where: and(eq(wallets.userId, recipientId), eq(wallets.currency, currency)),
  });

  if (!recipientWallet || recipientWallet.balance < amount) {
    throw new Error("Insufficient recipient balance for refund");
  }

  await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(wallets.userId, recipientId), eq(wallets.currency, currency)),
    );

  
  if (senderId) {
    await db
      .insert(wallets)
      .values({
        userId: senderId,
        currency,
        balance: amount,
      })
      .onConflictDoUpdate({
        target: [wallets.userId, wallets.currency],
        set: {
          balance: sql`${wallets.balance} + ${amount}`,
          updatedAt: new Date(),
        },
      });
  }

  return transactionId;
}
