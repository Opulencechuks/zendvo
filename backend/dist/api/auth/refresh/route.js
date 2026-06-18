"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const tokens_1 = require("@/lib/tokens");
const fingerprint_1 = require("@/lib/fingerprint");
const api_utils_1 = require("@/lib/api-utils");
const cookies_1 = require("@/lib/cookies");
async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        let refreshToken = body.refreshToken;
        if (!refreshToken) {
            refreshToken = request.cookies.get(cookies_1.REFRESH_TOKEN_COOKIE)?.value;
        }
        if (!refreshToken) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Refresh token is required");
        }
        const payload = await (0, tokens_1.verifyRefreshToken)(refreshToken);
        if (!payload) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Invalid refresh token");
        }
        const storedToken = await db_1.db.query.refreshTokens.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.refreshTokens.token, refreshToken),
        });
        if (!storedToken || storedToken.revokedAt) {
            await db_1.db
                .update(schema_1.refreshTokens)
                .set({ revokedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.userId, payload.userId));
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Refresh token has been used or is invalid");
        }
        if (new Date() > storedToken.expiresAt) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Token has expired");
        }
        if (storedToken.fingerprint) {
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                "127.0.0.1";
            const userAgent = request.headers.get("user-agent");
            const incomingFingerprint = await (0, fingerprint_1.computeFingerprint)(userAgent, ip);
            if (incomingFingerprint !== storedToken.fingerprint) {
                console.warn(`[REFRESH] Fingerprint mismatch for user ${payload.userId} — revoking all sessions`);
                await db_1.db
                    .update(schema_1.refreshTokens)
                    .set({ revokedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.userId, payload.userId));
                return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized: session fingerprint mismatch");
            }
        }
        const fingerprint = storedToken.fingerprint ?? undefined;
        const newPayload = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            fingerprint,
        };
        const newAccessToken = await (0, tokens_1.generateAccessToken)(newPayload);
        const newRefreshToken = await (0, tokens_1.generateRefreshToken)(newPayload);
        await db_1.db.transaction(async (tx) => {
            await tx
                .update(schema_1.refreshTokens)
                .set({ revokedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.id, storedToken.id));
            await tx.insert(schema_1.refreshTokens).values({
                id: crypto.randomUUID(),
                userId: payload.userId,
                token: newRefreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                deviceInfo: storedToken.deviceInfo,
                fingerprint,
            });
        });
        const response = server_1.NextResponse.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        }, { status: 200 });
        response.cookies.set(cookies_1.ACCESS_TOKEN_COOKIE, newAccessToken, {
            ...cookies_1.COOKIE_OPTIONS,
            maxAge: cookies_1.ACCESS_TOKEN_MAX_AGE,
        });
        response.cookies.set(cookies_1.REFRESH_TOKEN_COOKIE, newRefreshToken, {
            ...cookies_1.COOKIE_OPTIONS,
            maxAge: cookies_1.REFRESH_TOKEN_MAX_AGE,
        });
        return response;
    }
    catch (error) {
        console.error("[REFRESH_TOKEN_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
