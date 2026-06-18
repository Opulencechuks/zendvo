"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const server_1 = require("next/server");
const api_utils_1 = require("@/lib/api-utils");
const REVIEWABLE_GIFT_STATUSES = new Set([
    "pending_otp",
    "otp_verified",
    "pending_review",
]);
async function GET(request, { params }) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const { giftId } = await params;
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
            with: {
                recipient: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!gift) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Gift not found");
        }
        if (gift.senderId !== userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "Forbidden");
        }
        if (!REVIEWABLE_GIFT_STATUSES.has(gift.status)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Gift not found");
        }
        return server_1.NextResponse.json({
            success: true,
            data: {
                id: gift.id,
                recipient: gift.recipient,
                amount: gift.amount,
                currency: gift.currency,
                message: gift.message,
                template: gift.template,
                status: gift.status,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching gift details:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
