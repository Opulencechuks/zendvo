"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const validation_1 = require("@/lib/validation");
const currency_1 = require("@/lib/currency");
const rate_limiter_1 = require("@/lib/rate-limiter");
const honeypot_1 = require("@/lib/honeypot");
const slug_1 = require("@/lib/slug");
const shortCode_1 = require("@/lib/shortCode");
const api_utils_1 = require("@/lib/api-utils");
const MAX_MESSAGE_LENGTH = 500;
async function POST(request) {
    try {
        const ip = request.headers.get("x-forwarded-for") ??
            request.headers.get("x-real-ip") ??
            "unknown";
        if ((0, rate_limiter_1.isRateLimited)(ip, 10, 60_000)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many requests. Please try again later.");
        }
        const body = await request.json();
        if (!(0, honeypot_1.validateHoneypot)(body)) {
            console.warn("[PUBLIC_GIFT] Honeypot triggered, rejecting bot request");
            return server_1.NextResponse.json({
                success: true,
                data: { giftId: crypto.randomUUID(), status: "pending_review" },
            }, { status: 201 });
        }
        const { recipientId, amount, currency = "NGN", unlockDatetime, hideAmount, message, senderName, senderEmail, senderAvatar, } = body;
        let utcUnlockDatetime = null;
        if (!recipientId || !amount || !senderName || !senderEmail) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "recipientId, amount, senderName, and senderEmail are required");
        }
        if (typeof amount !== "number" || !(0, validation_1.validateAmount)(amount)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, "Amount must be a positive number not exceeding 10,000");
        }
        if (typeof currency !== "string" || !(0, validation_1.validateCurrency)(currency)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, `Unsupported currency. Accepted: ${currency_1.supportedCurrencyCodes.join(", ")}`);
        }
        if (typeof senderEmail !== "string" || !(0, validation_1.validateEmail)(senderEmail)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, "Invalid sender email address");
        }
        if (unlockDatetime !== undefined && unlockDatetime !== null) {
            try {
                utcUnlockDatetime = (0, validation_1.convertToUTCDate)(unlockDatetime);
                if (!utcUnlockDatetime || !(0, validation_1.validateFutureDatetime)(utcUnlockDatetime)) {
                    return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, "Delivery datetime must be a valid ISO 8601 date string with timezone in the future");
                }
            }
            catch (error) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, error instanceof Error ? error.message : "Invalid date format");
            }
        }
        if (message &&
            typeof message === "string" &&
            message.length > MAX_MESSAGE_LENGTH) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, `Message must not exceed ${MAX_MESSAGE_LENGTH} characters`);
        }
        const recipientUser = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, recipientId),
        });
        if (!recipientUser) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Recipient not found");
        }
        const sanitizedSenderEmail = (0, validation_1.sanitizeInput)(senderEmail).toLowerCase();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const duplicate = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gifts.senderEmail, sanitizedSenderEmail), (0, drizzle_orm_1.eq)(schema_1.gifts.recipientId, recipientId), (0, drizzle_orm_1.eq)(schema_1.gifts.amount, amount), (0, drizzle_orm_1.gte)(schema_1.gifts.createdAt, fiveMinutesAgo)),
        });
        if (duplicate) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "A similar gift was recently submitted. Please wait before trying again.");
        }
        const sanitizedMessage = message ? (0, validation_1.sanitizeInput)(message) : null;
        const sanitizedSenderName = (0, validation_1.sanitizeInput)(senderName);
        const sanitizedSenderAvatar = senderAvatar
            ? (0, validation_1.sanitizeInput)(senderAvatar)
            : null;
        const slug = await (0, slug_1.generateUniqueSlug)();
        const shortCode = await (0, shortCode_1.generateUniqueShortCode)();
        const [newGift] = await db_1.db
            .insert(schema_1.gifts)
            .values({
            recipientId,
            amount,
            currency: currency.toUpperCase(),
            message: sanitizedMessage,
            status: "pending_review",
            hideAmount: hideAmount ?? false,
            unlockDatetime: utcUnlockDatetime,
            senderName: sanitizedSenderName,
            senderEmail: sanitizedSenderEmail,
            senderAvatar: sanitizedSenderAvatar,
            slug,
            shortCode,
            totalAmount: amount,
        })
            .returning();
        return server_1.NextResponse.json({
            success: true,
            data: {
                giftId: newGift.id,
                status: "pending_review",
                slug: newGift.slug,
                shortCode: newGift.shortCode,
            },
        }, { status: 201 });
    }
    catch (error) {
        console.error("[PUBLIC_GIFT_CREATE_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
