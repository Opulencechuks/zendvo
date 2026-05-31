import { NextRequest } from "next/server";
import { POST } from "@/app/api/gifts/public/[giftId]/claim/route";
import { db } from "@/lib/db";

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
  processGiftTransaction: jest.fn(() => Promise.resolve("txn_mock_wallet_123")),
  processGiftBankPayout: jest.fn(() => Promise.resolve("payout_txn_mock_123")),
}));

jest.mock("@/server/services/notificationService", () => ({
  notifyGiftConfirmed: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/server/services/emailService", () => ({
  sendGiftCompletionToSender: jest.fn(() => Promise.resolve({ success: true })),
  sendGiftNotificationToRecipient: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock("@/lib/paystack/api", () => ({
  verifyBankAccount: jest.fn(() =>
    Promise.resolve({ success: true, status: "mock_verified", name: "Verified Recipient" }),
  ),
  initiateBankPayout: jest.fn(() =>
    Promise.resolve({ success: true, payoutReference: "payout-ref-123" }),
  ),
  verifyPayment: jest.fn(() =>
    Promise.resolve({
      success: true,
      status: "success",
      reference: "paystack-ref-123",
      amount: 100,
      currency: "NGN",
      paidAt: "2026-01-01T00:00:00Z",
    }),
  ),
  isPaymentSuccessful: jest.fn((status: string) => status === "success"),
}));

const mockGift = {
  id: "gift-123",
  slug: "mock-slug-1234",
  senderId: null,
  recipientId: "recipient-456",
  amount: 100,
  currency: "NGN",
  status: "pending_review",
  message: "You deserve this!",
  senderName: "John Sender",
  senderEmail: "sender@example.com",
  sender: null,
  recipient: {
    id: "recipient-456",
    name: "Jane Recipient",
    email: "recipient@example.com",
  },
};

function makeRequest(giftId: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/gifts/public/${giftId}/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gifts/public/:giftId/claim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should claim a gift to Zendvo wallet successfully", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);

    const request = makeRequest("gift-123", { destinationType: "wallet" });
    const response = await POST(request, {
      params: Promise.resolve({ giftId: "gift-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.destinationType).toBe("wallet");
    expect(data.transactionId).toBe("txn_mock_wallet_123");
    expect(data.shareLink).toBe("/g/mock-slug-1234");
  });

  it("should claim a gift and initiate bank payout successfully", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);

    const request = makeRequest("gift-123", {
      destinationType: "bank",
      bankAccountNumber: "0123456789",
      bankCode: "058",
    });
    const response = await POST(request, {
      params: Promise.resolve({ giftId: "gift-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.destinationType).toBe("bank");
    expect(data.transactionId).toBe("payout-ref-123");
    expect(data.shareLink).toBe("/g/mock-slug-1234");
  });

  it("should return 400 when bank details are missing for bank destination", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(mockGift);

    const request = makeRequest("gift-123", {
      destinationType: "bank",
    });
    const response = await POST(request, {
      params: Promise.resolve({ giftId: "gift-123" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toContain("Bank account number and bank code are required");
  });

  it("should return 400 when recipientId is missing for wallet destination", async () => {
    const giftWithoutRecipient = { ...mockGift, recipientId: null };
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(giftWithoutRecipient);

    const request = makeRequest("gift-123", { destinationType: "wallet" });
    const response = await POST(request, {
      params: Promise.resolve({ giftId: "gift-123" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toContain("Recipient ID is required to claim funds to a Zendvo wallet");
  });

  it("should return 404 if the gift does not exist", async () => {
    (db.query.gifts.findFirst as jest.Mock).mockResolvedValue(null);

    const request = makeRequest("gift-unknown", { destinationType: "wallet" });
    const response = await POST(request, {
      params: Promise.resolve({ giftId: "gift-unknown" }),
    });

    expect(response.status).toBe(404);
  });
});
