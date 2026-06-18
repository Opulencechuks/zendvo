"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const crypto_1 = __importDefault(require("crypto"));
const server_1 = require("next/server");
const giftStatusService_1 = require("@/server/services/giftStatusService");
const api_utils_1 = require("@/lib/api-utils");
async function POST(req) {
    try {
        const signature = req.headers.get("x-paystack-signature");
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const rawBody = await req.text();
        if (!secret || !signature) {
            console.warn("[PAYSTACK_WEBHOOK] Invalid signature context");
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Invalid signature");
        }
        const hash = crypto_1.default
            .createHmac("sha512", secret)
            .update(rawBody)
            .digest("hex");
        if (hash.length !== signature.length) {
            console.warn("[PAYSTACK_WEBHOOK] Invalid signature length");
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Invalid signature");
        }
        const computed = Buffer.from(hash, "hex");
        const received = Buffer.from(signature, "hex");
        if (computed.length !== received.length ||
            !crypto_1.default.timingSafeEqual(computed, received)) {
            console.warn("[PAYSTACK_WEBHOOK] Invalid signature detected");
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Invalid signature");
        }
        const event = JSON.parse(rawBody);
        console.log(`[PAYSTACK_WEBHOOK] Received event: ${event.event}`);
        if (event?.event !== "charge.success") {
            return server_1.NextResponse.json({ received: true }, { status: 200 });
        }
        const reference = event?.data?.reference;
        if (!reference || typeof reference !== "string") {
            console.warn("[PAYSTACK_WEBHOOK] charge.success missing reference");
            return server_1.NextResponse.json({ received: true }, { status: 200 });
        }
        const result = await (0, giftStatusService_1.markGiftPaymentSuccessfulByReference)(reference, "paystack");
        if (!result.success) {
            console.warn(`[PAYSTACK_WEBHOOK] Unable to process reference ${reference}: ${result.message}`);
        }
        return server_1.NextResponse.json({ received: true }, { status: 200 });
    }
    catch (error) {
        console.error("[PAYSTACK_WEBHOOK_ERROR]", error);
        return server_1.NextResponse.json({ received: true }, { status: 200 });
    }
}
