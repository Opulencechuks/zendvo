"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const route_1 = require("@/app/api/auth/send-otp/route");
const route_2 = require("@/app/api/auth/verify-otp/route");
const db_1 = require("@/lib/db");
const emailService = __importStar(require("@/server/services/emailService"));
const otpService = __importStar(require("@/server/services/otpService"));
const rateLimiter = __importStar(require("@/lib/rate-limiter"));
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
        },
    },
}));
jest.mock("@/server/services/otpService", () => ({
    generateOTP: jest.fn(() => "123456"),
    storeOTP: jest.fn().mockResolvedValue(undefined),
    checkOTPRequestRateLimitByUserId: jest.fn().mockResolvedValue({
        allowed: true,
        remainingRequests: 3,
        retryAfterMs: 0,
    }),
    verifyOTP: jest.fn(),
    hashOTP: jest.requireActual("@/server/services/otpService").hashOTP,
}));
jest.mock("@/server/services/emailService", () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
    sendSecurityAlertEmail: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("@/lib/rate-limiter", () => ({
    isRateLimited: jest.fn(),
}));
describe("OTP Authentication Endpoints", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("POST /api/auth/send-otp", () => {
        it("should send OTP successfully", async () => {
            db_1.db.query.users.findFirst.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                status: "active",
                name: "Test User",
            });
            rateLimiter.isRateLimited.mockReturnValue(false);
            const request = new server_1.NextRequest("http://localhost/api/auth/send-otp", {
                method: "POST",
                body: JSON.stringify({ email: "test@example.com" }),
            });
            const response = await (0, route_1.POST)(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(otpService.storeOTP).toHaveBeenCalledWith("user-1", "123456");
            expect(emailService.sendVerificationEmail).toHaveBeenCalled();
        });
        it("should return 429 if rate limited", async () => {
            rateLimiter.isRateLimited.mockReturnValue(true);
            const request = new server_1.NextRequest("http://localhost/api/auth/send-otp", {
                method: "POST",
                body: JSON.stringify({ email: "test@example.com" }),
            });
            const response = await (0, route_1.POST)(request);
            expect(response.status).toBe(429);
        });
        it("should return 404 if user not found", async () => {
            db_1.db.query.users.findFirst.mockResolvedValue(null);
            rateLimiter.isRateLimited.mockReturnValue(false);
            const request = new server_1.NextRequest("http://localhost/api/auth/send-otp", {
                method: "POST",
                body: JSON.stringify({ email: "unknown@example.com" }),
            });
            const response = await (0, route_1.POST)(request);
            expect(response.status).toBe(404);
        });
    });
    describe("POST /api/auth/verify-otp", () => {
        it("should verify OTP successfully", async () => {
            db_1.db.query.users.findFirst.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                status: "unverified",
                lockUntil: null,
            });
            otpService.verifyOTP.mockResolvedValue({
                success: true,
                message: "Email verified successfully!",
            });
            const request = new server_1.NextRequest("http://localhost/api/auth/verify-otp", {
                method: "POST",
                body: JSON.stringify({ email: "test@example.com", otp: "123456" }),
            });
            const response = await (0, route_2.POST)(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });
        it("should fail with invalid OTP", async () => {
            db_1.db.query.users.findFirst.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                status: "unverified",
                lockUntil: null,
            });
            otpService.verifyOTP.mockResolvedValue({
                success: false,
                message: "Invalid verification code. 4 attempts remaining.",
                locked: false,
            });
            const request = new server_1.NextRequest("http://localhost/api/auth/verify-otp", {
                method: "POST",
                body: JSON.stringify({ email: "test@example.com", otp: "000000" }),
            });
            const response = await (0, route_2.POST)(request);
            expect(response.status).toBe(400);
        });
        it("should lock account and send alert after failed attempts", async () => {
            db_1.db.query.users.findFirst.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                status: "unverified",
                lockUntil: null,
                name: null,
            });
            otpService.verifyOTP.mockResolvedValue({
                success: false,
                message: "Maximum attempts exceeded. Account locked for 30 minutes.",
                locked: true,
                shouldSendAlert: true,
            });
            const request = new server_1.NextRequest("http://localhost/api/auth/verify-otp", {
                method: "POST",
                body: JSON.stringify({ email: "test@example.com", otp: "000000" }),
            });
            const response = await (0, route_2.POST)(request);
            expect(response.status).toBe(429);
            expect(emailService.sendSecurityAlertEmail).toHaveBeenCalledWith("test@example.com", undefined);
        });
        it("should reject request if account is already locked", async () => {
            db_1.db.query.users.findFirst.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                status: "unverified",
                lockUntil: new Date(Date.now() + 10000),
            });
            otpService.verifyOTP.mockResolvedValue({
                success: false,
                message: "Account is temporarily locked. Please try again later.",
                locked: true,
            });
            const request = new server_1.NextRequest("http://localhost/api/auth/verify-otp", {
                method: "POST",
                body: JSON.stringify({ email: "test@example.com", otp: "123456" }),
            });
            const response = await (0, route_2.POST)(request);
            expect(response.status).toBe(429);
        });
    });
});
