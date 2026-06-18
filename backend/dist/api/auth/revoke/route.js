"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const api_utils_1 = require("@/lib/api-utils");
const cookies_1 = require("@/lib/cookies");
const ADMIN_ROLES = new Set(["admin", "superadmin"]);
async function POST(request) {
    try {
        const requesterId = request.headers.get("x-user-id");
        const requesterRole = request.headers.get("x-user-role") ?? "";
        if (!requesterId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const body = await request.json().catch(() => ({}));
        const rawTargetUserId = body.userId;
        const targetUserId = typeof rawTargetUserId === "string" && rawTargetUserId.trim().length > 0
            ? rawTargetUserId.trim()
            : requesterId;
        const isSelfTarget = targetUserId === requesterId;
        const isAdmin = ADMIN_ROLES.has(requesterRole.toLowerCase());
        if (!isSelfTarget && !isAdmin) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "Forbidden: insufficient permissions to revoke this user");
        }
        const revokedAt = new Date();
        await db_1.db
            .update(schema_1.refreshTokens)
            .set({ revokedAt })
            .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.userId, targetUserId));
        const response = server_1.NextResponse.json({
            success: true,
            message: "Refresh tokens revoked successfully",
            data: { userId: targetUserId, revokedAt: revokedAt.toISOString() },
        }, { status: 200 });
        if (isSelfTarget) {
            response.cookies.set(cookies_1.ACCESS_TOKEN_COOKIE, "", {
                ...cookies_1.COOKIE_OPTIONS,
                maxAge: 0,
            });
            response.cookies.set(cookies_1.REFRESH_TOKEN_COOKIE, "", {
                ...cookies_1.COOKIE_OPTIONS,
                maxAge: 0,
            });
        }
        return response;
    }
    catch (error) {
        console.error("[REVOKE_REFRESH_TOKENS_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
