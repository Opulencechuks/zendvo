"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const route_1 = require("@/app/api/auth/refresh/route");
const route_2 = require("@/app/api/auth/logout/route");
const db_1 = require("@/lib/db");
const tokens_1 = require("@/lib/tokens");
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            refreshTokens: {
                findFirst: jest.fn(),
            },
        },
        transaction: jest.fn(),
        delete: jest.fn(() => ({
            where: jest.fn(() => Promise.resolve()),
        })),
    },
}));
jest.mock("@/lib/tokens", () => ({
    verifyRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(() => Promise.resolve("new-access-token")),
    generateRefreshToken: jest.fn(() => Promise.resolve("new-refresh-token")),
}));
describe("Token Flow Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        db_1.db.transaction.mockImplementation(async (cb) => {
            const tx = {
                update: jest.fn(() => ({
                    set: jest.fn(() => ({
                        where: jest.fn(() => Promise.resolve()),
                    })),
                })),
                delete: jest.fn(() => ({
                    where: jest.fn(() => Promise.resolve()),
                })),
                insert: jest.fn(() => ({
                    values: jest.fn(() => Promise.resolve()),
                })),
            };
            await cb(tx);
        });
    });
    describe("POST /api/auth/refresh", () => {
        it("should refresh token successfully for valid token", async () => {
            tokens_1.verifyRefreshToken.mockReturnValue({
                userId: "1",
                email: "a@b.com",
                role: "Sender",
            });
            db_1.db.query.refreshTokens.findFirst.mockResolvedValue({
                id: "tok-1",
                token: "valid-token",
                expiresAt: new Date(Date.now() + 10000),
                revokedAt: null,
                deviceInfo: null,
            });
            const request = new server_1.NextRequest("http://localhost/api/auth/refresh", {
                method: "POST",
                body: JSON.stringify({ refreshToken: "valid-token" }),
            });
            const response = await (0, route_1.POST)(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.data.accessToken).toBe("new-access-token");
            expect(data.data.refreshToken).toBe("new-refresh-token");
        });
        it("should return 401 for expired token", async () => {
            tokens_1.verifyRefreshToken.mockReturnValue({
                userId: "1",
                email: "a@b.com",
                role: "Sender",
            });
            db_1.db.query.refreshTokens.findFirst.mockResolvedValue({
                id: "tok-1",
                expiresAt: new Date(Date.now() - 10000),
                revokedAt: null,
            });
            const request = new server_1.NextRequest("http://localhost/api/auth/refresh", {
                method: "POST",
                body: JSON.stringify({ refreshToken: "expired-token" }),
            });
            const response = await (0, route_1.POST)(request);
            expect(response.status).toBe(401);
        });
    });
    describe("POST /api/auth/logout", () => {
        it("should logout successfully", async () => {
            const request = new server_1.NextRequest("http://localhost/api/auth/logout", {
                method: "POST",
                body: JSON.stringify({ refreshToken: "token-to-delete" }),
            });
            const response = await (0, route_2.POST)(request);
            expect(response.status).toBe(200);
            expect(db_1.db.delete).toHaveBeenCalled();
        });
    });
});
