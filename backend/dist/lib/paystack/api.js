"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPaymentSuccessful = exports.verifyPayment = exports.initiateBankPayout = exports.verifyBankAccount = exports.paystackConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
exports.paystackConfig = {
    baseUrl: "https://api.paystack.co",
    secretKey: process.env.PAYSTACK_SECRET_KEY,
};
const verifyBankAccount = async (accountNumber, bankCode) => {
    return {
        success: true,
        status: "mock_verified",
        name: "Zendvo Recipient",
        accountNumber,
        bankCode,
    };
};
exports.verifyBankAccount = verifyBankAccount;
const initiateBankPayout = async (options) => {
    const payoutReference = `payout_${crypto_1.default.randomUUID()}`;
    return {
        success: true,
        payoutReference,
        status: "pending",
    };
};
exports.initiateBankPayout = initiateBankPayout;
const verifyPayment = async (reference) => {
    if (!exports.paystackConfig.secretKey) {
        throw new Error("Paystack secret key is not configured");
    }
    if (!reference) {
        throw new Error("Payment reference is required");
    }
    try {
        const response = await fetch(`${exports.paystackConfig.baseUrl}/transaction/verify/${reference}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${exports.paystackConfig.secretKey}`,
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Paystack API error: ${response.status}`);
        }
        const data = await response.json();
        if (!data.status) {
            throw new Error(data.message || "Payment verification failed");
        }
        const transaction = data.data;
        return {
            success: true,
            status: transaction.status,
            reference: transaction.reference,
            amount: transaction.amount / 100,
            currency: transaction.currency,
            paidAt: transaction.paid_at,
            gatewayResponse: transaction.gateway_response,
            metadata: transaction.metadata,
        };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Payment verification failed: ${error.message}`);
        }
        throw new Error("Payment verification failed: Unknown error");
    }
};
exports.verifyPayment = verifyPayment;
const isPaymentSuccessful = (status) => {
    return status === "success";
};
exports.isPaymentSuccessful = isPaymentSuccessful;
