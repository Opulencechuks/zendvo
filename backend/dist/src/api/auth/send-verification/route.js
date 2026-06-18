"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const otpService_1 = require("@/server/services/otpService");
const emailService_1 = require("@/server/services/emailService");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    try {
        const body = await request.json();
        const { userId, email, name } = body;
        if (!userId || !email) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "userId and email are required");
        }
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
        });
        if (!user) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
        }
        if (user.status === "active") {
            return server_1.NextResponse.json({ message: "Email already verified" }, { status: 200 });
        }
        const rateLimitResult = await (0, otpService_1.checkOTPRequestRateLimitByUserId)(userId);
        if (!rateLimitResult.allowed) {
            console.log(`[AUTH_AUDIT] OTP rate limited for user: ${userId}`);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Rate limit exceeded");
        }
        const otp = (0, otpService_1.generateOTP)();
        await (0, otpService_1.storeOTP)(userId, otp);
        const emailResult = await (0, emailService_1.sendVerificationEmail)(email, otp, name);
        if (!emailResult.success) {
            console.error("Failed to send email:", emailResult.error);
        }
        return server_1.NextResponse.json({
            success: true,
            message: "Verification code sent successfully",
            expiresIn: "10 minutes",
        });
    }
    catch (error) {
        console.error("Error in send-verification:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
