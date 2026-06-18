"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
    }
    let body;
    try {
        body = await request.json();
    }
    catch {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid JSON body");
    }
    const { notificationIds } = body;
    if (!Array.isArray(notificationIds) ||
        notificationIds.length === 0 ||
        !notificationIds.every((id) => typeof id === "string" && id.length > 0)) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "notificationIds must be a non-empty array of notification ID strings");
    }
    try {
        const owned = await db_1.db
            .select({ id: schema_1.notifications.id })
            .from(schema_1.notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.notifications.id, notificationIds), (0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId)));
        const ownedIds = new Set(owned.map((n) => n.id));
        const unauthorizedIds = notificationIds.filter((id) => !ownedIds.has(id));
        if (unauthorizedIds.length > 0) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "One or more notification IDs are invalid or do not belong to you", undefined, { invalidIds: unauthorizedIds });
        }
        const updated = await db_1.db
            .update(schema_1.notifications)
            .set({ read: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.notifications.id, notificationIds), (0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId)))
            .returning({ id: schema_1.notifications.id });
        return server_1.NextResponse.json({
            success: true,
            data: {
                markedRead: updated.length,
                ids: updated.map((row) => row.id),
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error("Mark notifications read error:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
