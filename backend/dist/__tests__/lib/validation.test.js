"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("@/lib/validation");
describe("normalizePhoneNumber", () => {
    it("strips spaces", () => {
        expect((0, validation_1.normalizePhoneNumber)("811 234 5678")).toBe("8112345678");
    });
    it("strips dashes", () => {
        expect((0, validation_1.normalizePhoneNumber)("811-234-5678")).toBe("8112345678");
    });
    it("strips parentheses and dots", () => {
        expect((0, validation_1.normalizePhoneNumber)("(234)811.234.5678")).toBe("2348112345678");
    });
    it("preserves leading +", () => {
        expect((0, validation_1.normalizePhoneNumber)("+234 811 234 5678")).toBe("+2348112345678");
    });
    it("returns empty string for empty input", () => {
        expect((0, validation_1.normalizePhoneNumber)("")).toBe("");
    });
    it("returns unchanged string when no formatting present", () => {
        expect((0, validation_1.normalizePhoneNumber)("+2348112345678")).toBe("+2348112345678");
    });
});
describe("validatePhoneNumber", () => {
    it("accepts valid local number", () => {
        expect((0, validation_1.validatePhoneNumber)("8112345678")).toBe(true);
    });
    it("accepts valid international number with +", () => {
        expect((0, validation_1.validatePhoneNumber)("+2348112345678")).toBe(true);
    });
    it("accepts number with formatting", () => {
        expect((0, validation_1.validatePhoneNumber)("+234-811-234-5678")).toBe(true);
    });
    it("accepts minimum length number (7 digits)", () => {
        expect((0, validation_1.validatePhoneNumber)("1234567")).toBe(true);
    });
    it("accepts maximum length number (15 digits)", () => {
        expect((0, validation_1.validatePhoneNumber)("123456789012345")).toBe(true);
    });
    it("rejects too short number", () => {
        expect((0, validation_1.validatePhoneNumber)("12345")).toBe(false);
    });
    it("rejects too long number (16+ digits)", () => {
        expect((0, validation_1.validatePhoneNumber)("1234567890123456")).toBe(false);
    });
    it("rejects alphabetic characters", () => {
        expect((0, validation_1.validatePhoneNumber)("abcdefghij")).toBe(false);
    });
    it("rejects empty string", () => {
        expect((0, validation_1.validatePhoneNumber)("")).toBe(false);
    });
    it("rejects string with only formatting characters", () => {
        expect((0, validation_1.validatePhoneNumber)("---")).toBe(false);
    });
});
describe("sanitizePhoneNumber", () => {
    it("should trim whitespace and add +234 prefix for Nigerian local numbers", () => {
        expect((0, validation_1.sanitizePhoneNumber)(" 08123456789 ")).toBe("+2348123456789");
        expect((0, validation_1.sanitizePhoneNumber)("09012345678")).toBe("+2349012345678");
        expect((0, validation_1.sanitizePhoneNumber)("08098765432")).toBe("+2348098765432");
    });
    it("should add +234 prefix for numbers without country code", () => {
        expect((0, validation_1.sanitizePhoneNumber)("8123456789")).toBe("+2348123456789");
        expect((0, validation_1.sanitizePhoneNumber)("9012345678")).toBe("+2349012345678");
    });
    it("should preserve existing + prefix", () => {
        expect((0, validation_1.sanitizePhoneNumber)("+2348123456789")).toBe("+2348123456789");
        expect((0, validation_1.sanitizePhoneNumber)("+447911234567")).toBe("+447911234567");
        expect((0, validation_1.sanitizePhoneNumber)("+15551234567")).toBe("+15551234567");
    });
    it("should remove formatting characters", () => {
        expect((0, validation_1.sanitizePhoneNumber)("+234-812-345-6789")).toBe("+2348123456789");
        expect((0, validation_1.sanitizePhoneNumber)("+234 (812) 345-6789")).toBe("+2348123456789");
        expect((0, validation_1.sanitizePhoneNumber)("+234.812.345.6789")).toBe("+2348123456789");
    });
    it("should handle edge cases", () => {
        expect((0, validation_1.sanitizePhoneNumber)("  +234 812 345 6789  ")).toBe("+2348123456789");
        expect((0, validation_1.sanitizePhoneNumber)("2348123456789")).toBe("+2348123456789");
    });
});
describe("validateE164PhoneNumber", () => {
    it("should validate correct E.164 numbers", () => {
        expect((0, validation_1.validateE164PhoneNumber)("+2348123456789")).toBe(true);
        expect((0, validation_1.validateE164PhoneNumber)("+447911234567")).toBe(true);
        expect((0, validation_1.validateE164PhoneNumber)("+15551234567")).toBe(true);
        expect((0, validation_1.validateE164PhoneNumber)("+44791123456")).toBe(true); // Minimum length
        expect((0, validation_1.validateE164PhoneNumber)("+447911234567890")).toBe(true); // Maximum E.164 length (15 digits)
    });
    it("should reject invalid E.164 numbers", () => {
        expect((0, validation_1.validateE164PhoneNumber)("2348123456789")).toBe(false); // Missing +
        expect((0, validation_1.validateE164PhoneNumber)("+02348123456789")).toBe(false); // Starts with 0 after +
        expect((0, validation_1.validateE164PhoneNumber)("+234")).toBe(false); // Too short
        expect((0, validation_1.validateE164PhoneNumber)("+2348123456789012345")).toBe(false); // Too long
        expect((0, validation_1.validateE164PhoneNumber)("+2348123456789a")).toBe(false); // Contains letter
    });
    it("should accept various input formats and validate after sanitization", () => {
        expect((0, validation_1.validateE164PhoneNumber)("08123456789")).toBe(true); // Will be sanitized to +2348123456789
        expect((0, validation_1.validateE164PhoneNumber)("  +234 812 345 6789  ")).toBe(true); // Will be sanitized
        expect((0, validation_1.validateE164PhoneNumber)("+234-812-345-6789")).toBe(true); // Will be sanitized
    });
});
describe("Integration Tests - Real-world scenarios", () => {
    it("should handle real-world Nigerian phone number formats", () => {
        const testCases = [
            { input: "08123456789", expected: "+2348123456789" },
            { input: "09012345678", expected: "+2349012345678" },
            { input: "08098765432", expected: "+2348098765432" },
            { input: "+2348123456789", expected: "+2348123456789" },
            { input: " 081-234-56789 ", expected: "+2348123456789" },
            { input: "(090) 123-45678", expected: "+2349012345678" },
        ];
        testCases.forEach(({ input, expected }) => {
            expect((0, validation_1.sanitizePhoneNumber)(input)).toBe(expected);
            expect((0, validation_1.validateE164PhoneNumber)(input)).toBe(true);
        });
    });
    it("should handle international phone numbers", () => {
        const testCases = [
            { input: "+447911234567", expected: "+447911234567" },
            { input: "+15551234567", expected: "+15551234567" },
            { input: "+447911-234-567", expected: "+447911234567" },
            { input: "+1 (555) 123-4567", expected: "+15551234567" },
        ];
        testCases.forEach(({ input, expected }) => {
            expect((0, validation_1.sanitizePhoneNumber)(input)).toBe(expected);
            expect((0, validation_1.validateE164PhoneNumber)(input)).toBe(true);
        });
    });
    it("should reject invalid formats", () => {
        const invalidCases = [
            "123", // Too short
            "abc", // Letters only
            "+0", // Invalid country code
            "+234", // Too short after country code
            "0000000000", // All zeros
            "+234000000000", // All zeros after country code
        ];
        invalidCases.forEach((input) => {
            expect((0, validation_1.validateE164PhoneNumber)(input)).toBe(false);
        });
    });
});
describe("validateUnlockAt", () => {
    it("should accept dates at least 1 hour in the future", () => {
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const result = (0, validation_1.validateUnlockAt)(twoHoursFromNow);
        expect(result.valid).toBe(true);
        expect(result.detail).toBeUndefined();
    });
    it("should accept ISO string dates at least 1 hour in the future", () => {
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        const result = (0, validation_1.validateUnlockAt)(twoHoursFromNow);
        expect(result.valid).toBe(true);
        expect(result.detail).toBeUndefined();
    });
    it("should reject dates less than 1 hour in the future", () => {
        const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
        const result = (0, validation_1.validateUnlockAt)(thirtyMinutesFromNow);
        expect(result.valid).toBe(false);
        expect(result.detail).toBe("unlock_at must be at least 1 hour in the future");
    });
    it("should reject dates in the past", () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const result = (0, validation_1.validateUnlockAt)(oneHourAgo);
        expect(result.valid).toBe(false);
        expect(result.detail).toBe("unlock_at must be at least 1 hour in the future");
    });
    it("should reject invalid date formats", () => {
        const result = (0, validation_1.validateUnlockAt)("invalid-date");
        expect(result.valid).toBe(false);
        expect(result.detail).toContain("timezone and milliseconds");
    });
    it("should accept exactly 1 hour in the future", () => {
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        const result = (0, validation_1.validateUnlockAt)(oneHourFromNow);
        expect(result.valid).toBe(true);
        expect(result.detail).toBeUndefined();
    });
});
