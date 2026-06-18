"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredOTPRecords = cleanupExpiredOTPRecords;
const otpService_1 = require("../services/otpService");
async function cleanupExpiredOTPRecords() {
    try {
        const deletedCount = await (0, otpService_1.cleanupExpiredOTPs)();
        console.log(`[CLEANUP_JOB] Deleted ${deletedCount} expired OTP records.`);
        return deletedCount;
    }
    catch (error) {
        console.error("[CLEANUP_JOB_ERROR]", error);
        throw error;
    }
}
if (typeof require !== "undefined" && require.main === module) {
    cleanupExpiredOTPRecords()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
