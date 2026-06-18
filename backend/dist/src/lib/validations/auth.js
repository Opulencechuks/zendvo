"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidE164 = exports.profileUpdateSchema = exports.signUpSchema = exports.phoneSchema = exports.phoneField = void 0;
const zod_1 = require("zod");
const E164_REGEX = /^\+[1-9]\d{1,14}$/;
exports.phoneField = zod_1.z
    .string()
    .trim()
    .regex(E164_REGEX, "Must be a valid E.164 phone number (e.g. +14155552671)");
exports.phoneSchema = zod_1.z.object({ phone: exports.phoneField });
exports.signUpSchema = zod_1.z.object({
    fullName: zod_1.z
        .string()
        .trim()
        .min(2, "At least 2 characters"),
    email: zod_1.z
        .string()
        .trim()
        .email("Invalid email address"),
    phone: exports.phoneField,
    password: zod_1.z
        .string()
        .min(8, "At least 8 characters"),
});
exports.profileUpdateSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2, "At least 2 characters").optional(),
    phone: exports.phoneField.optional(),
});
const isValidE164 = (value) => exports.phoneField.safeParse(value).success;
exports.isValidE164 = isValidE164;
