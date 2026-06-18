"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const currencyConverter_1 = require("@/lib/currencyConverter");
describe("currencyConverter utility", () => {
    const samplePrice = 1500;
    const sampleRate = 1 / samplePrice;
    const fakeResponse = {
        "usd-coin": {
            ngn: samplePrice,
        },
    };
    const originalFetch = global.fetch;
    beforeEach(() => {
        (0, currencyConverter_1.clearCurrencyConverterCache)();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => fakeResponse,
        });
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 0, 1));
    });
    afterEach(() => {
        jest.useRealTimers();
        global.fetch = originalFetch;
    });
    it("fetches and returns the NGN to USDC multiplier", async () => {
        const rate = await (0, currencyConverter_1.getNgnToUsdcRate)();
        expect(rate).toBeCloseTo(sampleRate, 12);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    it("caches the rate and avoids repeated API calls within the TTL", async () => {
        const firstRate = await (0, currencyConverter_1.getNgnToUsdcRate)();
        const secondRate = await (0, currencyConverter_1.getNgnToUsdcRate)();
        expect(firstRate).toBeCloseTo(sampleRate, 12);
        expect(secondRate).toBeCloseTo(sampleRate, 12);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    it("refreshes the cached rate after the TTL expires", async () => {
        await (0, currencyConverter_1.getNgnToUsdcRate)();
        expect(global.fetch).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(10 * 60 * 1000 + 1);
        await (0, currencyConverter_1.getNgnToUsdcRate)();
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    it("converts NGN amounts to USDC using the cached rate", async () => {
        const converted = await (0, currencyConverter_1.convertNgnToUsdc)(3000);
        expect(converted).toBeCloseTo(3000 * sampleRate, 12);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    it("throws when the amount is not a number", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await expect((0, currencyConverter_1.convertNgnToUsdc)("1000")).rejects.toThrow("amountNgn must be a valid number");
    });
});
