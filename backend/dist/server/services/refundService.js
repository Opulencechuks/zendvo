"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRefund = processRefund;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("@/lib/stripe/client");
const api_1 = require("@/lib/paystack/api");
const transactionService_1 = require("./transactionService");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const client_2 = require("@/lib/stellar/client");
async function processRefund(giftId) {
    const gift = await db_1.db.query.gifts.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
    });
    if (!gift) {
        throw new Error(`Gift with ID ${giftId} not found`);
    }
    if (gift.status === "failed" || gift.status === "completed") {
        return;
    }
    if (gift.paymentProvider === "stripe" && gift.paymentReference) {
        const session = await client_1.stripe.checkout.sessions.retrieve(gift.paymentReference);
        if (session.payment_intent) {
            await client_1.stripe.refunds.create({
                payment_intent: session.payment_intent,
            });
        }
    }
    else if (gift.paymentProvider === "paystack" && gift.paymentReference) {
        const response = await fetch(`${api_1.paystackConfig.baseUrl}/refund`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${api_1.paystackConfig.secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ transaction: gift.paymentReference }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to process Paystack refund");
        }
    }
    else if (gift.paymentProvider === "stellar") {
        const secretKey = process.env.STELLAR_SECRET_KEY || process.env.STELLAR_SIGNER_SECRET_KEY;
        if (secretKey && gift.senderId && gift.amount) {
            try {
                const signer = stellar_sdk_1.Keypair.fromSecret(secretKey);
                const sourceAccount = await client_2.stellarClient.loadAccount(signer.publicKey());
                const transaction = new stellar_sdk_1.TransactionBuilder(sourceAccount, {
                    fee: stellar_sdk_1.BASE_FEE,
                    networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                })
                    .addOperation(stellar_sdk_1.Operation.payment({
                    destination: signer.publicKey(),
                    asset: stellar_sdk_1.Asset.native(),
                    amount: gift.amount.toString(),
                }))
                    .setTimeout(30)
                    .build();
                transaction.sign(signer);
                await client_2.stellarClient.submitTransaction(transaction);
            }
            catch (error) {
                throw new Error(`Stellar reverse transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }
        else {
            throw new Error("Unable to initiate reverse Stellar transaction: Missing configuration or sender details");
        }
    }
    else {
        if (gift.recipientId) {
            await (0, transactionService_1.processRefundTransaction)({
                senderId: gift.senderId,
                recipientId: gift.recipientId,
                amount: gift.amount,
                currency: gift.currency,
            });
        }
    }
    await db_1.db
        .update(schema_1.gifts)
        .set({
        status: "failed",
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId));
}
