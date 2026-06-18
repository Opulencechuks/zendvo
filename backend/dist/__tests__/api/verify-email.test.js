"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("@/app/api/auth/verify-email/route");
const otpService_1 = require("@/server/services/otpService");
jest.mock("@/server/services/otpService", () => ({
    verifyOTP: jest.fn(),
}));
describe("POST /api/auth/verify-email", () => {
    const mockRequest = (body) => ({
        json: async () => body,
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should return 400 if missing fields", async () => {
        const req = mockRequest({ userId: "123" });
        const res = await (0, route_1.POST)(req);
        expect(res.status).toBe(400);
    });
    it("should return 400 for invalid OTP format", async () => {
        const req = mockRequest({ userId: "123", otp: "abc" });
        const res = await (0, route_1.POST)(req);
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.detail).toContain("Invalid OTP format");
    });
    it("should return success if verification succeeds", async () => {
        otpService_1.verifyOTP.mockResolvedValue({
            success: true,
            message: "OK",
        });
        const req = mockRequest({ userId: "123", otp: "123456" });
        const res = await (0, route_1.POST)(req);
        const json = await res.json();
        expect(otpService_1.verifyOTP).toHaveBeenCalledWith("123", "123456");
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
    });
    it("should return 400 if expired", async () => {
        otpService_1.verifyOTP.mockResolvedValue({
            success: false,
            message: "expired",
        });
        const req = mockRequest({ userId: "123", otp: "123456" });
        const res = await (0, route_1.POST)(req);
        expect(res.status).toBe(400);
    });
    it("should return 429 if locked out", async () => {
        otpService_1.verifyOTP.mockResolvedValue({
            success: false,
            locked: true,
            message: "Maximum attempts",
        });
        const req = mockRequest({ userId: "123", otp: "123456" });
        const res = await (0, route_1.POST)(req);
        expect(res.status).toBe(429);
    });
});
