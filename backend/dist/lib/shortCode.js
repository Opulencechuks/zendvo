"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueShortCode = generateUniqueShortCode;
const nanoid_1 = require("nanoid");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SHORT_CODE_LENGTH = 8;
const MAX_RETRIES = 5;
const generateRawShortCode = (0, nanoid_1.customAlphabet)(ALPHABET, SHORT_CODE_LENGTH);
async function generateUniqueShortCode() {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const shortCode = generateRawShortCode();
        const existing = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.shortCode, shortCode),
            columns: { id: true },
        });
        if (!existing)
            return shortCode;
    }
    throw new Error("Failed to generate unique short code after maximum retries");
}
