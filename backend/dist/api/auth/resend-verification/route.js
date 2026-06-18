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
const resendAttempts = new Map();
const MAX_RESENDS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
async function POST(request) {
    try {
        const body = await request.json();
        const { userId, email, name } = body;
        if (!userId || !email) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "userId and email are required");
        }
        const now = Date.now();
        const userAttempts = resendAttempts.get(userId);
        if (userAttempts) {
            if (now > userAttempts.resetAt) {
                resendAttempts.delete(userId);
            }
            else if (userAttempts.count >= MAX_RESENDS_PER_HOUR) {
                const remainingTime = Math.ceil((userAttempts.resetAt - now) / 1000 / 60);
                return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Rate limit exceeded");
            }
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
        const otp = (0, otpService_1.generateOTP)();
        await (0, otpService_1.storeOTP)(userId, otp);
        const emailResult = await (0, emailService_1.sendVerificationEmail)(email, otp, name);
        if (!emailResult.success) {
            console.error("Failed to send email:", emailResult.error);
        }
        if (userAttempts) {
            userAttempts.count++;
        }
        else {
            resendAttempts.set(userId, {
                count: 1,
                resetAt: now + RATE_LIMIT_WINDOW,
            });
        }
        const remainingResends = MAX_RESENDS_PER_HOUR - (resendAttempts.get(userId)?.count || 1);
        return server_1.NextResponse.json({
            success: true,
            message: "New verification code sent successfully",
            expiresIn: "10 minutes",
            remainingResends,
        });
    }
    catch (error) {
        console.error("Error in resend-verification:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
