"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredTokens = cleanupExpiredTokens;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const isPostgresBusy_1 = require("@/lib/isPostgresBusy");
const webhookRetryService_1 = require("../services/webhookRetryService");
async function cleanupExpiredTokens() {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await db_1.db
            .delete(schema_1.passwordResets)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.lt)(schema_1.passwordResets.expiresAt, new Date()), (0, drizzle_orm_1.lt)(schema_1.passwordResets.createdAt, twentyFourHoursAgo), (0, drizzle_orm_1.isNotNull)(schema_1.passwordResets.usedAt)))
            .returning();
        console.log(`[CLEANUP_JOB] Deleted ${result.length} expired/used password reset tokens.`);
        return result.length;
    }
    catch (error) {
        if ((0, isPostgresBusy_1.isPostgresBusyError)(error)) {
            console.warn("Postgres busy — queueing webhook");
            console.error("[CLEANUP_JOB_ERROR]", error);
            await (0, webhookRetryService_1.enqueueWebhookRetry)({
                eventType: "EXPIRED_PASSWORD_RESET",
                payload: {},
                delayMs: 5 * 60 * 1000,
            });
        }
    }
}
if (typeof require !== "undefined" && require.main === module) {
    cleanupExpiredTokens()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
