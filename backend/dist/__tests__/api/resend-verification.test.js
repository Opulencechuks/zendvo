"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("@/app/api/auth/resend-verification/route");
const otpService_1 = require("@/server/services/otpService");
const emailService_1 = require("@/server/services/emailService");
const db_1 = require("@/lib/db");
jest.mock("@/server/services/otpService", () => ({
    generateOTP: jest.fn(),
    storeOTP: jest.fn(),
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
describe("POST /api/auth/resend-verification", () => {
    const mockRequest = (body) => ({
        json: async () => body,
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should send verification if within limit", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-resend-1",
            status: "pending",
        });
        otpService_1.generateOTP.mockReturnValue("654321");
        emailService_1.sendVerificationEmail.mockResolvedValue({ success: true });
        const req = mockRequest({
            userId: "user-resend-1",
            email: "test@example.com",
        });
        const res = await (0, route_1.POST)(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(otpService_1.storeOTP).toHaveBeenCalled();
    });
    it("should rate limit after 3 attempts", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-resend-limit",
            status: "pending",
        });
        otpService_1.generateOTP.mockReturnValue("000000");
        emailService_1.sendVerificationEmail.mockResolvedValue({ success: true });
        const req = mockRequest({
            userId: "user-resend-limit",
            email: "limit@example.com",
        });
        await (0, route_1.POST)(req);
        await (0, route_1.POST)(req);
        await (0, route_1.POST)(req);
        const res4 = await (0, route_1.POST)(req);
        const json4 = await res4.json();
        expect(res4.status).toBe(429);
        expect(json4.detail).toBe("Rate limit exceeded");
    });
});
