"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const withdrawalService_1 = require("@/server/services/withdrawalService");
const auth_session_1 = require("@/lib/auth-session");
async function POST(req) {
    try {
        const payload = await (0, auth_session_1.getAuthPayload)(req);
        const userId = payload?.userId;
        if (!userId) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { amount, currency, bankAccountId } = body;
        if (!amount || typeof amount !== "number" || amount <= 0) {
            return server_1.NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
        }
        if (!currency || typeof currency !== "string") {
            return server_1.NextResponse.json({ error: "Currency is required" }, { status: 400 });
        }
        if (!bankAccountId || typeof bankAccountId !== "string") {
            return server_1.NextResponse.json({ error: "Bank account ID is required" }, { status: 400 });
        }
        const result = await (0, withdrawalService_1.processWithdrawal)({
            userId,
            amount,
            currency,
            bankAccountId,
        });
        return server_1.NextResponse.json(result, { status: 200 });
    }
    catch (error) {
        console.error("Withdrawal API error:", error);
        return server_1.NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
