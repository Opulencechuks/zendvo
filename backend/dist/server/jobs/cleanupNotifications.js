"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldNotifications = cleanupOldNotifications;
exports.startNotificationCleanupJob = startNotificationCleanupJob;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
async function cleanupOldNotifications() {
    const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);
    const result = await db_1.db
        .delete(schema_1.notifications)
        .where((0, drizzle_orm_1.lt)(schema_1.notifications.createdAt, ninetyDaysAgo))
        .returning();
    console.log(`[NOTIFICATION_CLEANUP_JOB] Deleted ${result.length} notification records older than 90 days.`);
    return result.length;
}
function startNotificationCleanupJob() {
    console.log("[NOTIFICATION_CLEANUP_JOB] Starting notification cleanup job...");
    const run = async () => {
        try {
            await cleanupOldNotifications();
        }
        catch (error) {
            console.error("[NOTIFICATION_CLEANUP_JOB_ERROR]", error);
        }
    };
    run();
    setInterval(run, CLEANUP_INTERVAL_MS);
}
if (typeof require !== "undefined" && require.main === module) {
    cleanupOldNotifications()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
