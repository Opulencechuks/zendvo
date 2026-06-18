"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("next/server");
const route_1 = require("@/app/api/gifts/public/[giftId]/confirm/route");
const db_1 = require("@/lib/db");
jest.mock("@/lib/db", () => ({
    db: {
        query: {
            gifts: {
                findFirst: jest.fn(),
            },
        },
        update: jest.fn(() => ({
            set: jest.fn(() => ({
                where: jest.fn(() => Promise.resolve()),
            })),
        })),
    },
}));
jest.mock("@/server/services/transactionService", () => ({
    processGiftTransaction: jest.fn(() => Promise.resolve("txn_mock-uuid-1234")),
}));
jest.mock("@/server/services/notificationService", () => ({
    notifyGiftConfirmed: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/server/services/emailService", () => ({
    sendGiftCompletionToSender: jest.fn(() => Promise.resolve({ success: true })),
    sendGiftNotificationToRecipient: jest.fn(() => Promise.resolve({ success: true })),
}));
jest.mock("@/lib/tokens", () => ({
    generateShareLinkToken: jest.fn(() => "mock-share-token-1234"),
}));
jest.mock("@/lib/paystack/api", () => ({
    verifyPayment: jest.fn(() => Promise.resolve({
        success: true,
        status: "success",
        reference: "paystack-ref-123",
        amount: 100,
        currency: "NGN",
        paidAt: "2024-01-01T00:00:00Z",
    })),
    isPaymentSuccessful: jest.fn((status) => status === "success"),
}));
jest.mock("@/lib/stripe/client", () => ({
    verifyPayment: jest.fn(() => Promise.resolve({
        success: true,
        status: "succeeded",
        reference: "pi_stripe_123",
        amount: 100,
        currency: "USD",
        paidAt: "2024-01-01T00:00:00Z",
    })),
    isPaymentSuccessful: jest.fn((status) => status === "succeeded"),
}));
const mockGift = {
    id: "gift-123",
    slug: "mock-slug-1234",
    senderId: "sender-123",
    recipientId: "recipient-456",
    amount: 100,
    currency: "USD",
    status: "pending_review",
    transactionId: null,
    message: "Happy Birthday!",
    template: "birthday",
    senderName: "John Sender",
    senderEmail: "sender@example.com",
    shareLink: null,
    shareLinkToken: null,
    completedAt: null,
    unlockDatetime: null,
    sender: {
        id: "sender-123",
        name: "John Sender",
        email: "sender@example.com",
    },
    recipient: {
        id: "recipient-456",
        name: "Jane Recipient",
        email: "recipient@example.com",
    },
};
function makeRequest(giftId) {
    return new server_1.NextRequest(`http://localhost/api/gifts/public/${giftId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
    });
}
describe("POST /api/gifts/public/:giftId/confirm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const { processGiftTransaction } = jest.requireMock("@/server/services/transactionService");
        processGiftTransaction.mockResolvedValue("txn_mock-uuid-1234");
    });
    it("should return 200 with status completed and shareLink on success", async () => {
        db_1.db.query.gifts.findFirst.mockResolvedValue(mockGift);
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.status).toBe("completed");
        expect(data.shareLink).toBe("/g/mock-slug-1234");
        expect(data.transactionId).toBe("txn_mock-uuid-1234");
    });
    it("should return 404 if gift does not exist", async () => {
        db_1.db.query.gifts.findFirst.mockResolvedValue(null);
        const request = makeRequest("nonexistent-gift");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "nonexistent-gift" }),
        });
        expect(response.status).toBe(404);
    });
    it("should return 409 if gift has already been confirmed", async () => {
        db_1.db.query.gifts.findFirst.mockResolvedValue({
            ...mockGift,
            status: "completed",
        });
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        expect(response.status).toBe(409);
    });
    it("should return 400 if gift status is not pending_review", async () => {
        db_1.db.query.gifts.findFirst.mockResolvedValue({
            ...mockGift,
            status: "pending_otp",
        });
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        expect(response.status).toBe(400);
    });
    it("should return 422 if insufficient balance", async () => {
        db_1.db.query.gifts.findFirst.mockResolvedValue(mockGift);
        const { processGiftTransaction } = jest.requireMock("@/server/services/transactionService");
        processGiftTransaction.mockRejectedValue(new Error("Insufficient balance"));
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        expect(response.status).toBe(422);
    });
    it("should return 500 on internal server error", async () => {
        db_1.db.query.gifts.findFirst.mockRejectedValue(new Error("Database connection failed"));
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        expect(response.status).toBe(500);
    });
    it("should verify Paystack payment before confirming gift", async () => {
        const giftWithPayment = {
            ...mockGift,
            paymentReference: "paystack-ref-123",
            paymentProvider: "paystack",
        };
        db_1.db.query.gifts.findFirst.mockResolvedValue(giftWithPayment);
        const { verifyPayment } = jest.requireMock("@/lib/paystack/api");
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(verifyPayment).toHaveBeenCalledWith("paystack-ref-123");
    });
    it("should verify Stripe payment before confirming gift", async () => {
        const giftWithPayment = {
            ...mockGift,
            paymentReference: "pi_stripe_123",
            paymentProvider: "stripe",
        };
        db_1.db.query.gifts.findFirst.mockResolvedValue(giftWithPayment);
        const { verifyPayment } = jest.requireMock("@/lib/stripe/client");
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(verifyPayment).toHaveBeenCalledWith("pi_stripe_123");
    });
    it("should return 402 if Paystack payment verification fails", async () => {
        const giftWithPayment = {
            ...mockGift,
            paymentReference: "paystack-ref-123",
            paymentProvider: "paystack",
        };
        db_1.db.query.gifts.findFirst.mockResolvedValue(giftWithPayment);
        const { verifyPayment, isPaymentSuccessful } = jest.requireMock("@/lib/paystack/api");
        verifyPayment.mockResolvedValueOnce({
            success: true,
            status: "failed",
            reference: "paystack-ref-123",
            amount: 100,
            currency: "NGN",
        });
        isPaymentSuccessful.mockReturnValueOnce(false);
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();
        expect(response.status).toBe(402);
        expect(data.detail).toBeDefined();
        expect(data.detail).toContain("Payment verification failed");
    });
    it("should return 402 if Stripe payment verification fails", async () => {
        const giftWithPayment = {
            ...mockGift,
            paymentReference: "pi_stripe_123",
            paymentProvider: "stripe",
        };
        db_1.db.query.gifts.findFirst.mockResolvedValue(giftWithPayment);
        const { verifyPayment, isPaymentSuccessful } = jest.requireMock("@/lib/stripe/client");
        verifyPayment.mockResolvedValueOnce({
            success: true,
            status: "requires_payment_method",
            reference: "pi_stripe_123",
            amount: 100,
            currency: "USD",
        });
        isPaymentSuccessful.mockReturnValueOnce(false);
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();
        expect(response.status).toBe(402);
        expect(data.detail).toBeDefined();
        expect(data.detail).toContain("Payment verification failed");
    });
    it("should return 400 for unsupported payment provider", async () => {
        const giftWithPayment = {
            ...mockGift,
            paymentReference: "unknown-ref-123",
            paymentProvider: "unknown",
        };
        db_1.db.query.gifts.findFirst.mockResolvedValue(giftWithPayment);
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.detail).toBeDefined();
        expect(data.detail).toBe("Unsupported payment provider");
    });
    it("should return 402 if payment verification throws an error", async () => {
        const giftWithPayment = {
            ...mockGift,
            paymentReference: "paystack-ref-123",
            paymentProvider: "paystack",
        };
        db_1.db.query.gifts.findFirst.mockResolvedValue(giftWithPayment);
        const { verifyPayment } = jest.requireMock("@/lib/paystack/api");
        verifyPayment.mockRejectedValueOnce(new Error("Network error"));
        const request = makeRequest("gift-123");
        const response = await (0, route_1.POST)(request, {
            params: Promise.resolve({ giftId: "gift-123" }),
        });
        const data = await response.json();
        expect(response.status).toBe(402);
        expect(data.detail).toBeDefined();
        expect(data.detail).toContain("Payment verification failed");
    });
});
