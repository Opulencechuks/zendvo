"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const route_1 = require("@/app/api/auth/reset-password/route");
const authRepository_1 = require("@/server/db/authRepository");
const emailService_1 = require("@/server/services/emailService");
jest.mock("bcryptjs", () => ({
    __esModule: true,
    default: {
        hash: jest.fn(),
    },
}));
jest.mock("@/server/db/authRepository", () => ({
    findPasswordResetByToken: jest.fn(),
    completePasswordReset: jest.fn(),
}));
jest.mock("@/server/services/emailService", () => ({
    sendPasswordResetConfirmationEmail: jest
        .fn()
        .mockResolvedValue({ success: true }),
}));
describe("POST /api/auth/reset-password", () => {
    const validToken = "550e8400-e29b-41d4-a716-446655440000";
    const validPassword = "NewStrongP@ss123";
    beforeEach(() => {
        jest.clearAllMocks();
        bcryptjs_1.default.hash.mockResolvedValue("hashed-password");
        authRepository_1.completePasswordReset.mockResolvedValue(undefined);
    });
    it("should reset password successfully with valid token and password", async () => {
        authRepository_1.findPasswordResetByToken.mockResolvedValue({
            id: "reset-1",
            userId: "user-123",
            expiresAt: new Date(Date.now() + 10000),
            usedAt: null,
            user: { id: "user-123", email: "test@example.com", name: "Test User" },
        });
        const request = new server_1.NextRequest("http://localhost/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token: validToken, newPassword: validPassword }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(bcryptjs_1.default.hash).toHaveBeenCalledWith(validPassword, 12);
        expect(authRepository_1.completePasswordReset).toHaveBeenCalledWith({
            resetId: "reset-1",
            userId: "user-123",
            passwordHash: "hashed-password",
        });
        expect(emailService_1.sendPasswordResetConfirmationEmail).toHaveBeenCalledWith("test@example.com", "Test User");
    });
    it("should return 400 for invalid token format", async () => {
        const request = new server_1.NextRequest("http://localhost/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({
                token: "invalid-token",
                newPassword: validPassword,
            }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Invalid token format");
    });
    it("should return 400 for weak password", async () => {
        const request = new server_1.NextRequest("http://localhost/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token: validToken, newPassword: "weak" }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Password too weak");
    });
    it("should return 400 if token is expired", async () => {
        authRepository_1.findPasswordResetByToken.mockResolvedValue({
            id: "reset-1",
            userId: "user-123",
            expiresAt: new Date(Date.now() - 10000),
            usedAt: null,
            user: { id: "user-123", email: "test@example.com", name: "Test User" },
        });
        const request = new server_1.NextRequest("http://localhost/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token: validToken, newPassword: validPassword }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Token has expired");
    });
    it("should return 400 if token has already been used", async () => {
        authRepository_1.findPasswordResetByToken.mockResolvedValue({
            id: "reset-1",
            userId: "user-123",
            expiresAt: new Date(Date.now() + 10000),
            usedAt: new Date(),
            user: { id: "user-123", email: "test@example.com", name: "Test User" },
        });
        const request = new server_1.NextRequest("http://localhost/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token: validToken, newPassword: validPassword }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Token has already been used");
    });
});
