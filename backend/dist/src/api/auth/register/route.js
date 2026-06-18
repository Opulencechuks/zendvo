"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const validation_1 = require("@/lib/validation");
const rate_limiter_1 = require("@/lib/rate-limiter");
const authRepository_1 = require("@/server/db/authRepository");
const otpService_1 = require("@/server/services/otpService");
const emailService_1 = require("@/server/services/emailService");
const api_utils_1 = require("@/lib/api-utils");
const BCRYPT_COST = 12;
async function POST(request) {
    try {
        const contentType = request.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid Content-Type. Expected application/json");
        }
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > 10240) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Payload Too Large", 413, "Request body too large");
        }
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin && host && !origin.includes(host)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "CSRF protection: Invalid origin");
        }
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
        if ((0, rate_limiter_1.isRateLimited)(ip)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many registration attempts. Please try again later.");
        }
        const body = await request.json();
        const { email, password, name, phoneNumber } = body;
        if (!email || !password) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Email and password are required");
        }
        const sanitizedEmail = (0, validation_1.sanitizeInput)(email);
        let sanitizedPhoneNumber = null;
        if (phoneNumber) {
            if (!(0, validation_1.validateE164PhoneNumber)(phoneNumber)) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid phone number format. Please use E.164 format (e.g., +2348123456789)");
            }
            sanitizedPhoneNumber = (0, validation_1.sanitizePhoneNumber)(phoneNumber);
        }
        if (!(0, validation_1.validateEmail)(sanitizedEmail)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid email format");
        }
        if (!(0, validation_1.validatePassword)(password)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Password too weak");
        }
        const existingUser = await (0, authRepository_1.findUserByEmail)(sanitizedEmail);
        if (existingUser) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Email already registered");
        }
        if (sanitizedPhoneNumber) {
            const existingUserByPhone = await (0, authRepository_1.findUserByPhoneNumber)(sanitizedPhoneNumber);
            if (existingUserByPhone) {
                return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Phone number already registered");
            }
        }
        const passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_COST);
        try {
            const user = await (0, authRepository_1.createUser)({
                email: sanitizedEmail,
                passwordHash,
                name: name ? (0, validation_1.sanitizeInput)(name) : null,
                phoneNumber: sanitizedPhoneNumber,
            });
            const otp = (0, otpService_1.generateOTP)();
            await (0, otpService_1.storeOTP)(user.id, otp);
            const emailResult = await (0, emailService_1.sendVerificationEmail)(user.email, otp, user.name ?? undefined);
            if (!emailResult.success) {
                console.error("[REGISTER_VERIFICATION_EMAIL_ERROR]", emailResult.error);
            }
            return server_1.NextResponse.json({
                success: true,
                message: "User registered successfully",
                data: {
                    userId: user.id,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    verificationInitiated: true,
                },
            }, { status: 201 });
        }
        catch (error) {
            const typedError = error;
            if (typedError.code === "23505") {
                console.error("[UNIQUE_VIOLATION]", error);
                if (typedError.detail?.includes("email")) {
                    return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Email already registered");
                }
                else if (typedError.detail?.includes("phone_number")) {
                    return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Phone number already registered");
                }
                else if (typedError.detail?.includes("username")) {
                    return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Username already taken");
                }
                return (0, api_utils_1.createProblemDetails)("about:blank", "Conflict", 409, "Account already exists with provided information");
            }
            throw error;
        }
    }
    catch (error) {
        console.error("[REGISTER_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
