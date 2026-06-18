"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const otpService_1 = require("@/server/services/otpService");
const drizzle_orm_1 = require("drizzle-orm");
const server_1 = require("next/server");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const body = await request.json();
        const { giftId, otp } = body;
        if (!giftId || !otp) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "giftId and otp are required");
        }
        if (!/^\d{6}$/.test(otp)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid OTP format. Must be 6 digits.");
        }
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
        });
        if (!gift) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Gift not found");
        }
        if (gift.senderId !== userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "You are not authorized to verify this gift");
        }
        if (gift.status !== "pending_otp") {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "This gift has already been verified or is no longer pending");
        }
        const result = await (0, otpService_1.verifyGiftOTP)(gift, otp);
        if (!result.success) {
            const statusCode = result.locked ? 423 : 400;
            return server_1.NextResponse.json({
                success: false,
                error: result.message,
                remainingAttempts: result.remainingAttempts,
            }, { status: statusCode });
        }
        return server_1.NextResponse.json({
            success: true,
            message: result.message,
            data: {
                giftId: gift.id,
                status: "otp_verified",
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error("[GIFT_VERIFY_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
