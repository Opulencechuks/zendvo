"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const otpService_1 = require("@/server/services/otpService");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Mock dependencies
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
        },
        update: jest.fn(() => ({
            set: jest.fn(() => ({
                where: jest.fn(() => Promise.resolve()),
            })),
        })),
        insert: jest.fn(() => ({
            values: jest.fn(() => ({
                returning: jest.fn(() => Promise.resolve([{}])),
            })),
        })),
    },
}));
jest.mock("@/server/services/otpService", () => ({
    ...jest.requireActual("@/server/services/otpService"),
    generateOTP: jest.fn(() => "123456"),
    storeOTP: jest.fn(),
}));
describe("sendOTP - Phone Number Validation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should reject invalid phone numbers", async () => {
        const invalidNumbers = [
            "123", // Too short
            "abc", // Letters only
            "+0", // Invalid country code
            "+234", // Too short after country code
            "0000000000", // All zeros
        ];
        for (const phoneNumber of invalidNumbers) {
            const result = await (0, otpService_1.sendOTP)(phoneNumber);
            expect(result.detail).toBeDefined();
            expect(result.detail).toBe("INVALID_PHONE_FORMAT");
        }
    });
    it("should accept and sanitize valid Nigerian phone numbers", async () => {
        const testCases = [
            "08123456789",
            "09012345678",
            "08098765432",
            "+2348123456789",
            " 081-234-56789 ",
            "(090) 123-45678",
        ];
        // Mock successful user lookup
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-123",
            status: "active",
        });
        for (const phoneNumber of testCases) {
            const result = await (0, otpService_1.sendOTP)(phoneNumber);
            expect(result.success).toBe(true);
            // Verify the phone number was properly sanitized in the database query
            expect(db_1.db.query.users.findFirst).toHaveBeenCalledWith({
                where: (0, drizzle_orm_1.eq)(schema_1.users.phoneNumber, expect.stringMatching(/^\+234\d{10}$/)),
            });
        }
    });
    it("should accept international phone numbers", async () => {
        const testCases = [
            "+447911234567",
            "+15551234567",
            "+447911-234-567",
            "+1 (555) 123-4567",
        ];
        // Mock successful user lookup
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-123",
            status: "active",
        });
        for (const phoneNumber of testCases) {
            const result = await (0, otpService_1.sendOTP)(phoneNumber);
            expect(result.success).toBe(true);
            // Verify the phone number was properly sanitized in the database query
            expect(db_1.db.query.users.findFirst).toHaveBeenCalledWith({
                where: (0, drizzle_orm_1.eq)(schema_1.users.phoneNumber, expect.stringMatching(/^\+\d{7,15}$/)),
            });
        }
    });
    it("should return error when user not found", async () => {
        // Mock user not found
        db_1.db.query.users.findFirst.mockResolvedValue(null);
        const result = await (0, otpService_1.sendOTP)("+2348123456789");
        expect(result.detail).toBeDefined();
        expect(result.detail).toBe("USER_NOT_FOUND");
        expect(result.message).toBe("User not found with this phone number");
    });
    it("should return error when user account is suspended", async () => {
        // Mock suspended user
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-123",
            status: "suspended",
        });
        const result = await (0, otpService_1.sendOTP)("+2348123456789");
        expect(result.detail).toBeDefined();
        expect(result.detail).toBe("ACCOUNT_SUSPENDED");
        expect(result.message).toBe("Account suspended");
    });
    it("should handle database errors gracefully", async () => {
        // Mock database error
        db_1.db.query.users.findFirst.mockRejectedValue(new Error("Database error"));
        const result = await (0, otpService_1.sendOTP)("+2348123456789");
        expect(result.detail).toBeDefined();
        expect(result.detail).toBe("INTERNAL_ERROR");
        expect(result.message).toBe("Internal server error");
    });
});
