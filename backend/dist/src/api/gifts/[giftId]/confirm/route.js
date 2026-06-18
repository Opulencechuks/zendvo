"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const notificationService_1 = require("@/server/services/notificationService");
const api_1 = require("@/lib/paystack/api");
const client_1 = require("@/lib/stripe/client");
const validation_1 = require("@/lib/validation");
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const server_1 = require("next/server");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request, { params }) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const { giftId } = await params;
        const body = await request.json().catch(() => ({}));
        const blockchainTxHash = body.blockchain_tx_hash || body.blockchainTxHash || null;
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
            with: {
                sender: { columns: { id: true, email: true, name: true } },
                recipient: { columns: { id: true, email: true, name: true } },
            },
        });
        if (!gift) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Gift not found");
        }
        if (!gift.senderId || gift.senderId !== userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "Forbidden");
        }
        if (gift.status === "completed" || gift.status === "sent") {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Gift has already been completed");
        }
        if (gift.status !== "confirmed") {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, `Gift must be confirmed before completion. Current status: ${gift.status}`);
        }
        if (!(0, validation_1.validateCurrency)(gift.currency)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Unsupported currency. Accepted: NGN, USD");
        }
        const giftData = gift;
        if (giftData.paymentReference && giftData.paymentProvider) {
            try {
                let verificationResult;
                let isPaymentSuccessful;
                if (giftData.paymentProvider === "paystack") {
                    verificationResult = await (0, api_1.verifyPayment)(giftData.paymentReference);
                    isPaymentSuccessful = (0, api_1.isPaymentSuccessful)(verificationResult.status);
                }
                else if (giftData.paymentProvider === "stripe") {
                    verificationResult = await (0, client_1.verifyPayment)(giftData.paymentReference);
                    isPaymentSuccessful = (0, client_1.isPaymentSuccessful)(verificationResult.status);
                }
                else {
                    return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Unsupported payment provider");
                }
                if (!isPaymentSuccessful) {
                    return (0, api_utils_1.createProblemDetails)("about:blank", "Payment Required", 402, `Payment verification failed. Payment status: ${verificationResult.status}`);
                }
                await db_1.db
                    .update(schema_1.gifts)
                    .set({ paymentVerifiedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId));
            }
            catch (error) {
                console.error("Payment verification error:", error);
                return (0, api_utils_1.createProblemDetails)("about:blank", "Payment Required", 402, "Payment verification failed. Please try again.");
            }
        }
        const senderWallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, gift.senderId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, gift.currency)),
        });
        if (!senderWallet || senderWallet.balance < gift.amount) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Payment Required", 402, "Insufficient funds");
        }
        const transactionId = `txn_${crypto_1.default.randomUUID()}`;
        await db_1.db.transaction(async (tx) => {
            await tx
                .update(schema_1.wallets)
                .set({
                balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} - ${gift.amount}`,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, gift.senderId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, gift.currency)));
            await tx
                .insert(schema_1.wallets)
                .values({
                userId: gift.recipientId,
                currency: gift.currency,
                balance: gift.amount,
            })
                .onConflictDoUpdate({
                target: [schema_1.wallets.userId, schema_1.wallets.currency],
                set: {
                    balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} + ${gift.amount}`,
                    updatedAt: new Date(),
                },
            });
            await tx
                .update(schema_1.gifts)
                .set({ status: "completed", transactionId, blockchainTxHash })
                .where((0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId));
        });
        (0, notificationService_1.notifyGiftCompleted)(gift.senderId, gift.recipientId, gift.amount, gift.currency, transactionId).catch((err) => {
            console.error("Failed to send gift completion notifications:", err);
        });
        const shareLink = `/g/${gift.slug}`;
        return server_1.NextResponse.json({
            success: true,
            status: "completed",
            transactionId,
            shareLink,
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error confirming gift:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
