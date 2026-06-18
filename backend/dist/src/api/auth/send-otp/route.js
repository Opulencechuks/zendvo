"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const otpService_1 = require("@/server/services/otpService");
const emailService_1 = require("@/server/services/emailService");
const validation_1 = require("@/lib/validation");
const rate_limiter_1 = require("@/lib/rate-limiter");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    try {
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin && host && !origin.includes(host)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "CSRF protection: Invalid origin");
        }
        const body = await request.json();
        const { email } = body;
        if (!email) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Email is required");
        }
        const sanitizedEmail = (0, validation_1.sanitizeInput)(email);
        if (!(0, validation_1.validateEmail)(sanitizedEmail)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid email format");
        }
        if ((0, rate_limiter_1.isRateLimited)(sanitizedEmail, 3, 60 * 60 * 1000)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many OTP requests. Please try again later.");
        }
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, sanitizedEmail),
        });
        if (!user) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
        }
        if (user.status === "suspended") {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "Account suspended");
        }
        const rateLimitResult = await (0, otpService_1.checkOTPRequestRateLimitByUserId)(user.id);
        if (!rateLimitResult.allowed) {
            console.log(`[AUTH_AUDIT] OTP rate limited for user: ${user.id} from IP: ${request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"}`);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Rate limit exceeded");
        }
        const otp = (0, otpService_1.generateOTP)();
        await (0, otpService_1.storeOTP)(user.id, otp);
        const emailResult = await (0, emailService_1.sendVerificationEmail)(sanitizedEmail, otp, user.name || undefined);
        if (!emailResult.success) {
            console.error("Failed to send OTP email:", emailResult.error);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Failed to send OTP email");
        }
        return server_1.NextResponse.json({ success: true, message: "OTP sent successfully" }, { status: 200 });
    }
    catch (error) {
        console.error("[SEND_OTP_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
