"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const otpService_1 = require("@/server/services/otpService");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    try {
        const body = await request.json();
        const { userId, otp } = body;
        if (!userId || !otp) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "userId and otp are required");
        }
        if (!/^\d{6}$/.test(otp)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid OTP format. Must be 6 digits.");
        }
        const result = await (0, otpService_1.verifyOTP)(userId, otp);
        if (!result.success) {
            let statusCode = 400;
            if (result.message?.includes("expired")) {
                statusCode = 400;
            }
            else if (result.locked ||
                result.message?.includes("Maximum attempts")) {
                statusCode = 429;
            }
            return server_1.NextResponse.json({
                success: false,
                error: result.message,
                remainingAttempts: result.remainingAttempts,
            }, { status: statusCode });
        }
        return server_1.NextResponse.json({ success: true, message: result.message });
    }
    catch (error) {
        console.error("Error in verify-email:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
