"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_session_1 = require("@/lib/auth-session");
const otpService_1 = require("@/server/services/otpService");
const emailService_1 = require("@/server/services/emailService");
const api_utils_1 = require("@/lib/api-utils");
const RESEND_COOLDOWN_MS = 60 * 1000;
async function POST(request) {
    try {
        const payload = await (0, auth_session_1.getAuthPayload)(request);
        if (!payload) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, payload.userId),
        });
        if (!user) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
        }
        if (user.status === "active") {
            console.log(`[AUTH_AUDIT] OTP resend requested for verified user: ${user.id} from IP: ${request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"}`);
            return server_1.NextResponse.json({ success: true, message: "Email already verified" }, { status: 200 });
        }
        const latestVerification = await db_1.db.query.emailVerifications.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.emailVerifications.userId, user.id),
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.emailVerifications.createdAt)],
            columns: { createdAt: true },
        });
        const now = Date.now();
        if (latestVerification &&
            now - new Date(latestVerification.createdAt).getTime() <
                RESEND_COOLDOWN_MS) {
            const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS -
                (now - new Date(latestVerification.createdAt).getTime())) /
                1000);
            console.log(`[AUTH_AUDIT] OTP resend rate limited for user: ${user.id} from IP: ${request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"}`);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Rate limit exceeded");
        }
        const rateLimitResult = await (0, otpService_1.checkOTPRequestRateLimitByUserId)(user.id);
        if (!rateLimitResult.allowed) {
            console.log(`[AUTH_AUDIT] OTP rate limited for user: ${user.id} from IP: ${request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"}`);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Rate limit exceeded");
        }
        const otp = (0, otpService_1.generateOTP)();
        await (0, otpService_1.storeOTP)(user.id, otp);
        const emailResult = await (0, emailService_1.sendVerificationEmail)(user.email, otp, user.name || undefined);
        if (!emailResult.success) {
            console.error(`[AUTH_AUDIT] OTP resend email failed for user: ${user.id}`, emailResult.error);
        }
        console.log(`[AUTH_AUDIT] OTP resent for user: ${user.id} from IP: ${request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"}`);
        return server_1.NextResponse.json({
            success: true,
            message: "New verification code sent successfully",
            expiresIn: "10 minutes",
        });
    }
    catch (error) {
        console.error("Error in resend-otp:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
