"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPayout = exports.isPaymentSuccessful = exports.verifyPayment = exports.createCheckoutSession = exports.createPaymentIntent = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_for_build_step", {
    apiVersion: "2026-02-25.clover",
});
const createPaymentIntent = async (amount, currency = "usd") => {
    return await exports.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
    });
};
exports.createPaymentIntent = createPaymentIntent;
const createCheckoutSession = async (params) => {
    const { giftId, amount, currency, giftDescription, successUrl, cancelUrl } = params;
    return await exports.stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: currency.toLowerCase(),
                    unit_amount: Math.round(amount * 100),
                    product_data: {
                        name: giftDescription || "Gift Payment",
                        description: `Gift ID: ${giftId}`,
                    },
                },
                quantity: 1,
            },
        ],
        metadata: { giftId },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });
};
exports.createCheckoutSession = createCheckoutSession;
const verifyPayment = async (paymentIntentId) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Stripe secret key is not configured");
    }
    if (!paymentIntentId) {
        throw new Error("Payment intent ID is required");
    }
    try {
        const paymentIntent = await exports.stripe.paymentIntents.retrieve(paymentIntentId);
        return {
            success: true,
            status: paymentIntent.status,
            reference: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            paidAt: paymentIntent.status === "succeeded"
                ? new Date(paymentIntent.created * 1000).toISOString()
                : null,
            metadata: paymentIntent.metadata,
        };
    }
    catch (error) {
        if (error instanceof stripe_1.default.errors.StripeError) {
            throw new Error(`Payment verification failed: ${error.message}`);
        }
        throw new Error("Payment verification failed: Unknown error");
    }
};
exports.verifyPayment = verifyPayment;
const isPaymentSuccessful = (status) => {
    return status === "succeeded";
};
exports.isPaymentSuccessful = isPaymentSuccessful;
const createPayout = async (params) => {
    const { amount, currency, destinationAccountId } = params;
    if (destinationAccountId) {
        return await exports.stripe.transfers.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            destination: destinationAccountId,
        });
    }
    return await exports.stripe.payouts.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
    });
};
exports.createPayout = createPayout;
