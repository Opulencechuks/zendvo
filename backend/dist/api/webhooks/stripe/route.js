"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const client_1 = require("@/lib/stripe/client");
const api_utils_1 = require("@/lib/api-utils");
async function POST(req) {
    try {
        const signature = req.headers.get("stripe-signature");
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
            return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Webhook secret not configured");
        }
        if (!signature) {
            console.warn("[STRIPE_WEBHOOK] Missing stripe-signature header");
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Missing signature");
        }
        const rawBody = await req.text();
        let event;
        try {
            event = client_1.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            console.warn("[STRIPE_WEBHOOK] Signature verification failed:", err);
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Invalid signature");
        }
        console.log(`[STRIPE_WEBHOOK] Received event: ${event.type}`);
        console.log(`[STRIPE_WEBHOOK] Handling event type: ${event.type}`);
        let result;
        if (event.type === "checkout.session.completed" ||
            event.type === "payment_intent.succeeded") {
            const sessionOrIntent = event.data.object;
            const giftId = sessionOrIntent.metadata?.giftId;
            const paymentIntentId = event.type === "payment_intent.succeeded"
                ? sessionOrIntent.id
                : sessionOrIntent.payment_intent;
            console.log(`[STRIPE_WEBHOOK] Processing successful payment for gift: ${giftId}, reference: ${paymentIntentId}`);
            if (giftId) {
                const { markGiftPaymentSuccessfulByReference } = await Promise.resolve().then(() => __importStar(require("@/server/services/giftStatusService")));
                result = await markGiftPaymentSuccessfulByReference(paymentIntentId || giftId, "stripe");
                if (!result.success && !paymentIntentId) {
                }
            }
            else {
                console.warn("[STRIPE_WEBHOOK] No giftId found in metadata");
            }
        }
        return server_1.NextResponse.json({ received: true, processed: result?.success ?? false }, { status: 200 });
    }
    catch (error) {
        console.error("[STRIPE_WEBHOOK_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
