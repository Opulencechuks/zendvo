"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueSlug = generateUniqueSlug;
const nanoid_1 = require("nanoid");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SLUG_LENGTH = 6;
const MAX_RETRIES = 5;
const generateRawSlug = (0, nanoid_1.customAlphabet)(ALPHABET, SLUG_LENGTH);
async function generateUniqueSlug() {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const slug = generateRawSlug();
        const existing = await db_1.db.query.gifts.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.gifts.slug, slug),
            columns: { id: true },
        });
        if (!existing)
            return slug;
    }
    throw new Error("Failed to generate unique slug after maximum retries");
}
