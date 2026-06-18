"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_session_1 = require("@/lib/auth-session");
const api_utils_1 = require("@/lib/api-utils");
async function GET(request) {
    try {
        const payload = await (0, auth_session_1.getAuthPayload)(request);
        if (!payload) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, payload.userId),
            columns: {
                id: true,
                email: true,
                name: true,
                phoneNumber: true,
                role: true,
                status: true,
                createdAt: true,
                lastLogin: true,
            },
        });
        if (!user) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "User not found");
        }
        const responseUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            email_verified: user.status === "active",
            phone_last_4: user.phoneNumber?.slice(-4) ?? null,
        };
        return server_1.NextResponse.json({
            success: true,
            user: responseUser,
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error in auth/me:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
