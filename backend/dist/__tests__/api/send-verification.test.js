"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("@/app/api/auth/send-verification/route");
const otpService_1 = require("@/server/services/otpService");
const emailService_1 = require("@/server/services/emailService");
const db_1 = require("@/lib/db");
jest.mock("@/server/services/otpService", () => ({
    generateOTP: jest.fn(),
    storeOTP: jest.fn(),
    checkOTPRequestRateLimitByUserId: jest.fn().mockResolvedValue({
        allowed: true,
        remainingRequests: 3,
        retryAfterMs: 0,
    }),
}));
jest.mock("@/server/services/emailService", () => ({
    sendVerificationEmail: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
        },
    },
}));
describe("POST /api/auth/send-verification", () => {
    const mockRequest = (body) => ({
        json: async () => body,
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should return 400 if userId or email is missing", async () => {
        const req = mockRequest({ userId: "123" });
        const res = await (0, route_1.POST)(req);
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.detail).toBe("userId and email are required");
    });
    it("should return 404 if user not found", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue(null);
        const req = mockRequest({ userId: "123", email: "test@example.com" });
        const res = await (0, route_1.POST)(req);
        expect(res.status).toBe(404);
    });
    it("should return 200 if already verified", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "123",
            status: "active",
        });
        const req = mockRequest({ userId: "123", email: "test@example.com" });
        const res = await (0, route_1.POST)(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.message).toBe("Email already verified");
    });
    it("should generate OTP, store it, send email and return 200", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "123",
            status: "pending",
        });
        otpService_1.generateOTP.mockReturnValue("123456");
        emailService_1.sendVerificationEmail.mockResolvedValue({ success: true });
        const req = mockRequest({
            userId: "123",
            email: "test@example.com",
            name: "User",
        });
        const res = await (0, route_1.POST)(req);
        const json = await res.json();
        expect(otpService_1.generateOTP).toHaveBeenCalled();
        expect(otpService_1.storeOTP).toHaveBeenCalledWith("123", "123456");
        expect(emailService_1.sendVerificationEmail).toHaveBeenCalledWith("test@example.com", "123456", "User");
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
    });
});
