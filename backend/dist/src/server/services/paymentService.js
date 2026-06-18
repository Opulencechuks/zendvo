"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateStripeCheckout = initiateStripeCheckout;
const client_1 = require("@/lib/stripe/client");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function initiateStripeCheckout(params) {
    const { giftId, amount, currency, baseUrl } = params;
    const supportedCurrencies = ["usd", "eur", "gbp", "cad", "aud", "jpy", "sgd", "nzd"];
    const normalizedCurrency = currency.toLowerCase();
    if (!supportedCurrencies.includes(normalizedCurrency)) {
        throw new Error(`Currency ${currency.toUpperCase()} is not supported for Stripe Checkout. Supported: ${supportedCurrencies.map((c) => c.toUpperCase()).join(", ")}`);
    }
    const sessionParams = {
        giftId,
        amount,
        currency: normalizedCurrency,
        giftDescription: "Zendvo Gift",
        successUrl: `${baseUrl}/gift/${giftId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/gift/${giftId}?payment=cancelled`,
    };
    const session = await (0, client_1.createCheckoutSession)(sessionParams);
    if (!session.url) {
        throw new Error("Stripe did not return a checkout URL");
    }
    await db_1.db
        .update(schema_1.gifts)
        .set({
        paymentReference: session.id,
        paymentProvider: "stripe",
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId));
    return { sessionId: session.id, url: session.url };
}
