"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const api_utils_1 = require("@/lib/api-utils");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const ALLOWED_TYPES = ["sent", "received", "all"];
const INTEGER_PARAM_REGEX = /^\d+$/;
const isValidPositiveInteger = (value) => INTEGER_PARAM_REGEX.test(value) && Number.parseInt(value, 10) >= 1;
async function GET(request) {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
    }
    const { searchParams } = request.nextUrl;
    const typeParam = (searchParams.get("type") ?? "all");
    const pageParam = searchParams.get("page") ?? "1";
    const limitParam = searchParams.get("limit") ?? "10";
    if (!ALLOWED_TYPES.includes(typeParam)) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "type must be one of: sent, received, all");
    }
    if (!isValidPositiveInteger(pageParam) ||
        !isValidPositiveInteger(limitParam)) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "page must be >= 1 and limit must be between 1 and 100");
    }
    const page = Number.parseInt(pageParam, 10);
    const limit = Number.parseInt(limitParam, 10);
    if (limit > 100) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "page must be >= 1 and limit must be between 1 and 100");
    }
    const whereClause = typeParam === "sent"
        ? (0, drizzle_orm_1.eq)(schema_1.gifts.senderId, userId)
        : typeParam === "received"
            ? (0, drizzle_orm_1.eq)(schema_1.gifts.recipientId, userId)
            : (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.gifts.senderId, userId), (0, drizzle_orm_1.eq)(schema_1.gifts.recipientId, userId));
    const [giftRows, [{ value: total }]] = await Promise.all([
        db_1.db.query.gifts.findMany({
            where: whereClause,
            limit,
            offset: (page - 1) * limit,
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.gifts.createdAt)],
            with: {
                sender: { columns: { id: true, name: true, email: true } },
                recipient: { columns: { id: true, name: true, email: true } },
            },
        }),
        db_1.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.gifts).where(whereClause),
    ]);
    const transactions = giftRows.map((gift) => {
        const counterparty = gift.senderId === userId
            ? gift.recipient
            : (gift.sender ?? {
                id: null,
                name: gift.senderName ?? "External Sender",
                email: gift.senderEmail ?? null,
            });
        return {
            id: gift.id,
            recipient: counterparty,
            amount: gift.amount,
            currency: gift.currency,
            status: gift.status,
            createdAt: gift.createdAt instanceof Date
                ? gift.createdAt.toISOString()
                : gift.createdAt,
        };
    });
    return (0, api_utils_1.paginatedResponse)(transactions, total, page, limit);
}
