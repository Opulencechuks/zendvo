"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const route_1 = require("@/app/api/users/lookup/route");
const db_1 = require("@/lib/db");
const rate_limiter_1 = require("@/lib/rate-limiter");
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
        },
    },
}));
jest.mock("@/lib/rate-limiter", () => ({
    isRateLimited: jest.fn(() => false),
}));
function makeRequest(body, headers) {
    return new server_1.NextRequest("http://localhost:3000/api/users/lookup", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}
describe("POST /api/users/lookup", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        rate_limiter_1.isRateLimited.mockReturnValue(false);
    });
    it("returns 400 when content-type is not json", async () => {
        const request = new server_1.NextRequest("http://localhost:3000/api/users/lookup", {
            method: "POST",
            headers: {
                "content-type": "text/plain",
            },
            body: "phoneNumber=+2348112345678",
        });
        const response = await (0, route_1.POST)(request);
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Invalid Content-Type. Expected application/json");
    });
    it("returns 413 when the request body is too large", async () => {
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }, { "content-length": "2048" }));
        const data = await response.json();
        expect(response.status).toBe(413);
        expect(data.detail).toBe("Request body too large");
    });
    it("returns 403 for invalid origin", async () => {
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }, {
            origin: "https://evil.example",
            host: "localhost:3000",
        }));
        const data = await response.json();
        expect(response.status).toBe(403);
        expect(data.detail).toBe("CSRF protection: Invalid origin");
    });
    it("returns 400 when phone number is missing", async () => {
        const response = await (0, route_1.POST)(makeRequest({}));
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Phone number is required");
    });
    it("returns 400 for invalid phone number format", async () => {
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "abc" }));
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBe("Invalid phone number format. Please use E.164 format (e.g., +2348123456789)");
    });
    it("returns 429 when ip rate limit is exceeded", async () => {
        rate_limiter_1.isRateLimited.mockReturnValueOnce(true);
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }));
        const data = await response.json();
        expect(response.status).toBe(429);
        expect(data.detail).toBe("Too many requests. Please try again later.");
        expect(rate_limiter_1.isRateLimited).toHaveBeenCalledWith("lookup:127.0.0.1", 5, 60_000);
    });
    it("returns 429 when per-phone rate limit is exceeded", async () => {
        rate_limiter_1.isRateLimited
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }));
        const data = await response.json();
        expect(response.status).toBe(429);
        expect(data.detail).toBe("Too many requests. Please try again later.");
        expect(rate_limiter_1.isRateLimited).toHaveBeenNthCalledWith(2, "lookup:127.0.0.1:+2348112345678", 3, 60_000);
    });
    it("returns null data when no verified user matches the phone number", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue(null);
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }));
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual({
            success: true,
            data: null,
        });
    });
    it("returns first_name and last_name only for matched verified users", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            name: "Emrys Stone",
        });
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }));
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual({
            success: true,
            data: {
                first_name: "Emrys",
                last_name: "Stone",
            },
        });
    });
    it("returns null last_name for single-word names", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            name: "Emrys",
        });
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }));
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.data).toEqual({
            first_name: "Emrys",
            last_name: null,
        });
    });
    it("sanitizes the phone number before lookup", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue(null);
        await (0, route_1.POST)(makeRequest({ phoneNumber: "+234-811 234-5678" }));
        expect(rate_limiter_1.isRateLimited).toHaveBeenNthCalledWith(2, "lookup:127.0.0.1:+2348112345678", 3, 60_000);
        expect(db_1.db.query.users.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            columns: {
                name: true,
            },
        }));
    });
    it("returns 500 on database errors", async () => {
        db_1.db.query.users.findFirst.mockRejectedValue(new Error("DB connection failed"));
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }));
        const data = await response.json();
        expect(response.status).toBe(500);
        expect(data.detail).toBe("Internal server error");
    });
    it("does not expose any additional user fields", async () => {
        db_1.db.query.users.findFirst.mockResolvedValue({
            name: "Emrys Stone",
            email: "emrys@example.com",
            avatarUrl: "https://example.com/avatar.jpg",
        });
        const response = await (0, route_1.POST)(makeRequest({ phoneNumber: "+2348112345678" }));
        const data = await response.json();
        expect(data.data).toEqual({
            first_name: "Emrys",
            last_name: "Stone",
        });
        expect(data.data).not.toHaveProperty("email");
        expect(data.data).not.toHaveProperty("avatarUrl");
        expect(data.data).not.toHaveProperty("id");
    });
});
