"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueWebhookRetry = enqueueWebhookRetry;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
async function enqueueWebhookRetry(params) {
    const now = new Date();
    await db_1.db.insert(schema_1.webhookRetryQueue).values({
        eventType: params.eventType,
        payload: params.payload,
        retryCount: 0,
        maxRetries: 5,
        nextAttemptAt: new Date(now.getTime() + (params.delayMs ?? 5000)),
    });
}
