"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("@/lib/validation");
describe("Timezone-aware integration", () => {
    const futureIsoWithOffset = (hoursFromNowUtc, offset) => {
        const date = new Date(Date.now() + hoursFromNowUtc * 60 * 60 * 1000);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        const hours = String(date.getUTCHours()).padStart(2, "0");
        const minutes = String(date.getUTCMinutes()).padStart(2, "0");
        const seconds = String(date.getUTCSeconds()).padStart(2, "0");
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offset}`;
    };
    it("should handle PST sender input and convert to UTC correctly", () => {
        const pstUnlockTime = futureIsoWithOffset(10, "-08:00");
        const validation = (0, validation_1.validateUnlockAt)(pstUnlockTime);
        expect(validation.valid).toBe(true);
        const utcDate = (0, validation_1.convertToUTCDate)(pstUnlockTime);
        expect(utcDate).toBeInstanceOf(Date);
        const utcString = (0, validation_1.formatAsUTCISO)(utcDate);
        expect(utcString).toBe(new Date(pstUnlockTime).toISOString());
    });
    it("should handle EST sender input and convert to UTC correctly", () => {
        const estUnlockTime = futureIsoWithOffset(7, "-05:00");
        const validation = (0, validation_1.validateUnlockAt)(estUnlockTime);
        expect(validation.valid).toBe(true);
        const utcDate = (0, validation_1.convertToUTCDate)(estUnlockTime);
        expect(utcDate).toBeInstanceOf(Date);
        const utcString = (0, validation_1.formatAsUTCISO)(utcDate);
        expect(utcString).toBe(new Date(estUnlockTime).toISOString());
    });
    it("should handle UTC sender input correctly", () => {
        const utcUnlockTime = futureIsoWithOffset(6, "Z");
        const validation = (0, validation_1.validateUnlockAt)(utcUnlockTime);
        expect(validation.valid).toBe(true);
        const utcDate = (0, validation_1.convertToUTCDate)(utcUnlockTime);
        expect(utcDate).toBeInstanceOf(Date);
        const utcString = (0, validation_1.formatAsUTCISO)(utcDate);
        expect(utcString).toBe(new Date(utcUnlockTime).toISOString());
    });
    it("should reject invalid timezone formats", () => {
        const invalidFormats = [
            "2030-03-30 09:00:00",
            "2030-03-30T09:00:00",
            "2030-03-30T09:00:00.000",
            "2030-03-30T09:00:00Z",
            "2030-03-30T09:00:00+01:00",
        ];
        invalidFormats.forEach((format) => {
            const validation = (0, validation_1.validateUnlockAt)(format);
            expect(validation.valid).toBe(false);
            expect(validation.detail).toContain("timezone and milliseconds");
        });
    });
    it("should maintain timezone accuracy for edge cases", () => {
        const testCases = [
            {
                input: futureIsoWithOffset(8, "+00:00"),
            },
            {
                input: futureIsoWithOffset(8, "+05:30"),
            },
            {
                input: futureIsoWithOffset(8, "-10:00"),
            },
        ];
        testCases.forEach(({ input }) => {
            const validation = (0, validation_1.validateUnlockAt)(input);
            expect(validation.valid).toBe(true);
            const utcDate = (0, validation_1.convertToUTCDate)(input);
            const utcString = (0, validation_1.formatAsUTCISO)(utcDate);
            expect(utcString).toBe(new Date(input).toISOString());
        });
    });
});
