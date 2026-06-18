"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWebhookRetryWorker = startWebhookRetryWorker;
const db_1 = require("@/lib/db");
const drizzle_orm_1 = require("drizzle-orm");
const POLL_INTERVAL = 5000;
const BATCH_SIZE = 10;
const fetchQueueBatch = async () => {
    return db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT *
    FROM webhook_retry_queue
    WHERE next_attempt_at <= NOW()
    ORDER BY next_attempt_at ASC
    LIMIT ${BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  `);
};
async function processQueueItem(item) {
    try {
        await processWebhookEvent(item.event_type, item.payload);
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      DELETE FROM webhook_retry_queue WHERE id = ${item.id}
    `);
    }
    catch (error) {
        await scheduleRetry(item, error);
    }
}
async function processWebhookEvent(eventType, payload) {
    console.log(`Processing webhook event: ${eventType}`, payload);
    if (Math.random() < 0.5) {
        throw new Error("Simulated webhook processing error");
    }
}
async function scheduleRetry(item, error) {
    const retryCount = item.retry_count + 1;
    if (retryCount >= item.max_retries) {
        console.error("Max retries exceeded:", item.id);
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      DELETE FROM webhook_retry_queue WHERE id = ${item.id}
    `);
        return;
    }
    const backoff = Math.min(60_000, 2 ** retryCount * 1000);
    await db_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE webhook_retry_queue
    SET 
      retry_count = ${retryCount},
      next_attempt_at = NOW() + (${backoff} || ' milliseconds')::interval,
      last_error = ${error instanceof Error ? error.message : "Unknown error"},
      updated_at = NOW()
    WHERE id = ${item.id}
  `);
}
async function processWebhookQueue() {
    const result = await fetchQueueBatch();
    const items = result.rows ?? result;
    for (const item of items) {
        await processQueueItem(item);
    }
}
function startWebhookRetryWorker() {
    console.log("Starting Postgres webhook retry worker...");
    setInterval(async () => {
        try {
            await processWebhookQueue();
        }
        catch (err) {
            console.error("Retry worker error:", err);
        }
    }, POLL_INTERVAL);
}
