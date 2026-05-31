import crypto from "crypto";

export const paystackConfig = {
  baseUrl: "https://api.paystack.co",
  secretKey: process.env.PAYSTACK_SECRET_KEY,
};

export const verifyBankAccount = async (
  accountNumber: string,
  bankCode: string,
) => {
  return {
    success: true,
    status: "mock_verified",
    name: "Zendvo Recipient",
    accountNumber,
    bankCode,
  };
};

export const initiateBankPayout = async (options: {
  bankAccountNumber: string;
  bankCode: string;
  amount: number;
  currency: string;
  recipientName: string;
}) => {
  const payoutReference = `payout_${crypto.randomUUID()}`;

  return {
    success: true,
    payoutReference,
    status: "pending",
  };
};

export const verifyPayment = async (reference: string) => {
  if (!paystackConfig.secretKey) {
    throw new Error("Paystack secret key is not configured");
  }

  if (!reference) {
    throw new Error("Payment reference is required");
  }

  try {
    const response = await fetch(
      `${paystackConfig.baseUrl}/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackConfig.secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Paystack API error: ${response.status}`
      );
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
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
    throw new Error("Payment verification failed: Unknown error");
  }
};


export const isPaymentSuccessful = (status: string): boolean => {
  return status === "success";
};
