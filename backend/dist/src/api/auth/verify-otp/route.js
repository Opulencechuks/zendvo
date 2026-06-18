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
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    try {
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin && host && !origin.includes(host)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "CSRF protection: Invalid origin");
        }
        const body = await request.json();
        const { email, otp } = body;
        if (!email || !otp) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Email and OTP are required");
        }
        const sanitizedEmail = (0, validation_1.sanitizeInput)(email);
        if (!(0, validation_1.validateEmail)(sanitizedEmail)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid email format");
        }
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, sanitizedEmail),
        });
        if (!user) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
        }
        const result = await (0, otpService_1.verifyOTP)(user.id, otp);
        if (!result.success) {
            if (result.shouldSendAlert) {
                await (0, emailService_1.sendSecurityAlertEmail)(sanitizedEmail, user.name || undefined);
            }
            const status = result.locked ? 429 : 400;
            return server_1.NextResponse.json({ success: false, error: result.message }, { status });
        }
        return server_1.NextResponse.json({ success: true, message: "Email verified successfully" }, { status: 200 });
    }
    catch (error) {
        console.error("[VERIFY_OTP_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
