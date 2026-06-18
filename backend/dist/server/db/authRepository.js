"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserByPhoneNumber = findUserByPhoneNumber;
exports.createUser = createUser;
exports.findPasswordResetByToken = findPasswordResetByToken;
exports.completePasswordReset = completePasswordReset;
exports.findRefreshToken = findRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllUserRefreshTokens = revokeAllUserRefreshTokens;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const validation_1 = require("@/lib/validation");
async function findUserByEmail(email) {
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
    });
    if (!user)
        return null;
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
    };
}
async function findUserByPhoneNumber(phoneNumber) {
    const normalizedPhone = (0, validation_1.sanitizePhoneNumber)(phoneNumber);
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.phoneNumber, normalizedPhone),
    });
    if (!user)
        return null;
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
    };
}
async function createUser(input) {
    const normalizedPhoneNumber = input.phoneNumber
        ? (0, validation_1.sanitizePhoneNumber)(input.phoneNumber)
        : null;
    const [user] = await db_1.db
        .insert(schema_1.users)
        .values({
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name ?? null,
        phoneNumber: normalizedPhoneNumber,
        role: "user",
        status: "unverified",
        loginAttempts: 0,
        lockUntil: null,
    })
        .returning();
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
    };
}
async function findPasswordResetByToken(token) {
    const record = await db_1.db.query.passwordResets.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.passwordResets.token, token),
        with: {
            user: true,
        },
    });
    if (!record) {
        return null;
    }
    return {
        id: record.id,
        userId: record.userId,
        expiresAt: record.expiresAt,
        usedAt: record.usedAt,
        user: {
            email: record.user.email,
            name: record.user.name,
        },
    };
}
async function completePasswordReset(input) {
    const now = new Date();
    await db_1.db
        .update(schema_1.users)
        .set({
        passwordHash: input.passwordHash,
        updatedAt: now,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId));
    await db_1.db
        .update(schema_1.passwordResets)
        .set({ usedAt: now })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.passwordResets.id, input.resetId), (0, drizzle_orm_1.eq)(schema_1.passwordResets.userId, input.userId)));
    await db_1.db.delete(schema_1.refreshTokens).where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.userId, input.userId));
}
async function findRefreshToken(token) {
    return await db_1.db.query.refreshTokens.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.refreshTokens.token, token),
    });
}
async function revokeRefreshToken(tokenId) {
    await db_1.db
        .update(schema_1.refreshTokens)
        .set({ revokedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.id, tokenId));
}
async function revokeAllUserRefreshTokens(userId) {
    await db_1.db
        .update(schema_1.refreshTokens)
        .set({ revokedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.refreshTokens.userId, userId));
}
