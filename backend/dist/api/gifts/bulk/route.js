"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const api_utils_1 = require("@/lib/api-utils");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const validation_1 = require("@/lib/validation");
const slug_1 = require("@/lib/slug");
const shortCode_1 = require("@/lib/shortCode");
const zod_1 = require("zod");
const BulkGiftRequestSchema = zod_1.z.object({
    gifts: zod_1.z.array(validation_1.CreateGiftSchema).min(1, "Minimum 1 gift required").max(50, "Maximum 50 gifts allowed in one bulk request"),
});
async function POST(request) {
    try {
        const userId = request.headers.get("x-user-id");
        const userEmail = request.headers.get("x-user-email");
        if (!userId || !userEmail) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unauthorized", 401, "Unauthorized");
        }
        const body = await request.json();
        const validationResult = BulkGiftRequestSchema.safeParse(body);
        if (!validationResult.success) {
            const firstError = validationResult.error.issues[0];
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, firstError.message);
        }
        const { gifts: requestedGifts } = validationResult.data;
        const recipientIds = [...new Set(requestedGifts.map((g) => g.recipient))];
        if (recipientIds.includes(userId)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Unprocessable Entity", 422, "Cannot send gifts to yourself");
        }
        const foundRecipients = await db_1.db.query.users.findMany({
            where: (0, drizzle_orm_1.inArray)(schema_1.users.id, recipientIds),
            columns: { id: true, name: true, email: true },
        });
        if (foundRecipients.length !== recipientIds.length) {
            const foundIds = foundRecipients.map((r) => r.id);
            const missingIds = recipientIds.filter((id) => !foundIds.includes(id));
            return (0, api_utils_1.createProblemDetails)("about:blank", "Not Found", 404, `Some recipients not found: ${missingIds.join(", ")}`);
        }
        const recipientMap = new Map(foundRecipients.map((r) => [r.id, r]));
        const createdGifts = await db_1.db.transaction(async (tx) => {
            const giftRecords = [];
            for (const giftInput of requestedGifts) {
                const sanitizedMessage = giftInput.message ? (0, validation_1.sanitizeInput)(giftInput.message) : null;
                const sanitizedTemplate = giftInput.template ? (0, validation_1.sanitizeInput)(giftInput.template) : null;
                const sanitizedCoverImageId = giftInput.coverImageId ? (0, validation_1.sanitizeInput)(String(giftInput.coverImageId)) : null;
                const utcUnlockDatetime = giftInput.unlock_at ? (0, validation_1.convertToUTCDate)(giftInput.unlock_at) : null;
                const slug = await (0, slug_1.generateUniqueSlug)();
                const shortCode = await (0, shortCode_1.generateUniqueShortCode)();
                giftRecords.push({
                    senderId: userId,
                    recipientId: giftInput.recipient,
                    amount: giftInput.amount,
                    currency: giftInput.currency,
                    message: sanitizedMessage,
                    template: sanitizedTemplate,
                    coverImageId: sanitizedCoverImageId,
                    unlockDatetime: utcUnlockDatetime,
                    status: "pending_otp",
                    slug,
                    shortCode,
                    totalAmount: giftInput.amount,
                });
            }
            return await tx.insert(schema_1.gifts).values(giftRecords).returning();
        });
        console.log(`[BULK_GIFT] Created ${createdGifts.length} gifts for sender ${userId}`);
        return server_1.NextResponse.json({
            success: true,
            count: createdGifts.length,
            gifts: createdGifts.map((g) => ({
                id: g.id,
                slug: g.slug,
                shortCode: g.shortCode,
                recipientId: g.recipientId,
            })),
            message: "Bulk gifts created successfully. Please proceed to payment for each.",
        }, { status: 201 });
    }
    catch (error) {
        console.error("[BULK_GIFT_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error while creating bulk gifts");
    }
}
