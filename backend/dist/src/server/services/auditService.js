"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventType = void 0;
exports.logAuditEvent = logAuditEvent;
exports.logOTPEvent = logOTPEvent;
exports.logGiftOTPEvent = logGiftOTPEvent;
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["OTP_GENERATED"] = "OTP_GENERATED";
    AuditEventType["OTP_VERIFIED_SUCCESS"] = "OTP_VERIFIED_SUCCESS";
    AuditEventType["OTP_VERIFIED_FAILED"] = "OTP_VERIFIED_FAILED";
    AuditEventType["ACCOUNT_LOCKED_5_ATTEMPTS"] = "ACCOUNT_LOCKED_5_ATTEMPTS";
    AuditEventType["ACCOUNT_LOCKED_10_ATTEMPTS"] = "ACCOUNT_LOCKED_10_ATTEMPTS";
    AuditEventType["ACCOUNT_UNLOCKED"] = "ACCOUNT_UNLOCKED";
    AuditEventType["GIFT_OTP_FAILED"] = "GIFT_OTP_FAILED";
    AuditEventType["GIFT_OTP_LOCKED"] = "GIFT_OTP_LOCKED";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
function logAuditEvent(entry) {
    const logEntry = {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
    };
    console.log("[SECURITY_AUDIT]", JSON.stringify(logEntry));
}
function logOTPEvent(eventType, userId, metadata) {
    logAuditEvent({
        timestamp: new Date(),
        eventType,
        userId,
        metadata,
        message: `OTP event: ${eventType} for user ${userId}`,
    });
}
function logGiftOTPEvent(eventType, giftId, metadata) {
    logAuditEvent({
        timestamp: new Date(),
        eventType,
        giftId,
        metadata,
        message: `Gift OTP event: ${eventType} for gift ${giftId}`,
    });
}
