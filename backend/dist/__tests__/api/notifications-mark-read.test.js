"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("@/app/api/notifications/mark-read/route");
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
jest.mock("@/lib/db", () => ({
    db: {
        select: jest.fn(),
        update: jest.fn(),
    },
}));
const mockDb = db_1.db;
function makeRequest(body = { notificationIds: ["id-1", "id-2"] }, userId = "user-123") {
    const req = new server_1.NextRequest("http://localhost/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (userId)
        req.headers.set("x-user-id", userId);
    return req;
}
// Helper to wire up the chained select builder
function mockOwnedIds(ids) {
    mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(ids.map((id) => ({ id }))),
        }),
    });
}
// Helper to wire up the chained update builder
function mockUpdate(returnedIds) {
    mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest
                    .fn()
                    .mockResolvedValue(returnedIds.map((id) => ({ id }))),
            }),
        }),
    });
}
afterEach(() => jest.clearAllMocks());
describe("POST /api/notifications/mark-read", () => {
    test("returns 401 when unauthenticated", async () => {
        const res = await (0, route_1.POST)(makeRequest(undefined, null));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.detail).toBeDefined();
    });
    test("returns 400 for invalid JSON body", async () => {
        const req = new server_1.NextRequest("http://localhost/api/notifications/mark-read", { method: "POST", body: "not json" });
        req.headers.set("x-user-id", "user-123");
        const res = await (0, route_1.POST)(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.detail).toContain("Invalid JSON");
    });
    test("returns 400 when notificationIds is missing", async () => {
        const res = await (0, route_1.POST)(makeRequest({}));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.detail).toContain("notificationIds");
    });
    test("returns 400 when notificationIds is empty array", async () => {
        const res = await (0, route_1.POST)(makeRequest({ notificationIds: [] }));
        expect(res.status).toBe(400);
    });
    test("returns 400 when notificationIds contains non-strings", async () => {
        const res = await (0, route_1.POST)(makeRequest({ notificationIds: [123, null] }));
        expect(res.status).toBe(400);
    });
    test("returns 400 when notificationIds contains empty strings", async () => {
        const res = await (0, route_1.POST)(makeRequest({ notificationIds: [""] }));
        expect(res.status).toBe(400);
    });
    test("returns 403 when user does not own some notifications", async () => {
        mockOwnedIds(["id-1"]); // only id-1 is owned
        const res = await (0, route_1.POST)(makeRequest({ notificationIds: ["id-1", "id-2"] }));
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.invalidIds).toEqual(["id-2"]);
    });
    test("returns 200 and marks notifications as read", async () => {
        mockOwnedIds(["id-1", "id-2"]);
        mockUpdate(["id-1", "id-2"]);
        const res = await (0, route_1.POST)(makeRequest({ notificationIds: ["id-1", "id-2"] }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.markedRead).toBe(2);
        expect(body.data.ids).toEqual(["id-1", "id-2"]);
        // Verify update was called
        expect(mockDb.update).toHaveBeenCalled();
    });
    test("returns 200 for a single notification id", async () => {
        mockOwnedIds(["notif-abc"]);
        mockUpdate(["notif-abc"]);
        const res = await (0, route_1.POST)(makeRequest({ notificationIds: ["notif-abc"] }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.markedRead).toBe(1);
    });
    test("returns 500 on unexpected database error", async () => {
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockRejectedValue(new Error("DB down")),
            }),
        });
        const res = await (0, route_1.POST)(makeRequest({ notificationIds: ["id-1"] }));
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.detail).toBeDefined();
    });
});
