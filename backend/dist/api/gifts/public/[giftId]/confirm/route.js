"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const transactionService_1 = require("@/server/services/transactionService");
const notificationService_1 = require("@/server/services/notificationService");
const validation_1 = require("@/lib/validation");
const api_utils_1 = require("@/lib/api-utils");
const emailService_1 = require("@/server/services/emailService");
const api_1 = require("@/lib/paystack/api");
const client_1 = require("@/lib/stripe/client");
async function POST(request, { params }) {
    try {
        const { giftId } = await params;
        const body = await request.json().catch(() => ({}));
        const blockchainTxHash = body.blockchain_tx_hash || body.blockchainTxHash || null;
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
            with: {
                sender: { columns: { id: true, name: true, email: true } },
                recipient: { columns: { id: true, name: true, email: true } },
            },
        });
        if (!gift) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Gift not found");
        }
        if (gift.status !== "pending_review") {
            if (gift.status === "completed") {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Gift has already been confirmed");
            }
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, `Gift cannot be confirmed. Current status: ${gift.status}. Expected: pending_review`);
        }
        if (!(0, validation_1.validateCurrency)(gift.currency)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Unsupported currency. Accepted: NGN, USD");
        }
        if (gift.paymentReference && gift.paymentProvider) {
            try {
                let verificationResult;
                let isPaymentSuccessful;
                if (gift.paymentProvider === "paystack") {
                    verificationResult = await (0, api_1.verifyPayment)(gift.paymentReference);
                    isPaymentSuccessful = (0, api_1.isPaymentSuccessful)(verificationResult.status);
                }
                else if (gift.paymentProvider === "stripe") {
                    verificationResult = await (0, client_1.verifyPayment)(gift.paymentReference);
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
        const shareLink = `/g/${gift.slug}`;
        const transactionId = await (0, transactionService_1.processGiftTransaction)({
            senderId: gift.senderId,
            recipientId: gift.recipientId,
            amount: gift.amount,
            currency: gift.currency,
        });
        await db_1.db
            .update(schema_1.gifts)
            .set({
            status: "completed",
            transactionId,
            blockchainTxHash,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId));
        (0, notificationService_1.notifyGiftConfirmed)(gift.senderId, gift.recipientId, gift.amount, gift.currency, shareLink, gift.unlockDatetime ?? undefined).catch((err) => {
            console.error("[GIFT_CONFIRM_NOTIFICATION_ERROR]", err);
        });
        if (gift.senderId && gift.sender) {
            (0, emailService_1.sendGiftCompletionToSender)(gift.sender.email, gift.sender.name || "Valued Sender", shareLink, gift.amount, gift.currency, gift.recipient?.name || "Gift Recipient").catch((err) => console.error("[GIFT_CONFIRM_SENDER_EMAIL_ERROR]", err));
        }
        else if (gift.senderEmail && gift.senderName) {
            (0, emailService_1.sendGiftCompletionToSender)(gift.senderEmail, gift.senderName, shareLink, gift.amount, gift.currency, gift.recipient?.name || "Gift Recipient").catch((err) => console.error("[GIFT_CONFIRM_PUBLIC_SENDER_EMAIL_ERROR]", err));
        }
        if (gift.recipient) {
            (0, emailService_1.sendGiftNotificationToRecipient)(gift.recipient.email, gift.recipient.name || "Valued Recipient", gift.senderName || (gift.sender?.name ?? "Someone"), gift.amount, gift.currency, gift.unlockDatetime ?? undefined).catch((err) => console.error("[GIFT_CONFIRM_RECIPIENT_EMAIL_ERROR]", err));
        }
        return server_1.NextResponse.json({
            success: true,
            status: "completed",
            shareLink,
            transactionId,
            message: "Gift confirmed successfully",
        }, { status: 200 });
    }
    catch (error) {
        console.error("[GIFT_CONFIRM_ERROR]", error);
        if (error instanceof Error &&
            error.message === "Unsupported currency. Accepted: NGN, USD") {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, error.message);
        }
        if (error instanceof Error &&
            error.message.includes("Insufficient balance")) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, "Insufficient balance to send gift");
        }
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
