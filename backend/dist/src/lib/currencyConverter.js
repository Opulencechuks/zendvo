"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNgnToUsdcRate = getNgnToUsdcRate;
exports.convertNgnToUsdc = convertNgnToUsdc;
exports.clearCurrencyConverterCache = clearCurrencyConverterCache;
const DEFAULT_CONVERTER_API_URL = "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn";
const CACHE_TTL_MS = 10 * 60 * 1000;
let cachedRate = null;
let cacheUpdatedAt = 0;
function getConverterApiUrl() {
    return (process.env.CURRENCY_CONVERTER_API_URL || DEFAULT_CONVERTER_API_URL);
}
function isCacheValid() {
    return (cachedRate !== null &&
        cacheUpdatedAt > 0 &&
        Date.now() - cacheUpdatedAt < CACHE_TTL_MS);
}
function setCache(rate) {
    cachedRate = rate;
    cacheUpdatedAt = Date.now();
}
async function fetchUsdcPriceInNgn() {
    const apiUrl = getConverterApiUrl();
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Currency converter API returned ${response.status}: ${response.statusText}`);
    }
    const body = (await response.json());
    const price = body["usd-coin"]?.ngn;
    if (typeof price !== "number" || Number.isNaN(price) || price <= 0) {
        throw new Error("Currency converter API returned an invalid NGN price.");
    }
    return price;
}
async function getNgnToUsdcRate(forceRefresh = false) {
    if (!forceRefresh && isCacheValid() && cachedRate !== null) {
        return cachedRate;
    }
    const usdcPriceInNgn = await fetchUsdcPriceInNgn();
    const ngnToUsdcRate = 1 / usdcPriceInNgn;
    if (!Number.isFinite(ngnToUsdcRate) || ngnToUsdcRate <= 0) {
        throw new Error("Calculated NGN to USDC rate is invalid.");
    }
    setCache(ngnToUsdcRate);
    return ngnToUsdcRate;
}
async function convertNgnToUsdc(amountNgn, forceRefresh = false) {
    if (typeof amountNgn !== "number" || Number.isNaN(amountNgn)) {
        throw new TypeError("amountNgn must be a valid number.");
    }
    const rate = await getNgnToUsdcRate(forceRefresh);
    return amountNgn * rate;
}
function clearCurrencyConverterCache() {
    cachedRate = null;
    cacheUpdatedAt = 0;
}
