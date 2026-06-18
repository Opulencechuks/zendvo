"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const validation_1 = require("@/lib/validation");
const emailService_1 = require("@/server/services/emailService");
const api_utils_1 = require("@/lib/api-utils");
const authRepository_1 = require("@/server/db/authRepository");
const BCRYPT_COST = 12;
async function POST(request) {
    try {
        const body = await request.json();
        const { token, password, newPassword } = body;
        const nextPassword = newPassword ?? password;
        if (!token || !nextPassword) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Token and new password are required");
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(token)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid token format");
        }
        if (!(0, validation_1.validatePassword)(nextPassword)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Password too weak");
        }
        const resetRequest = await (0, authRepository_1.findPasswordResetByToken)(token);
        if (!resetRequest) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid or expired token");
        }
        if (resetRequest.usedAt) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Token has already been used");
        }
        if (new Date() > resetRequest.expiresAt) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Token has expired");
        }
        const hashedPassword = await bcryptjs_1.default.hash(nextPassword, BCRYPT_COST);
        await (0, authRepository_1.completePasswordReset)({
            resetId: resetRequest.id,
            userId: resetRequest.userId,
            passwordHash: hashedPassword,
        });
        (0, emailService_1.sendPasswordResetConfirmationEmail)(resetRequest.user.email, resetRequest.user.name || undefined).catch((err) => console.error("[RESET_PASSWORD_CONFIRMATION_ERROR]", err));
        console.log(`[AUTH_AUDIT] Password successfully reset for user: ${resetRequest.userId}`);
        return server_1.NextResponse.json({ success: true, message: "Password has been reset successfully." }, { status: 200 });
    }
    catch (error) {
        console.error("[RESET_PASSWORD_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
