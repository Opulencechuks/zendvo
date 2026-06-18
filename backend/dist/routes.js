"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const adapter_1 = require("./adapter");
const db_1 = require("./lib/db");
const schema_1 = require("./lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Auth
const route_1 = require("./api/auth/route");
const route_2 = require("./api/auth/forgot-password/route");
const route_3 = require("./api/auth/login/route");
const route_4 = require("./api/auth/logout/route");
const route_5 = require("./api/auth/me/route");
const route_6 = require("./api/auth/refresh/route");
const route_7 = require("./api/auth/register/route");
const route_8 = require("./api/auth/resend-otp/route");
const route_9 = require("./api/auth/resend-verification/route");
const route_10 = require("./api/auth/reset-password/route");
const route_11 = require("./api/auth/revoke/route");
const route_12 = require("./api/auth/send-otp/route");
const route_13 = require("./api/auth/send-phone-otp/route");
const route_14 = require("./api/auth/send-verification/route");
const route_15 = require("./api/auth/verify-email/route");
const route_16 = require("./api/auth/verify-otp/route");
// Dashboard
const route_17 = require("./api/dashboard/activity/route");
const route_18 = require("./api/dashboard/summary/route");
// Gifts
const route_19 = require("./api/gifts/route");
const route_20 = require("./api/gifts/bulk/route");
const route_21 = require("./api/gifts/public/route");
const route_22 = require("./api/gifts/public/[giftId]/claim/route");
const route_23 = require("./api/gifts/public/[giftId]/confirm/route");
const route_24 = require("./api/gifts/public/[giftId]/summary/route");
const route_25 = require("./api/gifts/verify-otp/route");
const route_26 = require("./api/gifts/[giftId]/route");
const route_27 = require("./api/gifts/[giftId]/checkout/route");
const route_28 = require("./api/gifts/[giftId]/confirm/route");
// Notifications
const route_29 = require("./api/notifications/mark-read/route");
// Transactions
const route_30 = require("./api/transactions/route");
// Users
const route_31 = require("./api/users/avatar/route");
const route_32 = require("./api/users/lookup/route");
const route_33 = require("./api/users/profile/route");
// Wallet
const route_34 = require("./api/wallet/balance/route");
const route_35 = require("./api/wallet/banks/route");
const route_36 = require("./api/wallet/withdraw/route");
// Webhooks
const route_37 = require("./api/webhooks/route");
const route_38 = require("./api/webhooks/paystack/route");
const route_39 = require("./api/webhooks/stripe/route");
exports.apiRouter = (0, express_1.Router)();
// 1. Authentication routes
exports.apiRouter.post("/api/auth", (0, adapter_1.makeExpressHandler)(route_1.POST));
exports.apiRouter.post("/api/auth/forgot-password", (0, adapter_1.makeExpressHandler)(route_2.POST));
exports.apiRouter.post("/api/auth/login", (0, adapter_1.makeExpressHandler)(route_3.POST));
exports.apiRouter.post("/api/auth/logout", (0, adapter_1.makeExpressHandler)(route_4.POST));
exports.apiRouter.get("/api/auth/me", (0, adapter_1.makeExpressHandler)(route_5.GET));
exports.apiRouter.post("/api/auth/refresh", (0, adapter_1.makeExpressHandler)(route_6.POST));
exports.apiRouter.post("/api/auth/register", (0, adapter_1.makeExpressHandler)(route_7.POST));
exports.apiRouter.post("/api/auth/resend-otp", (0, adapter_1.makeExpressHandler)(route_8.POST));
exports.apiRouter.post("/api/auth/resend-verification", (0, adapter_1.makeExpressHandler)(route_9.POST));
exports.apiRouter.post("/api/auth/reset-password", (0, adapter_1.makeExpressHandler)(route_10.POST));
exports.apiRouter.post("/api/auth/revoke", (0, adapter_1.makeExpressHandler)(route_11.POST));
exports.apiRouter.post("/api/auth/send-otp", (0, adapter_1.makeExpressHandler)(route_12.POST));
exports.apiRouter.post("/api/auth/send-phone-otp", (0, adapter_1.makeExpressHandler)(route_13.POST));
exports.apiRouter.post("/api/auth/send-verification", (0, adapter_1.makeExpressHandler)(route_14.POST));
exports.apiRouter.post("/api/auth/verify-email", (0, adapter_1.makeExpressHandler)(route_15.POST));
exports.apiRouter.post("/api/auth/verify-otp", (0, adapter_1.makeExpressHandler)(route_16.POST));
// 2. Dashboard routes
exports.apiRouter.get("/api/dashboard/activity", (0, adapter_1.makeExpressHandler)(route_17.GET));
exports.apiRouter.get("/api/dashboard/summary", (0, adapter_1.makeExpressHandler)(route_18.GET));
// 3. Gifts routes
exports.apiRouter.get("/api/gifts", (0, adapter_1.makeExpressHandler)(route_19.GET));
exports.apiRouter.post("/api/gifts", (0, adapter_1.makeExpressHandler)(route_19.POST));
exports.apiRouter.post("/api/gifts/bulk", (0, adapter_1.makeExpressHandler)(route_20.POST));
exports.apiRouter.post("/api/gifts/public", (0, adapter_1.makeExpressHandler)(route_21.POST));
exports.apiRouter.post("/api/gifts/public/:giftId/claim", (0, adapter_1.makeExpressHandler)(route_22.POST));
exports.apiRouter.post("/api/gifts/public/:giftId/confirm", (0, adapter_1.makeExpressHandler)(route_23.POST));
exports.apiRouter.get("/api/gifts/public/:giftId/summary", (0, adapter_1.makeExpressHandler)(route_24.GET));
exports.apiRouter.post("/api/gifts/verify-otp", (0, adapter_1.makeExpressHandler)(route_25.POST));
exports.apiRouter.get("/api/gifts/:giftId", (0, adapter_1.makeExpressHandler)(route_26.GET));
exports.apiRouter.post("/api/gifts/:giftId/checkout", (0, adapter_1.makeExpressHandler)(route_27.POST));
exports.apiRouter.post("/api/gifts/:giftId/confirm", (0, adapter_1.makeExpressHandler)(route_28.POST));
// 4. Notifications routes
exports.apiRouter.post("/api/notifications/mark-read", (0, adapter_1.makeExpressHandler)(route_29.POST));
// 5. Transactions routes
exports.apiRouter.get("/api/transactions", (0, adapter_1.makeExpressHandler)(route_30.GET));
// 6. Users routes
exports.apiRouter.post("/api/users/avatar", (0, adapter_1.makeExpressHandler)(route_31.POST));
exports.apiRouter.post("/api/users/lookup", (0, adapter_1.makeExpressHandler)(route_32.POST));
exports.apiRouter.put("/api/users/profile", (0, adapter_1.makeExpressHandler)(route_33.PUT));
// 7. Wallet routes
exports.apiRouter.get("/api/wallet/balance", (0, adapter_1.makeExpressHandler)(route_34.GET));
exports.apiRouter.get("/api/wallet/banks", (0, adapter_1.makeExpressHandler)(route_35.GET));
exports.apiRouter.post("/api/wallet/banks", (0, adapter_1.makeExpressHandler)(route_35.POST));
exports.apiRouter.post("/api/wallet/withdraw", (0, adapter_1.makeExpressHandler)(route_36.POST));
// 8. Webhooks routes
exports.apiRouter.post("/api/webhooks", (0, adapter_1.makeExpressHandler)(route_37.POST));
exports.apiRouter.post("/api/webhooks/paystack", (0, adapter_1.makeExpressHandler)(route_38.POST));
exports.apiRouter.post("/api/webhooks/stripe", (0, adapter_1.makeExpressHandler)(route_39.POST));
// 9. Custom Decoupled Slug Lookup route
exports.apiRouter.get("/api/gifts/public/slug/:slug", async (req, res) => {
    try {
        const { slug } = req.params;
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.shortCode, slug),
            columns: { id: true },
        });
        if (!gift) {
            return res.status(404).json({ success: false, error: "Gift not found" });
        }
        return res.status(200).json({ success: true, data: { id: gift.id } });
    }
    catch (error) {
        console.error("[SLUG_LOOKUP_ERROR]", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
});
