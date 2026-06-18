"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGiftTransaction = processGiftTransaction;
exports.processGiftBankPayout = processGiftBankPayout;
exports.processRefundTransaction = processRefundTransaction;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const validation_1 = require("@/lib/validation");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
async function processGiftTransaction(params) {
    const { senderId, recipientId, amount, currency } = params;
    const normalizedCurrency = currency.toUpperCase();
    if (!(0, validation_1.validateCurrency)(normalizedCurrency)) {
        throw new Error("Unsupported currency. Accepted: NGN, USD");
    }
    const transactionId = `txn_${crypto_1.default.randomUUID()}`;
    if (senderId) {
        const senderWallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, senderId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, normalizedCurrency)),
        });
        if (!senderWallet || senderWallet.balance < amount) {
            throw new Error("Insufficient balance");
        }
        await db_1.db
            .update(schema_1.wallets)
            .set({
            balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} - ${amount}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, senderId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, normalizedCurrency)));
    }
    await db_1.db
        .insert(schema_1.wallets)
        .values({
        userId: recipientId,
        currency: normalizedCurrency,
        balance: amount,
    })
        .onConflictDoUpdate({
        target: [schema_1.wallets.userId, schema_1.wallets.currency],
        set: {
            balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} + ${amount}`,
            updatedAt: new Date(),
        },
    });
    return transactionId;
}
async function processGiftBankPayout(params) {
    const { senderId, amount, currency } = params;
    const normalizedCurrency = currency.toUpperCase();
    if (!(0, validation_1.validateCurrency)(normalizedCurrency)) {
        throw new Error("Unsupported currency. Accepted: NGN, USD");
    }
    const transactionId = `payout_${crypto_1.default.randomUUID()}`;
    if (senderId) {
        const senderWallet = await db_1.db.query.wallets.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, senderId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, normalizedCurrency)),
        });
        if (!senderWallet || senderWallet.balance < amount) {
            throw new Error("Insufficient balance");
        }
        await db_1.db
            .update(schema_1.wallets)
            .set({
            balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} - ${amount}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, senderId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, normalizedCurrency)));
    }
    return transactionId;
}
async function processRefundTransaction(params) {
    const { senderId, recipientId, amount, currency } = params;
    const transactionId = `txn_ref_${crypto_1.default.randomUUID()}`;
    const recipientWallet = await db_1.db.query.wallets.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, recipientId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, currency)),
    });
    if (!recipientWallet || recipientWallet.balance < amount) {
        throw new Error("Insufficient recipient balance for refund");
    }
    await db_1.db
        .update(schema_1.wallets)
        .set({
        balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} - ${amount}`,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, recipientId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, currency)));
    if (senderId) {
        await db_1.db
            .insert(schema_1.wallets)
            .values({
            userId: senderId,
            currency,
            balance: amount,
        })
            .onConflictDoUpdate({
            target: [schema_1.wallets.userId, schema_1.wallets.currency],
            set: {
                balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} + ${amount}`,
                updatedAt: new Date(),
            },
        });
    }
    return transactionId;
}
