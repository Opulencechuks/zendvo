"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const api_utils_1 = require("@/lib/api-utils");
const cookies_1 = require("@/lib/cookies");
async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        let refreshToken = body.refreshToken;
        if (!refreshToken) {
            refreshToken = request.cookies.get(cookies_1.REFRESH_TOKEN_COOKIE)?.value;
        }
        if (refreshToken) {
            try {
                await db_1.db
                    .delete(schema_1.refreshTokens)
                    .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.token, refreshToken));
            }
            catch (e) { }
        }
        const response = server_1.NextResponse.json({ success: true, message: "Logged out successfully" }, { status: 200 });
        response.cookies.set(cookies_1.ACCESS_TOKEN_COOKIE, "", {
            ...cookies_1.COOKIE_OPTIONS,
            maxAge: 0,
        });
        response.cookies.set(cookies_1.REFRESH_TOKEN_COOKIE, "", {
            ...cookies_1.COOKIE_OPTIONS,
            maxAge: 0,
        });
        return response;
    }
    catch (error) {
        console.error("[LOGOUT_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
