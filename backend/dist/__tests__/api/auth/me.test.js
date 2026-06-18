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
const db_1 = require("@/lib/db");
const auth_session_1 = require("@/lib/auth-session");
jest.mock("drizzle-orm", () => ({
    eq: jest.fn(() => ({})),
}));
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
        },
    },
}));
jest.mock("@/lib/db/schema", () => ({
    users: {
        id: "id",
    },
}));
jest.mock("@/lib/auth-session", () => ({
    getAuthPayload: jest.fn(),
}));
describe("GET /api/auth/me", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const makeRequest = () => new server_1.NextRequest("http://localhost/api/auth/me", {
        method: "GET",
    });
    it("returns unauthorized when no auth payload is present", async () => {
        auth_session_1.getAuthPayload.mockResolvedValue(null);
        const { GET } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/me/route")));
        const response = await GET(makeRequest());
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json.detail).toBeDefined();
        expect(json.detail).toBe("Unauthorized");
    });
    it("returns phone_last_4 and never includes phone fields", async () => {
        auth_session_1.getAuthPayload.mockResolvedValue({ userId: "user-1" });
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-1",
            email: "user@example.com",
            name: "Test User",
            phoneNumber: "+2348012345678",
            role: "user",
            status: "active",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            lastLogin: new Date("2026-01-02T00:00:00.000Z"),
        });
        const { GET } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/me/route")));
        const response = await GET(makeRequest());
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.user.phone_last_4).toBe("5678");
        expect(json.user.phone).toBeUndefined();
        expect(json.user.phoneNumber).toBeUndefined();
    });
    it("returns null phone_last_4 when user has no phone", async () => {
        auth_session_1.getAuthPayload.mockResolvedValue({ userId: "user-2" });
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-2",
            email: "nophone@example.com",
            name: "No Phone",
            phoneNumber: null,
            role: "user",
            status: "unverified",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            lastLogin: null,
        });
        const { GET } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/me/route")));
        const response = await GET(makeRequest());
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.user.phone_last_4).toBeNull();
    });
    it("returns available characters when phone has fewer than 4", async () => {
        auth_session_1.getAuthPayload.mockResolvedValue({ userId: "user-3" });
        db_1.db.query.users.findFirst.mockResolvedValue({
            id: "user-3",
            email: "short@example.com",
            name: "Short Phone",
            phoneNumber: "123",
            role: "user",
            status: "active",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            lastLogin: null,
        });
        const { GET } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/me/route")));
        const response = await GET(makeRequest());
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.user.phone_last_4).toBe("123");
    });
});
