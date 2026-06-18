"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const route_1 = require("@/app/api/auth/register/route");
const rate_limiter_1 = require("@/lib/rate-limiter");
const authRepository_1 = require("@/server/db/authRepository");
const emailService_1 = require("@/server/services/emailService");
const otpService_1 = require("@/server/services/otpService");
jest.mock("bcryptjs", () => ({
    __esModule: true,
    default: {
        hash: jest.fn(),
    },
}));
jest.mock("@/lib/rate-limiter", () => ({
    isRateLimited: jest.fn(() => false),
}));
jest.mock("@/server/db/authRepository", () => ({
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
}));
jest.mock("@/server/services/otpService", () => ({
    generateOTP: jest.fn(),
    storeOTP: jest.fn(),
}));
jest.mock("@/server/services/emailService", () => ({
    sendVerificationEmail: jest.fn(),
}));
describe("POST /api/auth/register", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        rate_limiter_1.isRateLimited.mockReturnValue(false);
        authRepository_1.findUserByEmail.mockResolvedValue(null);
        authRepository_1.createUser.mockResolvedValue({
            id: "uuid-123",
            email: "test@example.com",
            name: null,
            role: "user",
            status: "unverified",
        });
        otpService_1.generateOTP.mockReturnValue("123456");
        otpService_1.storeOTP.mockResolvedValue(undefined);
        emailService_1.sendVerificationEmail.mockResolvedValue({ success: true });
        bcryptjs_1.default.hash.mockResolvedValue("hashed-password");
    });
    it("should register a user, hash with cost 12, and initiate OTP flow", async () => {
        const request = new server_1.NextRequest("http://localhost/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email: "test@example.com",
                password: "StrongP@ss123",
            }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.userId).toBe("uuid-123");
        expect(bcryptjs_1.default.hash).toHaveBeenCalledWith("StrongP@ss123", 12);
        expect(authRepository_1.createUser).toHaveBeenCalled();
        expect(otpService_1.storeOTP).toHaveBeenCalledWith("uuid-123", "123456");
        expect(emailService_1.sendVerificationEmail).toHaveBeenCalledWith("test@example.com", "123456", undefined);
    });
    it("should return 409 if email already exists", async () => {
        authRepository_1.findUserByEmail.mockResolvedValue({
            id: "existing-user",
            email: "existing@example.com",
            name: null,
            role: "user",
            status: "unverified",
        });
        const request = new server_1.NextRequest("http://localhost/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email: "existing@example.com",
                password: "StrongP@ss123",
            }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(409);
        expect(data.detail).toBe("Email already registered");
        expect(authRepository_1.createUser).not.toHaveBeenCalled();
    });
    it("should return 400 for invalid email format", async () => {
        const request = new server_1.NextRequest("http://localhost/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email: "invalid-email",
                password: "StrongP@ss123",
            }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Invalid email format");
    });
    it("should return 400 for weak password", async () => {
        const request = new server_1.NextRequest("http://localhost/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email: "test@example.com",
                password: "weak",
            }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Password too weak");
    });
    it("should return 400 if email or password is missing", async () => {
        const request = new server_1.NextRequest("http://localhost/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email: "test@example.com",
            }),
        });
        const response = await (0, route_1.POST)(request);
        expect(response.status).toBe(400);
    });
});
