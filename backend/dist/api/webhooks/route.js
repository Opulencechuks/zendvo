"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const client_1 = require("@/lib/stripe/client");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !webhookSecret) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Missing stripe signature or webhook secret");
    }
    let event;
    try {
        event = client_1.stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }
    catch (err) {
        const message = err instanceof Error
            ? err.message
            : "Webhook signature verification failed";
        console.error("Webhook error:", message);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, message);
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const giftId = session.metadata?.giftId;
        if (!giftId) {
            console.error("Webhook: checkout.session.completed missing giftId metadata");
            return server_1.NextResponse.json({ received: true });
        }
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
        });
        if (!gift) {
            console.error(`Webhook: gift ${giftId} not found`);
            return server_1.NextResponse.json({ received: true });
        }
        const advanceable = ["otp_verified", "pending_review"];
        if (advanceable.includes(gift.status)) {
            await db_1.db
                .update(schema_1.gifts)
                .set({
                paymentVerifiedAt: new Date(),
                status: "pending_review",
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId));
        }
    }
    return server_1.NextResponse.json({ received: true });
}
