"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const paymentService_1 = require("@/server/services/paymentService");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request, { params }) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const { giftId } = await params;
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
        });
        if (!gift) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Gift not found");
        }
        if (!gift.senderId || gift.senderId !== userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "Forbidden");
        }
        const allowedStatuses = ["otp_verified", "pending_review"];
        if (!allowedStatuses.includes(gift.status)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, `Cannot initiate checkout for gift with status: ${gift.status}`);
        }
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            `${request.nextUrl.protocol}//${request.headers.get("host")}`;
        const { sessionId, url } = await (0, paymentService_1.initiateStripeCheckout)({
            giftId,
            amount: gift.amount,
            currency: gift.currency,
            baseUrl,
        });
        return server_1.NextResponse.json({ success: true, sessionId, url });
    }
    catch (error) {
        console.error("Stripe checkout error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, message);
    }
}
