"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("@/app/api/dashboard/summary/route");
const server_1 = require("next/server");
const drizzle_1 = require("@/server/db/drizzle");
jest.mock("@/server/db/drizzle", () => ({
    db: {
        select: jest.fn(),
    },
}));
const mockDb = drizzle_1.db;
function makeRequest(userId = "user-123") {
    const url = new URL("http://localhost/api/dashboard/summary");
    const req = new server_1.NextRequest(url);
    if (userId)
        req.headers.set("x-user-id", userId);
    return req;
}
function mockChain(result) {
    return {
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(result),
        }),
    };
}
describe("Dashboard Summary API", () => {
    afterEach(() => jest.clearAllMocks());
    test("returns 401 when unauthenticated", async () => {
        const res = await (0, route_1.GET)(makeRequest(null));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.detail).toBeDefined();
        expect(body.detail).toBe("Unauthorized");
    });
    test("returns 200 with summary data for authenticated user", async () => {
        mockDb.select
            .mockReturnValueOnce(mockChain([{ totalSent: 3 }]))
            .mockReturnValueOnce(mockChain([{ totalReceived: 5 }]));
        const res = await (0, route_1.GET)(makeRequest());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toEqual({
            totalSent: 3,
            totalReceived: 5,
        });
    });
    test("returns zero values when user has no gifts", async () => {
        mockDb.select
            .mockReturnValueOnce(mockChain([{ totalSent: 0 }]))
            .mockReturnValueOnce(mockChain([{ totalReceived: 0 }]));
        const res = await (0, route_1.GET)(makeRequest());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data).toEqual({
            totalSent: 0,
            totalReceived: 0,
        });
    });
    test("returns 500 on database error", async () => {
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockRejectedValue(new Error("DB failure")),
            }),
        });
        const res = await (0, route_1.GET)(makeRequest());
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.detail).toBeDefined();
        expect(body.detail).toBe("Internal server error");
    });
});
