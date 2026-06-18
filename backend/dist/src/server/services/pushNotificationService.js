"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
async function sendPushNotification(userId, title, body, metadata) {
    if (process.env.NODE_ENV === "development") {
        console.log("\n" + "=".repeat(50));
        console.log("📱 PUSH NOTIFICATION DISPATCHED (Development Mode)");
        console.log("=".repeat(50));
        console.log(`To User ID: ${userId}`);
        console.log(`Title:      ${title}`);
        console.log(`Body:       ${body}`);
        if (metadata) {
            console.log(`Metadata:   ${JSON.stringify(metadata, null, 2)}`);
        }
        console.log("=".repeat(50) + "\n");
        return {
            success: true,
            message: "Push Payload dispatched (Stub)",
            provider: "stub",
        };
    }
    return {
        success: true,
        message: "Push notification logic skipped (Stub)",
        provider: "stub",
    };
}
