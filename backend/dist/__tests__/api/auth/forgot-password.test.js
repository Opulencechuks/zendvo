"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const route_1 = require("@/app/api/auth/forgot-password/route");
const db_1 = require("@/lib/db");
const rate_limiter_1 = require("@/lib/rate-limiter");
const emailService_1 = require("@/server/services/emailService");
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
        },
        transaction: jest.fn(),
    },
}));
jest.mock("@/lib/rate-limiter", () => ({
    isRateLimited: jest.fn(),
}));
jest.mock("@/server/services/emailService", () => ({
    sendForgotPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
}));
function makeRequest(body) {
    return new server_1.NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
describe("POST /api/auth/forgot-password", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        rate_limiter_1.isRateLimited.mockReturnValue(false);
        db_1.db.transaction.mockImplementation(async (cb) => {
            const tx = {
                update: jest.fn(() => ({
                    set: jest.fn(() => ({
                        where: jest.fn(() => Promise.resolve()),
                    })),
                })),
                insert: jest.fn(() => ({
                    values: jest.fn(() => Promise.resolve()),
                })),
            };
            await cb(tx);
        });
    });
    it("returns 400 when email is missing", async () => {
        const res = await (0, route_1.POST)(makeRequest({}));
        expect(res.status).toBe(400);
    });
    it("returns 429 when rate limited", async () => {
        rate_limiter_1.isRateLimited.mockReturnValue(true);
        const res = await (0, route_1.POST)(makeRequest({ email: "alice@zendvo.com" }));
        expect(res.status).toBe(429);
    });
    it("returns 200 and does not send email for unknown user", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue(null);
        const res = await (0, route_1.POST)(makeRequest({ email: "ghost@zendvo.com" }));
        expect(res.status).toBe(200);
        expect(emailService_1.sendForgotPasswordEmail).not.toHaveBeenCalled();
    });
    it("creates reset token and sends email for known user", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-abc-123",
            name: "Alice",
            email: "alice@zendvo.com",
        });
        const res = await (0, route_1.POST)(makeRequest({ email: "alice@zendvo.com" }));
        expect(res.status).toBe(200);
        expect(db_1.db.transaction).toHaveBeenCalled();
        expect(emailService_1.sendForgotPasswordEmail).toHaveBeenCalledWith("alice@zendvo.com", expect.any(String), "Alice");
    });
    it("returns 500 on db error", async () => {
        db_1.db.query.users.findFirst.mockRejectedValue(new Error("DB down"));
        const res = await (0, route_1.POST)(makeRequest({ email: "alice@zendvo.com" }));
        expect(res.status).toBe(500);
    });
});
