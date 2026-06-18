"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const fees_1 = require("@/lib/fees");
const api_utils_1 = require("@/lib/api-utils");
async function GET(request, { params }) {
    try {
        const { giftId } = await params;
        const gift = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.id, giftId),
            columns: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                amount: true,
                currency: true,
                message: true,
                senderName: true,
                hideAmount: true,
                hideSender: true,
                unlockDatetime: true,
                linkExpiresAt: true,
                isAnonymous: true,
            },
            with: {
                recipient: { columns: { id: true, name: true, email: true } },
                sender: { columns: { name: true } },
            },
        });
        if (!gift) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, "Gift not found");
        }
        if (gift.linkExpiresAt && new Date(gift.linkExpiresAt) < new Date()) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Gone", 410, "This gift link has expired");
        }
        if (gift.status !== "pending_review") {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Gift is not in pending_review status");
        }
        const processingFee = (0, fees_1.calculateProcessingFee)(gift.amount);
        const totalAmount = gift.amount + processingFee;
        return server_1.NextResponse.json({
            success: true,
            data: {
                recipient: {
                    id: gift.recipient?.id,
                    name: gift.recipient?.name,
                    email: gift.recipient?.email,
                },
                amount: gift.amount,
                currency: gift.currency,
                processingFee,
                totalAmount,
                privacySettings: {
                    hideAmount: gift.hideAmount,
                    hideSender: gift.hideSender,
                },
                unlockDatetime: gift.unlockDatetime
                    ? gift.unlockDatetime.toISOString()
                    : null,
                message: gift.message,
                senderName: gift.sender?.name ?? gift.senderName ?? null,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching gift summary:", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
