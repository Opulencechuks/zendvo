"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addBankAccountSchema = void 0;
const zod_1 = require("zod");
exports.addBankAccountSchema = zod_1.z.object({
    country: zod_1.z.string().min(2, "Country is required"),
    currency: zod_1.z.string().length(3, "Currency must be a 3-letter code"),
    swiftBic: zod_1.z
        .string()
        .min(8, "SWIFT/BIC must be at least 8 characters")
        .max(11, "SWIFT/BIC must be at most 11 characters"),
    accountNumber: zod_1.z.string().min(5, "Account number is required"),
});
