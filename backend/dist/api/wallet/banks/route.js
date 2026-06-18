"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const schema_1 = require("@/lib/db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_session_1 = require("@/lib/auth-session");
const bank_1 = require("@/lib/validations/bank");
const maskAccountNumber = (accountNumber) => accountNumber.length > 4 ? `****${accountNumber.slice(-4)}` : "****";
async function GET(req) {
    try {
        const payload = await (0, auth_session_1.getAuthPayload)(req);
        if (!payload?.userId) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const accounts = await db_1.db.query.bankAccounts.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.bankAccounts.userId, payload.userId),
            columns: {
                id: true,
                country: true,
                currency: true,
                swiftBic: true,
                accountNumber: true,
                createdAt: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.bankAccounts.createdAt)],
        });
        return server_1.NextResponse.json({
            success: true,
            bankAccounts: accounts.map((account) => ({
                id: account.id,
                country: account.country,
                currency: account.currency,
                swiftBic: account.swiftBic,
                accountNumber: maskAccountNumber(account.accountNumber),
                createdAt: account.createdAt,
            })),
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching bank accounts:", error);
        return server_1.NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
async function POST(req) {
    try {
        const payload = await (0, auth_session_1.getAuthPayload)(req);
        if (!payload?.userId) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const validationResult = bank_1.addBankAccountSchema.safeParse(body);
        if (!validationResult.success) {
            return server_1.NextResponse.json({ error: "Invalid payload", details: validationResult.error.format() }, { status: 400 });
        }
        const data = validationResult.data;
        // Mask account number for response
        const maskedAccountNumber = data.accountNumber.length > 4
            ? "****" + data.accountNumber.slice(-4)
            : "****";
        const [bankAccount] = await db_1.db
            .insert(schema_1.bankAccounts)
            .values({
            userId: payload.userId,
            country: data.country,
            currency: data.currency,
            swiftBic: data.swiftBic,
            accountNumber: data.accountNumber,
        })
            .returning();
        return server_1.NextResponse.json({
            message: "Bank account added successfully",
            bankAccount: {
                id: bankAccount.id,
                country: bankAccount.country,
                currency: bankAccount.currency,
                swiftBic: bankAccount.swiftBic,
                accountNumber: maskedAccountNumber,
                createdAt: bankAccount.createdAt,
            },
        }, { status: 201 });
    }
    catch (error) {
        console.error("Error adding bank account:", error);
        return server_1.NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
