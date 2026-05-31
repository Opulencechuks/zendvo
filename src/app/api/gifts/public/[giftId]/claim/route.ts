import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gifts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  processGiftTransaction,
  processGiftBankPayout,
} from "@/server/services/transactionService";
import { notifyGiftConfirmed } from "@/server/services/notificationService";
import { validateCurrency } from "@/lib/validation";
import { createProblemDetails } from "@/lib/api-utils";
import {
  sendGiftCompletionToSender,
  sendGiftNotificationToRecipient,
} from "@/server/services/emailService";
import {
  verifyBankAccount,
  initiateBankPayout,
  verifyPayment as verifyPaystackPayment,
  isPaymentSuccessful as isPaystackPaymentSuccessful,
} from "@/lib/paystack/api";
import {
  verifyPayment as verifyStripePayment,
  isPaymentSuccessful as isStripePaymentSuccessful,
} from "@/lib/stripe/client";

const VALID_DESTINATIONS = ["wallet", "bank"] as const;

type DestinationType = (typeof VALID_DESTINATIONS)[number];

function isValidDestination(value: unknown): value is DestinationType {
  return value === "wallet" || value === "bank";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> },
) {
  try {
    const { giftId } = await params;
    const body = await request.json().catch(() => ({}));
    const destinationTypeRaw = body.destinationType;
    const destinationType: DestinationType = isValidDestination(
      destinationTypeRaw,
    )
      ? destinationTypeRaw
      : "wallet";

    if (
      destinationTypeRaw !== undefined &&
      !isValidDestination(destinationTypeRaw)
    ) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "destinationType must be either 'wallet' or 'bank'",
      );
    }

    const bankAccountNumber =
      typeof body.bankAccountNumber === "string"
        ? body.bankAccountNumber.trim()
        : typeof body.accountNumber === "string"
        ? body.accountNumber.trim()
        : null;
    const bankCode =
      typeof body.bankCode === "string" ? body.bankCode.trim() : null;
    const blockchainTxHash =
      body.blockchain_tx_hash || body.blockchainTxHash || null;

    const gift = await db.query.gifts.findFirst({
      where: eq(gifts.id, giftId),
      with: {
        sender: { columns: { id: true, name: true, email: true } },
        recipient: { columns: { id: true, name: true, email: true } },
      },
    });

    if (!gift) {
      return createProblemDetails(
        "about:blank",
        "Not Found",
        404,
        "Gift not found",
      );
    }

    if (gift.linkExpiresAt && new Date(gift.linkExpiresAt) < new Date()) {
      return createProblemDetails(
        "about:blank",
        "Gone",
        410,
        "This gift link has expired",
      );
    }

    if (gift.status !== "pending_review") {
      if (gift.status === "completed") {
        return createProblemDetails(
          "about:blank",
          "Conflict",
          409,
          "Gift has already been claimed",
        );
      }
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        `Gift cannot be claimed. Current status: ${gift.status}. Expected: pending_review`,
      );
    }

    if (!validateCurrency(gift.currency)) {
      return createProblemDetails(
        "about:blank",
        "Bad Request",
        400,
        "Unsupported currency. Accepted: NGN, USD",
      );
    }

    if (gift.paymentReference && gift.paymentProvider) {
      try {
        let verificationResult;
        let isPaymentSuccessful;

        if (gift.paymentProvider === "paystack") {
          verificationResult = await verifyPaystackPayment(
            gift.paymentReference,
          );
          isPaymentSuccessful = isPaystackPaymentSuccessful(
            verificationResult.status,
          );
        } else if (gift.paymentProvider === "stripe") {
          verificationResult = await verifyStripePayment(gift.paymentReference);
          isPaymentSuccessful = isStripePaymentSuccessful(
            verificationResult.status,
          );
        } else {
          return createProblemDetails(
            "about:blank",
            "Bad Request",
            400,
            "Unsupported payment provider",
          );
        }

        if (!isPaymentSuccessful) {
          return createProblemDetails(
            "about:blank",
            "Payment Required",
            402,
            `Payment verification failed. Payment status: ${verificationResult.status}`,
          );
        }

        await db
          .update(gifts)
          .set({ paymentVerifiedAt: new Date() })
          .where(eq(gifts.id, giftId));
      } catch (error) {
        console.error("Payment verification error:", error);
        return createProblemDetails(
          "about:blank",
          "Payment Required",
          402,
          "Payment verification failed. Please try again.",
        );
      }
    }

    let transactionId = null;
    let successMessage = "Gift claimed successfully";

    if (destinationType === "wallet") {
      if (!gift.recipientId) {
        return createProblemDetails(
          "about:blank",
          "Bad Request",
          400,
          "Recipient ID is required to claim funds to a Zendvo wallet",
        );
      }

      transactionId = await processGiftTransaction({
        senderId: gift.senderId,
        recipientId: gift.recipientId,
        amount: gift.amount,
        currency: gift.currency,
      });
      successMessage = "Gift claimed to Zendvo wallet";
    } else {
      if (!bankAccountNumber || !bankCode) {
        return createProblemDetails(
          "about:blank",
          "Bad Request",
          400,
          "Bank account number and bank code are required for bank payouts",
        );
      }

      const verification = await verifyBankAccount(bankAccountNumber, bankCode);
      if (!verification || verification.status !== "mock_verified") {
        return createProblemDetails(
          "about:blank",
          "Bad Request",
          400,
          "Unable to verify bank account details",
        );
      }

      await processGiftBankPayout({
        senderId: gift.senderId,
        amount: gift.amount,
        currency: gift.currency,
      });

      const payoutResult = await initiateBankPayout({
        bankAccountNumber,
        bankCode,
        amount: gift.amount,
        currency: gift.currency,
        recipientName:
          gift.recipient?.name || verification.name || "Zendvo Recipient",
      });

      if (!payoutResult.success) {
        return createProblemDetails(
          "about:blank",
          "Bad Gateway",
          502,
          "Unable to initiate bank payout",
        );
      }

      transactionId = payoutResult.payoutReference;
      successMessage = "Gift claimed and bank payout initiated";
    }

    const shareLink = `/g/${gift.slug}`;

    await db
      .update(gifts)
      .set({
        status: "completed",
        transactionId,
        blockchainTxHash,
        updatedAt: new Date(),
      })
      .where(eq(gifts.id, giftId));

    notifyGiftConfirmed(
      gift.senderId,
      gift.recipientId,
      gift.amount,
      gift.currency,
      shareLink,
      gift.unlockDatetime ?? undefined,
    ).catch((err: unknown) => {
      console.error("[GIFT_CLAIM_NOTIFICATION_ERROR]", err);
    });

    if (gift.senderId && gift.sender) {
      sendGiftCompletionToSender(
        gift.sender.email,
        gift.sender.name || "Valued Sender",
        shareLink,
        gift.amount,
        gift.currency,
        gift.recipient?.name || "Gift Recipient",
      ).catch((err: unknown) =>
        console.error("[GIFT_CLAIM_SENDER_EMAIL_ERROR]", err),
      );
    } else if (gift.senderEmail && gift.senderName) {
      sendGiftCompletionToSender(
        gift.senderEmail,
        gift.senderName,
        shareLink,
        gift.amount,
        gift.currency,
        gift.recipient?.name || "Gift Recipient",
      ).catch((err: unknown) =>
        console.error("[GIFT_CLAIM_PUBLIC_SENDER_EMAIL_ERROR]", err),
      );
    }

    if (gift.recipient) {
      sendGiftNotificationToRecipient(
        gift.recipient.email,
        gift.recipient.name || "Valued Recipient",
        gift.senderName || (gift.sender?.name ?? "Someone"),
        gift.amount,
        gift.currency,
        gift.unlockDatetime ?? undefined,
      ).catch((err: unknown) =>
        console.error("[GIFT_CLAIM_RECIPIENT_EMAIL_ERROR]", err),
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: "completed",
        destinationType,
        shareLink,
        transactionId,
        message: successMessage,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GIFT_CLAIM_ERROR]", error);

    if (error instanceof Error && error.message.includes("Insufficient balance")) {
      return createProblemDetails(
        "about:blank",
        "Unprocessable Entity",
        422,
        "Insufficient balance to process this claim",
      );
    }

    return createProblemDetails(
      "about:blank",
      "Internal Server Error",
      500,
      "Internal server error",
    );
  }
}
