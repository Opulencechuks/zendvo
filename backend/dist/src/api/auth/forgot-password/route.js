"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const validation_1 = require("@/lib/validation");
const rate_limiter_1 = require("@/lib/rate-limiter");
const emailService_1 = require("@/server/services/emailService");
const crypto_1 = require("crypto");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    try {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
        if ((0, rate_limiter_1.isRateLimited)(ip, 3)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Too Many Requests", 429, "Too many requests. Please try again later.");
        }
        const body = await request.json();
        const { email } = body;
        if (!email) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Email is required");
        }
        const sanitizedEmail = (0, validation_1.sanitizeInput)(email);
        if (!(0, validation_1.validateEmail)(sanitizedEmail)) {
            return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid email format");
        }
        const user = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, sanitizedEmail),
        });
        if (user) {
            const token = (0, crypto_1.randomBytes)(32).toString("hex");
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await db_1.db.transaction(async (tx) => {
                await tx
                    .update(schema_1.passwordResets)
                    .set({ usedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.passwordResets.userId, user.id));
                await tx.insert(schema_1.passwordResets).values({
                    userId: user.id,
                    token,
                    expiresAt,
                    ipAddress: ip,
                });
            });
            (0, emailService_1.sendForgotPasswordEmail)(user.email, token, user.name || undefined).catch((err) => console.error("[FORGOT_PASSWORD_EMAIL_ERROR]", err));
            console.log(`[AUTH_AUDIT] Password reset requested for user: ${user.id} from IP: ${ip}`);
        }
        else {
            console.log(`[AUTH_AUDIT] Password reset requested for non-existent email: ${sanitizedEmail} from IP: ${ip}`);
        }
        return server_1.NextResponse.json({
            success: true,
            message: "If an account exists with that email, a password reset link has been sent.",
        }, { status: 200 });
    }
    catch (error) {
        console.error("[FORGOT_PASSWORD_ERROR]", error);
        return (0, api_utils_1.createProblemDetails)("about:blank", "Internal Server Error", 500, "Internal server error");
    }
}
