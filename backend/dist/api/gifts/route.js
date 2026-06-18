"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const api_utils_1 = require("@/lib/api-utils");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const validation_1 = require("@/lib/validation");
const otpService_1 = require("@/server/services/otpService");
const emailService_1 = require("@/server/services/emailService");
const slug_1 = require("@/lib/slug");
const shortCode_1 = require("@/lib/shortCode");
async function GET() {
    return (0, api_utils_1.paginatedResponse)([], 0, 1, 10);
}
async function POST(request) {
    try {
        const userId = request.headers.get("x-user-id");
        const userEmail = request.headers.get("x-user-email");
        if (!userId || !userEmail) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const body = await request.json();
        if (body.recipient === undefined || body.amount === undefined) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Recipient and amount are required");
        }
        if (typeof body.amount !== "number" || body.amount <= 0) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, "Gift amount needs to be above the minimum threshold");
        }
        const validationResult = validation_1.CreateGiftSchema.safeParse(body);
        if (!validationResult.success) {
            const firstError = validationResult.error.issues[0];
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, firstError.message);
        }
        const { recipient, amount, currency, message, template, coverImageId, unlock_at, senderAvatar, recipientPhone, } = validationResult.data;
        const recipientUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, recipient),
        });
        if (!recipientUser) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Recipient not found");
        }
        if (recipient === userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, "Cannot send gift to yourself");
        }
        const sanitizedMessage = message ? (0, validation_1.sanitizeInput)(message) : null;
        const sanitizedTemplate = template ? (0, validation_1.sanitizeInput)(template) : null;
        const sanitizedCoverImageId = coverImageId
            ? (0, validation_1.sanitizeInput)(String(coverImageId))
            : null;
        const sanitizedSenderAvatar = senderAvatar ? (0, validation_1.sanitizeInput)(senderAvatar) : null;
        const sanitizedRecipientPhone = recipientPhone ? (0, validation_1.sanitizePhoneNumber)(recipientPhone) : null;
        if (!(0, validation_1.validateMessage)(sanitizedMessage)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Message cannot exceed 500 characters");
        }
        if (unlock_at) {
            const unlockValidation = (0, validation_1.validateUnlockAt)(unlock_at);
            if (!unlockValidation.valid) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, unlockValidation.error || "Invalid delivery date");
            }
        }
        const slug = await (0, slug_1.generateUniqueSlug)();
        const shortCode = await (0, shortCode_1.generateUniqueShortCode)();
        const [newGift] = await db_1.db
            .insert(schema_1.gifts)
            .values({
            senderId: userId,
            recipientId: recipient,
            amount,
            currency,
            message: sanitizedMessage,
            template: sanitizedTemplate,
            coverImageId: sanitizedCoverImageId,
            senderAvatar: sanitizedSenderAvatar,
            recipientPhone: sanitizedRecipientPhone,
            unlockDatetime: unlock_at ? (0, validation_1.convertToUTCDate)(unlock_at) : null,
            status: "pending_otp",
            slug,
            shortCode,
            totalAmount: amount,
        })
            .returning();
        const otp = (0, otpService_1.generateOTP)();
        await (0, otpService_1.storeGiftOTP)(newGift.id, otp);
        const emailResult = await (0, emailService_1.sendGiftConfirmationOTP)(userEmail, otp, recipientUser.name || undefined);
        if (!emailResult.success) {
            console.error("Failed to send gift confirmation OTP:", emailResult.message);
        }
        return server_1.NextResponse.json({
            success: true,
            giftId: newGift.id,
            status: "pending_otp",
            slug: newGift.slug,
            shortCode: newGift.shortCode,
        }, { status: 201 });
    }
    catch (error) {
        console.error("Error creating gift:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
