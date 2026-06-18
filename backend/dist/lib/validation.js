"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateGiftSchema = exports.validateMessage = exports.validateE164PhoneNumber = exports.sanitizePhoneNumber = exports.validatePhoneNumber = exports.normalizePhoneNumber = exports.formatAsUTCISO = exports.convertToUTCDate = exports.validateUnlockAt = exports.validateFutureDatetime = exports.CurrencySchema = exports.validateCurrency = exports.validateAmount = exports.sanitizeInput = exports.validatePassword = exports.validateEmail = void 0;
const zod_1 = require("zod");
const currency_1 = require("@/lib/currency");
const validateEmail = (email) => {
    const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.validatePassword = validatePassword;
const sanitizeInput = (input) => {
    return input.trim();
};
exports.sanitizeInput = sanitizeInput;
const validateAmount = (amount) => {
    return amount > 0 && amount <= 10000;
};
exports.validateAmount = validateAmount;
const validateCurrency = (currency) => {
    return currency_1.supportedCurrencyCodes.includes(currency.toUpperCase());
};
exports.validateCurrency = validateCurrency;
exports.CurrencySchema = zod_1.z
    .string()
    .refine(exports.validateCurrency, {
    message: `Unsupported currency. Accepted: ${currency_1.supportedCurrencyCodes.join(", ")}`,
})
    .transform((value) => value.toUpperCase());
const validateFutureDatetime = (date) => {
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
};
exports.validateFutureDatetime = validateFutureDatetime;
const validateUnlockAt = (unlockAt) => {
    if (typeof unlockAt !== 'string' && !(unlockAt instanceof Date)) {
        return {
            valid: false,
            error: "unlock_at must be an ISO 8601 string or Date object",
            detail: "unlock_at must be an ISO 8601 string or Date object",
        };
    }
    if (typeof unlockAt === 'string') {
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$/;
        if (!iso8601Regex.test(unlockAt)) {
            return {
                valid: false,
                error: "unlock_at must be a valid ISO 8601 date string with timezone and milliseconds (e.g., 2026-03-30T14:00:00.000Z or 2026-03-30T14:00:00.000+01:00)",
                detail: "unlock_at must be a valid ISO 8601 date string with timezone and milliseconds (e.g., 2026-03-30T14:00:00.000Z or 2026-03-30T14:00:00.000+01:00)",
            };
        }
    }
    const unlockDate = new Date(unlockAt);
    if (isNaN(unlockDate.getTime())) {
        return {
            valid: false,
            error: "Invalid date format for unlock_at",
            detail: "Invalid date format for unlock_at",
        };
    }
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    if (unlockDate.getTime() < oneHourFromNow) {
        return {
            valid: false,
            error: "unlock_at must be at least 1 hour in the future",
            detail: "unlock_at must be at least 1 hour in the future",
        };
    }
    return { valid: true };
};
exports.validateUnlockAt = validateUnlockAt;
const convertToUTCDate = (unlockAt) => {
    if (!unlockAt) {
        return null;
    }
    const validation = (0, exports.validateUnlockAt)(unlockAt);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    const date = new Date(unlockAt);
    if (isNaN(date.getTime())) {
        throw new Error("Invalid date format for unlock_at");
    }
    return date;
};
exports.convertToUTCDate = convertToUTCDate;
const formatAsUTCISO = (date) => {
    if (!date || isNaN(date.getTime())) {
        return null;
    }
    return date.toISOString();
};
exports.formatAsUTCISO = formatAsUTCISO;
const normalizePhoneNumber = (phone) => {
    return phone.replace(/[\s\-().]/g, "");
};
exports.normalizePhoneNumber = normalizePhoneNumber;
const validatePhoneNumber = (phone) => {
    const normalized = (0, exports.normalizePhoneNumber)(phone);
    return /^\+?\d{7,15}$/.test(normalized);
};
exports.validatePhoneNumber = validatePhoneNumber;
const sanitizePhoneNumber = (phone) => {
    let sanitized = phone.trim();
    sanitized = (0, exports.normalizePhoneNumber)(sanitized);
    if (!sanitized.startsWith('+')) {
        if (sanitized.startsWith('0')) {
            sanitized = '+234' + sanitized.substring(1);
        }
        else if (sanitized.startsWith('234')) {
            sanitized = '+' + sanitized;
        }
        else {
            sanitized = '+234' + sanitized;
        }
    }
    return sanitized;
};
exports.sanitizePhoneNumber = sanitizePhoneNumber;
const validateE164PhoneNumber = (phone) => {
    const normalized = (0, exports.normalizePhoneNumber)(phone.trim());
    if (!normalized.startsWith('+') && normalized.startsWith('234')) {
        return false;
    }
    const sanitized = (0, exports.sanitizePhoneNumber)(phone);
    if (!/^\+[1-9]\d{6,14}$/.test(sanitized)) {
        return false;
    }
    if (sanitized.startsWith('+234') && /^0+$/.test(sanitized.slice(4))) {
        return false;
    }
    return true;
};
exports.validateE164PhoneNumber = validateE164PhoneNumber;
const validateMessage = (message) => {
    if (!message)
        return true;
    return message.length <= 500;
};
exports.validateMessage = validateMessage;
exports.CreateGiftSchema = zod_1.z.object({
    recipient: zod_1.z.string().min(1, "Invalid recipient ID"),
    amount: zod_1.z.number(),
    currency: exports.CurrencySchema.default("NGN"),
    message: zod_1.z.string().max(500, "Message cannot exceed 500 characters").optional().nullable(),
    template: zod_1.z.string().optional().nullable(),
    coverImageId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
    unlock_at: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional().nullable(),
    senderAvatar: zod_1.z.string().refine((val) => !val || val.startsWith('http'), { message: "Invalid image URL" }).optional().nullable(),
    recipientPhone: zod_1.z.string().refine((val) => !val || (0, exports.validateE164PhoneNumber)(val), { message: "Invalid phone number format" }).optional().nullable(),
});
