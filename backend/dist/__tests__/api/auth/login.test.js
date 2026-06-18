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
const auth_1 = require("@/lib/auth");
const tokens_1 = require("@/lib/tokens");
const selectLimitMock = jest.fn();
const selectWhereMock = jest.fn(() => ({ limit: selectLimitMock }));
const selectFromMock = jest.fn(() => ({ where: selectWhereMock }));
const selectMock = jest.fn(() => ({ from: selectFromMock }));
const updateWhereMock = jest.fn();
const updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
const updateMock = jest.fn(() => ({ set: updateSetMock }));
const insertValuesMock = jest.fn();
const insertMock = jest.fn(() => ({ values: insertValuesMock }));
const transactionMock = jest.fn(async (callback) => {
    await callback({
        update: updateMock,
        insert: insertMock,
    });
});
jest.mock("drizzle-orm", () => ({
    eq: jest.fn(() => ({})),
}));
jest.mock("@/lib/db", () => ({
    db: {
        select: selectMock,
        delete: jest.fn(),
        transaction: transactionMock,
    },
}));
jest.mock("@/lib/db/schema", () => ({
    users: {
        id: "id",
        email: "email",
        passwordHash: "passwordHash",
        role: "role",
    },
    refreshTokens: {},
}));
jest.mock("@/lib/auth", () => ({
    comparePassword: jest.fn(),
}));
jest.mock("@/lib/tokens", () => ({
    generateAccessToken: jest.fn(() => Promise.resolve("mock-access-token")),
    generateRefreshToken: jest.fn(() => Promise.resolve("mock-refresh-token")),
}));
describe("POST /api/auth/login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const makeRequest = (body, ip, userAgent) => {
        const headers = {
            "content-type": "application/json",
            "x-forwarded-for": ip,
        };
        if (userAgent) {
            headers["user-agent"] = userAgent;
        }
        return new server_1.NextRequest("http://localhost/api/auth/login", {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
    };
    it("returns tokens when credentials are valid", async () => {
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/login/route")));
        selectLimitMock.mockResolvedValue([
            {
                id: "user-123",
                email: "test@example.com",
                passwordHash: "hashed-password",
                role: "user",
            },
        ]);
        auth_1.comparePassword.mockResolvedValue(true);
        const response = await POST(makeRequest({ email: "test@example.com", password: "Password123!" }, "10.0.0.1"));
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.access_token).toBe("mock-access-token");
        expect(json.refresh_token).toBe("mock-refresh-token");
        expect(tokens_1.generateAccessToken).toHaveBeenCalledWith({
            userId: "user-123",
            email: "test@example.com",
            role: "user",
            fingerprint: expect.any(String),
        });
        expect(transactionMock).toHaveBeenCalledTimes(1);
        expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
            userId: "user-123",
            token: "mock-refresh-token",
            deviceId: null,
        }));
    });
    it("returns 401 when password is invalid", async () => {
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/login/route")));
        selectLimitMock.mockResolvedValue([
            {
                id: "user-123",
                email: "test@example.com",
                passwordHash: "hashed-password",
                role: "user",
            },
        ]);
        auth_1.comparePassword.mockResolvedValue(false);
        const response = await POST(makeRequest({ email: "test@example.com", password: "wrong" }, "10.0.0.2"));
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json.detail).toBe("Invalid email or password");
    });
    it("returns 401 when email is not found", async () => {
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/login/route")));
        selectLimitMock.mockResolvedValue([]);
        const response = await POST(makeRequest({ email: "unknown@example.com", password: "Password123!" }, "10.0.0.3"));
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json.detail).toBe("Invalid email or password");
        expect(auth_1.comparePassword).not.toHaveBeenCalled();
        expect(tokens_1.generateRefreshToken).not.toHaveBeenCalled();
    });
    it("rate limits after 5 failed attempts from same IP in 1 minute", async () => {
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/login/route")));
        selectLimitMock.mockResolvedValue([]);
        for (let i = 0; i < 5; i += 1) {
            const response = await POST(makeRequest({ email: "unknown@example.com", password: "wrong" }, "10.0.0.4"));
            expect(response.status).toBe(401);
        }
        const limitedResponse = await POST(makeRequest({ email: "unknown@example.com", password: "wrong" }, "10.0.0.4"));
        const json = await limitedResponse.json();
        expect(limitedResponse.status).toBe(429);
        expect(json.detail).toContain("Too many failed login attempts");
    });
    it("uses provided device_id from request body", async () => {
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/login/route")));
        selectLimitMock.mockResolvedValue([
            {
                id: "user-123",
                email: "test@example.com",
                passwordHash: "hashed-password",
                role: "user",
            },
        ]);
        auth_1.comparePassword.mockResolvedValue(true);
        const response = await POST(makeRequest({
            email: "test@example.com",
            password: "Password123!",
            device_id: "mobile-device-123",
        }, "10.0.0.5", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"));
        expect(response.status).toBe(200);
        expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
            deviceId: "mobile-device-123",
        }));
    });
    it("generates device_id from user-agent when not provided", async () => {
        const { POST } = await Promise.resolve().then(() => __importStar(require("@/app/api/auth/login/route")));
        selectLimitMock.mockResolvedValue([
            {
                id: "user-123",
                email: "test@example.com",
                passwordHash: "hashed-password",
                role: "user",
            },
        ]);
        auth_1.comparePassword.mockResolvedValue(true);
        const response = await POST(makeRequest({ email: "test@example.com", password: "Password123!" }, "10.0.0.6", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"));
        expect(response.status).toBe(200);
        expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
            deviceId: expect.any(String),
        }));
    });
});
