"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyGiftCompleted = notifyGiftCompleted;
exports.notifyGiftConfirmed = notifyGiftConfirmed;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const pushNotificationService_1 = require("./pushNotificationService");
async function createNotification(params) {
    const { userId, type, title, message, metadata, priority } = params;
    if (priority === "high") {
        (0, pushNotificationService_1.sendPushNotification)(userId, title, message, metadata).catch((error) => {
            console.error("Failed to send push notification:", error);
        });
    }
    return db_1.db
        .insert(schema_1.notifications)
        .values({
        userId,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
    })
        .returning();
}
async function notifyGiftCompleted(senderId, recipientId, amount, currency, transactionId) {
    const senderNotification = createNotification({
        userId: senderId,
        type: "gift_sent",
        title: "Gift Sent Successfully",
        message: `Your gift of ${amount} ${currency} has been sent successfully.`,
        metadata: { transactionId, amount, currency, recipientId },
    });
    const recipientNotification = createNotification({
        userId: recipientId,
        type: "gift_received",
        title: "You Received a Gift!",
        message: `You've received a gift of ${amount} ${currency}!`,
        metadata: { transactionId, amount, currency, senderId },
        priority: "high",
    });
    return Promise.all([senderNotification, recipientNotification]);
}
async function notifyGiftConfirmed(senderId, recipientId, amount, currency, shareLink, unlocksAt) {
    const notificationsList = [];
    if (senderId) {
        notificationsList.push(createNotification({
            userId: senderId,
            type: "gift_confirmed",
            title: "Gift Confirmed and Ready to Share",
            message: `Your gift of ${amount} ${currency} has been confirmed. Share it with others!`,
            metadata: { shareLink, amount, currency, recipientId },
        }));
    }
    const unlockText = unlocksAt
        ? `Unlocks on ${new Date(unlocksAt).toLocaleDateString()}`
        : "Available now";
    notificationsList.push(createNotification({
        userId: recipientId,
        type: "gift_waiting",
        title: "A Gift is Waiting for You",
        message: `You've received a gift of ${amount} ${currency}. ${unlockText}`,
        metadata: {
            shareLink,
            amount,
            currency,
            unlocksAt: unlocksAt?.toISOString(),
        },
        priority: "high",
    }));
    return Promise.all(notificationsList);
}
