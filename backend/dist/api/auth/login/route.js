"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const drizzle_orm_1 = require("drizzle-orm");
const server_1 = require("next/server");
const auth_1 = require("@/lib/auth");
const cookies_1 = require("@/lib/cookies");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const tokens_1 = require("@/lib/tokens");
const validation_1 = require("@/lib/validation");
const otpService_1 = require("@/server/services/otpService");
const fingerprint_1 = require("@/lib/fingerprint");
const api_utils_1 = require("@/lib/api-utils");
const FAILED_ATTEMPT_LIMIT = 5;
const FAILED_ATTEMPT_WINDOW_MS = 60 * 1000;
const failedAttemptsByIp = new Map();
const getDeviceId = (request, bodyDeviceId) => {
    if (bodyDeviceId) {
        return bodyDeviceId;
    }
    const userAgent = request.headers.get("user-agent");
    if (!userAgent) {
        return null;
    }
    const deviceHash = btoa(userAgent)
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 32);
    return deviceHash;
};
const getClientIp = (request) => {
    return (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1");
};
const isIpRateLimited = (ip) => {
    const now = Date.now();
    const attemptState = failedAttemptsByIp.get(ip);
    if (!attemptState) {
        return false;
    }
    if (now - attemptState.windowStartMs >= FAILED_ATTEMPT_WINDOW_MS) {
        failedAttemptsByIp.delete(ip);
        return false;
    }
    return attemptState.count >= FAILED_ATTEMPT_LIMIT;
};
const registerFailedAttempt = (ip) => {
    const now = Date.now();
    const attemptState = failedAttemptsByIp.get(ip);
    if (!attemptState ||
        now - attemptState.windowStartMs >= FAILED_ATTEMPT_WINDOW_MS) {
        failedAttemptsByIp.set(ip, { count: 1, windowStartMs: now });
        return;
    }
    failedAttemptsByIp.set(ip, {
        count: attemptState.count + 1,
        windowStartMs: attemptState.windowStartMs,
    });
};
const clearFailedAttempts = (ip) => {
    failedAttemptsByIp.delete(ip);
};
async function POST(request) {
    try {
        const ip = getClientIp(request);
        if (isIpRateLimited(ip)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many failed login attempts. Please try again in 1 minute.");
        }
        const body = await request.json();
        const { email, password, device_id } = body;
        if (!email || !password) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Email and password are required");
        }
        const sanitizedEmail = (0, validation_1.sanitizeInput)(String(email)).toLowerCase();
        if (!(0, validation_1.validateEmail)(sanitizedEmail)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid email format");
        }
        const userRows = await db_1.db
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            passwordHash: schema_1.users.passwordHash,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, sanitizedEmail))
            .limit(1);
        const user = userRows[0];
        if (!user) {
            registerFailedAttempt(ip);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Invalid email or password");
        }
        const isPasswordValid = await (0, auth_1.comparePassword)(String(password), user.passwordHash);
        if (!isPasswordValid) {
            registerFailedAttempt(ip);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Invalid email or password");
        }
        clearFailedAttempts(ip);
        const userAgent = request.headers.get("user-agent");
        const fingerprint = await (0, fingerprint_1.computeFingerprint)(userAgent, ip);
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            fingerprint,
        };
        const accessToken = await (0, tokens_1.generateAccessToken)(payload);
        const refreshToken = await (0, tokens_1.generateRefreshToken)(payload);
        await db_1.db.transaction(async (tx) => {
            await tx
                .update(schema_1.users)
                .set({
                lastLogin: new Date(),
                loginAttempts: 0,
                lockUntil: null,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
            await tx.insert(schema_1.refreshTokens).values({
                id: crypto.randomUUID(),
                userId: user.id,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                deviceInfo: userAgent,
                deviceId: getDeviceId(request, device_id),
                fingerprint,
            });
        });
        (0, otpService_1.cleanupExpiredOTPs)().catch((error) => {
            console.error("[OTP_CLEANUP_ERROR]", error);
        });
        const response = server_1.NextResponse.json({
            access_token: accessToken,
            refresh_token: refreshToken,
        }, { status: 200 });
        response.cookies.set(cookies_1.ACCESS_TOKEN_COOKIE, accessToken, {
            ...cookies_1.COOKIE_OPTIONS,
            maxAge: cookies_1.ACCESS_TOKEN_MAX_AGE,
        });
        response.cookies.set(cookies_1.REFRESH_TOKEN_COOKIE, refreshToken, {
            ...cookies_1.COOKIE_OPTIONS,
            maxAge: cookies_1.REFRESH_TOKEN_MAX_AGE,
        });
        return response;
    }
    catch (error) {
        console.error("[LOGIN_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
