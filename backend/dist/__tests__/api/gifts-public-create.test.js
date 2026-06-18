"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const route_1 = require("@/app/api/gifts/public/route");
const db_1 = require("@/lib/db");
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
            gifts: {
                findFirst: jest.fn(),
            },
        },
        insert: jest.fn(),
    },
}));
jest.mock("@/lib/rate-limiter", () => ({
    isRateLimited: jest.fn(() => false),
}));
jest.mock("@/lib/honeypot", () => ({
    validateHoneypot: jest.fn(() => true),
}));
jest.mock("@/lib/slug", () => ({
    generateUniqueSlug: jest.fn(() => Promise.resolve("public-slug")),
}));
jest.mock("@/lib/shortCode", () => ({
    generateUniqueShortCode: jest.fn(() => Promise.resolve("shortcode1")),
}));
describe("POST /api/gifts/public", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should return 400 for an unsupported currency", async () => {
        const request = new server_1.NextRequest("http://localhost/api/gifts/public", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                recipientId: "recipient-123",
                amount: 500,
                currency: "USDC",
                senderName: "Sender",
                senderEmail: "sender@example.com",
            }),
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBeDefined();
        expect(data.detail).toBe("Unsupported currency. Accepted: NGN, USD");
        expect(db_1.db.query.users.findFirst).not.toHaveBeenCalled();
    });
});
