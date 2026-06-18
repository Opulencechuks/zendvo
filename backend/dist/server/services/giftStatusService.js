"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GIFT_STATUS_TRANSITIONS = void 0;
exports.validateGiftStatusTransition = validateGiftStatusTransition;
exports.transitionGiftStatus = transitionGiftStatus;
exports.markGiftPaymentSuccessfulByReference = markGiftPaymentSuccessfulByReference;
exports.getGiftStatusFlow = getGiftStatusFlow;
exports.isTerminalStatus = isTerminalStatus;
exports.canTransitionFrom = canTransitionFrom;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.GIFT_STATUS_TRANSITIONS = {
    pending_otp: ["otp_verified", "failed"],
    otp_verified: ["pending_review", "confirmed", "failed"],
    pending_review: ["confirmed", "failed"],
    confirmed: ["completed", "sent", "failed"],
    completed: ["sent"],
    sent: [],
    failed: [],
};
async function validateGiftStatusTransition(giftId, targetStatus, currentUserId) {
    const gift = await db_1.db.query.gifts.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
    });
    if (!gift) {
        return {
            success: false,
            message: "Gift not found",
        };
    }
    const currentStatus = gift.status;
    const allowedTransitions = exports.GIFT_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
        return {
            success: false,
            message: `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(", ")}`,
            currentStatus,
            allowedTransitions,
        };
    }
    const validationResult = await validateBusinessRules(gift, targetStatus, currentUserId);
    if (!validationResult.success) {
        return validationResult;
    }
    return {
        success: true,
        message: `Status transition from ${currentStatus} to ${targetStatus} is allowed`,
        currentStatus,
        allowedTransitions,
    };
}
async function validateBusinessRules(gift, targetStatus, currentUserId) {
    const now = new Date();
    switch (targetStatus) {
        case "otp_verified":
            if (gift.otpHash &&
                gift.otpExpiresAt &&
                now > new Date(gift.otpExpiresAt)) {
                return {
                    success: false,
                    message: "OTP has expired. Please request a new verification code.",
                };
            }
            break;
        case "confirmed":
            if (!gift.unlockDatetime) {
                return {
                    success: false,
                    message: "Cannot lock gift: no unlock datetime specified",
                };
            }
            if (new Date(gift.unlockDatetime) <= now) {
                return {
                    success: false,
                    message: "Cannot lock gift: unlock datetime must be in the future",
                };
            }
            break;
        case "completed":
            if (gift.unlockDatetime && new Date(gift.unlockDatetime) > now) {
                return {
                    success: false,
                    message: "Gift cannot be unlocked yet. Please wait until the unlock datetime.",
                };
            }
            break;
        case "sent":
            if (gift.senderId) {
                if (gift.status !== "completed" && gift.status !== "confirmed") {
                    return {
                        success: false,
                        message: `Gift must be completed or confirmed to be sent. Current status: ${gift.status}`,
                    };
                }
            }
            break;
        default:
            break;
    }
    return { success: true, message: "Business rules validation passed" };
}
async function transitionGiftStatus(giftId, targetStatus, metadata) {
    const validation = await validateGiftStatusTransition(giftId, targetStatus);
    if (!validation.success) {
        return validation;
    }
    try {
        const updateData = { status: targetStatus };
        if ((targetStatus === "completed" || targetStatus === "sent") &&
            metadata?.transactionId) {
            updateData.transactionId = metadata.transactionId;
        }
        await db_1.db.update(schema_1.gifts).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId));
        return {
            success: true,
            message: `Gift status successfully updated to ${targetStatus}`,
        };
    }
    catch (error) {
        console.error(`Error transitioning gift ${giftId} to ${targetStatus}:`, error);
        return {
            success: false,
            message: "Database error while updating gift status",
        };
    }
}
async function markGiftPaymentSuccessfulByReference(reference, provider) {
    try {
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gifts.paymentReference, reference), (0, drizzle_orm_1.eq)(schema_1.gifts.paymentProvider, provider)),
        });
        if (!gift) {
            return {
                success: false,
                message: "Gift not found for payment reference",
            };
        }
        const alreadyProcessedStatuses = [
            "pending_review",
            "confirmed",
            "completed",
            "sent",
        ];
        if (alreadyProcessedStatuses.includes(gift.status)) {
            return {
                success: true,
                message: `Gift already processed with status ${gift.status}`,
                currentStatus: gift.status,
            };
        }
        await db_1.db
            .update(schema_1.gifts)
            .set({
            status: "pending_review",
            paymentVerifiedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.gifts.id, gift.id));
        return {
            success: true,
            message: "Gift payment marked successful",
            currentStatus: "pending_review",
        };
    }
    catch (error) {
        console.error("Error marking gift payment successful by reference:", error);
        return {
            success: false,
            message: "Database error while marking payment successful",
        };
    }
}
function getGiftStatusFlow() {
    return [
        "pending_otp",
        "otp_verified",
        "pending_review",
        "confirmed",
        "completed",
        "sent",
        "failed",
    ];
}
function isTerminalStatus(status) {
    return status === "sent" || status === "failed";
}
function canTransitionFrom(currentStatus, targetStatus) {
    const transitions = exports.GIFT_STATUS_TRANSITIONS[currentStatus] || [];
    return transitions.includes(targetStatus);
}
