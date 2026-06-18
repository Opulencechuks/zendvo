"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const api_utils_1 = require("@/lib/api-utils");
async function GET(request) {
    try {
        const userId = request.headers.get("x-user-id");
        if (!userId) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const { searchParams } = request.nextUrl;
        const currencyParam = searchParams.get("currency")?.toUpperCase();
        const walletConditions = [(0, drizzle_orm_1.eq)(schema_1.wallets.userId, userId)];
        if (currencyParam) {
            walletConditions.push((0, drizzle_orm_1.eq)(schema_1.wallets.currency, currencyParam));
        }
        const userWallets = await db_1.db.query.wallets.findMany({
            where: (0, drizzle_orm_1.and)(...walletConditions),
        });
        if (userWallets.length === 0) {
            return server_1.NextResponse.json({ success: true, data: { wallets: [] } });
        }
        const [pendingRows, lockedRows] = await Promise.all([
            db_1.db
                .select({
                currency: schema_1.gifts.currency,
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.gifts.amount}), 0)`,
            })
                .from(schema_1.gifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gifts.senderId, userId), (0, drizzle_orm_1.eq)(schema_1.gifts.status, "confirmed")))
                .groupBy(schema_1.gifts.currency),
            db_1.db
                .select({
                currency: schema_1.gifts.currency,
                total: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.gifts.amount}), 0)`,
            })
                .from(schema_1.gifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.gifts.recipientId, userId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.gifts.status, "completed"), (0, drizzle_orm_1.eq)(schema_1.gifts.status, "sent")), (0, drizzle_orm_1.sql) `${schema_1.gifts.unlockDatetime} IS NOT NULL AND ${schema_1.gifts.unlockDatetime} > NOW()`))
                .groupBy(schema_1.gifts.currency),
        ]);
        const pendingByCurrency = {};
        for (const row of pendingRows) {
            pendingByCurrency[row.currency] = row.total;
        }
        const lockedByCurrency = {};
        for (const row of lockedRows) {
            lockedByCurrency[row.currency] = row.total;
        }
        const walletData = userWallets.map((w) => {
            const pending = pendingByCurrency[w.currency] ?? 0;
            const locked = lockedByCurrency[w.currency] ?? 0;
            const available = Math.max(0, w.balance - pending - locked);
            return {
                id: w.id,
                currency: w.currency,
                balance: w.balance,
                availableBalance: available,
                pendingWithdrawals: pending,
                lockedBalance: locked,
            };
        });
        return server_1.NextResponse.json({ success: true, data: { wallets: walletData } });
    }
    catch (error) {
        console.error("Error fetching wallet balance:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
