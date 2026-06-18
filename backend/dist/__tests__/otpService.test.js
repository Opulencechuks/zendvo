"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const otpService_1 = require("../src/server/services/otpService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("@/lib/db");
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            emailVerifications: {
                findFirst: jest.fn(),
            },
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
        delete: jest.fn(() => ({
            where: jest.fn(() => ({
                returning: jest.fn(() => Promise.resolve([{ id: "1" }, { id: "2" }])),
            })),
        })),
    },
}));
jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
    hash: jest.requireActual("bcryptjs").hash,
}));
describe("OTP Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("generateOTP", () => {
        it("should generate a 6-digit string", () => {
            const otp = (0, otpService_1.generateOTP)();
            expect(otp).toHaveLength(6);
            expect(otp).toMatch(/^\d{6}$/);
        });
    });
    describe("storeOTP", () => {
        it("should store OTP and invalidate previous records", async () => {
            await (0, otpService_1.storeOTP)("user-123", "123456");
            expect(db_1.db.update).toHaveBeenCalled();
            expect(db_1.db.insert).toHaveBeenCalled();
        });
    });
    describe("verifyOTP", () => {
        it("should fail if no verification found", async () => {
            db_1.db.query.emailVerifications.findFirst.mockResolvedValue(null);
            const result = await (0, otpService_1.verifyOTP)("user-123", "123456");
            expect(result.detail).toBeDefined();
            expect(result.message).toContain("No verification code found");
        });
        it("should fail if expired", async () => {
            db_1.db.query.emailVerifications.findFirst.mockResolvedValue({
                id: "ev-1",
                otpHash: "salt:hash",
                expiresAt: new Date(Date.now() - 1000),
                attempts: 0,
            });
            const result = await (0, otpService_1.verifyOTP)("user-123", "123456");
            expect(result.detail).toBeDefined();
            expect(result.message).toContain("expired");
        });
    });
    describe("cleanupExpiredOTPs", () => {
        it("should return deleted count", async () => {
            const count = await (0, otpService_1.cleanupExpiredOTPs)();
            expect(count).toBe(2);
        });
    });
    describe("verifyGiftOTP", () => {
        const validGift = {
            id: "gift-123",
            otpHash: "$2a$10$abcdefghijklmnopqrstuv1234567890123456789012",
            otpExpiresAt: new Date(Date.now() + 600000),
            otpAttempts: 0,
        };
        it("should fail if otpHash is null", async () => {
            const result = await (0, otpService_1.verifyGiftOTP)({ ...validGift, otpHash: null }, "123456");
            expect(result.detail).toBeDefined();
        });
        it("should increment attempts on invalid OTP", async () => {
            bcryptjs_1.default.compare.mockResolvedValue(false);
            const result = await (0, otpService_1.verifyGiftOTP)(validGift, "000000");
            expect(result.detail).toBeDefined();
            expect(db_1.db.update).toHaveBeenCalled();
        });
    });
});
