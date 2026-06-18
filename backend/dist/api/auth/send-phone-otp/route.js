"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const otpService_1 = require("@/server/services/otpService");
const rate_limiter_1 = require("@/lib/rate-limiter");
const validation_1 = require("@/lib/validation");
const api_utils_1 = require("@/lib/api-utils");
const OTP_RATE_LIMIT = 3;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000;
async function POST(request) {
    try {
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin && host && !origin.includes(host)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "CSRF protection: Invalid origin");
        }
        const body = await request.json();
        const { phoneNumber } = body;
        if (!phoneNumber) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Phone number is required");
        }
        if (!(0, validation_1.validateE164PhoneNumber)(phoneNumber)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid phone number format. Please use E.164 format (e.g., +2348123456789)");
        }
        if ((0, rate_limiter_1.isRateLimited)(`otp:${phoneNumber}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_MS)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many OTP requests. Please try again later.");
        }
        const result = await (0, otpService_1.sendOTP)(phoneNumber);
        if (!result.success) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, result.message);
        }
        return server_1.NextResponse.json({ success: true, message: result.message }, { status: 200 });
    }
    catch (error) {
        console.error("[SEND_PHONE_OTP_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
