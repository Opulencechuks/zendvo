"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processWithdrawal = processWithdrawal;
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("@/lib/stripe/client");
const crypto_1 = __importDefault(require("crypto"));
async function processWithdrawal(params) {
    const { userId, amount, currency, bankAccountId } = params;
    const normalizedCurrency = currency.toUpperCase();
    // Validate amount
    if (amount <= 0) {
        throw new Error("Withdrawal amount must be greater than 0");
    }
    // Find the wallet
    const wallet = await db_1.db.query.wallets.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.userId, userId), (0, drizzle_orm_1.eq)(schema_1.wallets.currency, normalizedCurrency)),
    });
    if (!wallet) {
        throw new Error("Wallet not found for this currency");
    }
    if (wallet.balance < amount) {
        throw new Error("Insufficient balance");
    }
    // Find the bank account
    const bankAccount = await db_1.db.query.bankAccounts.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bankAccounts.id, bankAccountId), (0, drizzle_orm_1.eq)(schema_1.bankAccounts.userId, userId)),
    });
    if (!bankAccount) {
        throw new Error("Bank account not found or does not belong to user");
    }
    // Deduct from wallet and create pending transaction
    // Using a database transaction to ensure atomicity
    const withdrawalTx = await db_1.db.transaction(async (tx) => {
        // 1. Deduct balance
        const updatedWallet = await tx
            .update(schema_1.wallets)
            .set({
            balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} - ${amount}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wallets.id, wallet.id), (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} >= ${amount}`))
            .returning();
        if (updatedWallet.length === 0) {
            throw new Error("Insufficient balance or concurrency error");
        }
        // 2. Create pending transaction record
        const [transactionRecord] = await tx
            .insert(schema_1.transactions)
            .values({
            userId,
            walletId: wallet.id,
            type: "withdrawal",
            status: "pending",
            amount,
            currency: normalizedCurrency,
            reference: `WD_${crypto_1.default.randomUUID()}`,
        })
            .returning();
        return transactionRecord;
    });
    try {
        // Attempt the payout via Stripe
        // If the bank account has an associated Stripe Connect ID, we would use it.
        // For now, we assume swiftBic or accountNumber holds some ID or we just trigger the payout.
        // Replace `bankAccount.accountNumber` with actual Stripe Connect destination ID if available.
        // Note: If the platform uses standard payouts to its own bank account, destinationAccountId is omitted.
        // For connected accounts, we use it. We'll pass it if applicable.
        // As a placeholder, we use `createPayout`
        const payoutResult = await (0, client_1.createPayout)({
            amount,
            currency,
            destinationAccountId: undefined, // Update this if you have the Connect account ID
        });
        // Update transaction provider reference
        await db_1.db
            .update(schema_1.transactions)
            .set({
            provider: "stripe",
            reference: payoutResult.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.transactions.id, withdrawalTx.id));
        return {
            success: true,
            transaction: withdrawalTx,
        };
    }
    catch (error) {
        // If payout fails, we might want to refund the wallet and mark transaction as failed
        // For now, we just mark it as failed and re-throw
        await db_1.db.transaction(async (tx) => {
            // Refund the wallet
            await tx
                .update(schema_1.wallets)
                .set({
                balance: (0, drizzle_orm_1.sql) `${schema_1.wallets.balance} + ${amount}`,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.wallets.id, wallet.id));
            // Mark transaction as failed
            await tx
                .update(schema_1.transactions)
                .set({
                status: "failed",
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.transactions.id, withdrawalTx.id));
        });
        throw new Error(`Withdrawal failed: ${error.message}`);
    }
}
