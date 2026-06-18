"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const rate_limiter_1 = require("@/lib/rate-limiter");
const validation_1 = require("@/lib/validation");
const api_utils_1 = require("@/lib/api-utils");
const LOOKUP_RATE_LIMIT = 5;
const LOOKUP_RATE_WINDOW_MS = 60_000;
const LOOKUP_PHONE_RATE_LIMIT = 3;
const LOOKUP_PHONE_RATE_WINDOW_MS = 60_000;
const MAX_REQUEST_BODY_BYTES = 1024;
function getClientIp(request) {
    return (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        "127.0.0.1");
}
function splitNameParts(name) {
    if (!name) {
        return {
            first_name: null,
            last_name: null,
        };
    }
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return {
            first_name: null,
            last_name: null,
        };
    }
    return {
        first_name: parts[0] ?? null,
        last_name: parts.length > 1 ? parts[parts.length - 1] : null,
    };
}
async function POST(request) {
    try {
        const contentType = request.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid Content-Type. Expected application/json");
        }
        const contentLength = request.headers.get("content-length");
        if (contentLength &&
            Number.parseInt(contentLength, 10) > MAX_REQUEST_BODY_BYTES) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Payload Too Large", 413, "Request body too large");
        }
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin && host && !origin.includes(host)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Forbidden", 403, "CSRF protection: Invalid origin");
        }
        const ip = getClientIp(request);
        if ((0, rate_limiter_1.isRateLimited)(`lookup:${ip}`, LOOKUP_RATE_LIMIT, LOOKUP_RATE_WINDOW_MS)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many requests. Please try again later.");
        }
        const body = await request.json();
        const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber : undefined;
        if (!phoneNumber) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Phone number is required");
        }
        if (!(0, validation_1.validateE164PhoneNumber)(phoneNumber)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid phone number format. Please use E.164 format (e.g., +2348123456789)");
        }
        const sanitizedPhoneNumber = (0, validation_1.sanitizePhoneNumber)(phoneNumber);
        if ((0, rate_limiter_1.isRateLimited)(`lookup:${ip}:${sanitizedPhoneNumber}`, LOOKUP_PHONE_RATE_LIMIT, LOOKUP_PHONE_RATE_WINDOW_MS)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many requests. Please try again later.");
        }
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.phoneNumber, sanitizedPhoneNumber), (0, drizzle_orm_1.eq)(schema_1.users.status, "active")),
            columns: {
                name: true,
            },
        });
        if (!user) {
            return server_1.NextResponse.json({ success: true, data: null }, { status: 200 });
        }
        return server_1.NextResponse.json({
            success: true,
            data: splitNameParts(user.name),
        }, { status: 200 });
    }
    catch (error) {
        console.error("[USER_LOOKUP_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
