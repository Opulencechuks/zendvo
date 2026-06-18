"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const drizzle_1 = require("@/server/db/drizzle");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const api_utils_1 = require("@/lib/api-utils");
async function GET(request) {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
    }
    try {
        const [sentResult, receivedResult] = await Promise.all([
            drizzle_1.db
                .select({
                totalSent: (0, drizzle_orm_1.sql) `coalesce(count(*), 0)`,
            })
                .from(schema_1.gifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gifts.senderId, userId), (0, drizzle_orm_1.ne)(schema_1.gifts.status, "failed"))),
            drizzle_1.db
                .select({
                totalReceived: (0, drizzle_orm_1.sql) `coalesce(count(*), 0)`,
            })
                .from(schema_1.gifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gifts.recipientId, userId), (0, drizzle_orm_1.ne)(schema_1.gifts.status, "failed"))),
        ]);
        return server_1.NextResponse.json({
            success: true,
            data: {
                totalSent: sentResult[0]?.totalSent ?? 0,
                totalReceived: receivedResult[0]?.totalReceived ?? 0,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error("Dashboard summary error:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
