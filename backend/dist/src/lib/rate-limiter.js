"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRateLimitStatusForKey = exports.getRateLimitRemaining = exports.isRateLimited = exports.consumeRateLimit = void 0;
const store = {};
function getRateLimitStatus(key, limit, windowMs) {
    const now = Date.now();
    const entry = store[key];
    if (!entry || now - entry.startTime > windowMs) {
        return {
            key,
            count: 0,
            limit,
            windowMs,
            remaining: limit,
            resetMs: windowMs,
            limited: false,
        };
    }
    const elapsed = now - entry.startTime;
    const resetMs = windowMs - elapsed;
    const remaining = Math.max(0, limit - entry.count);
    return {
        key,
        count: entry.count,
        limit,
        windowMs,
        remaining,
        resetMs,
        limited: entry.count >= limit,
    };
}
function consumeRateLimitInternal(key, limit = 5, windowMs = 3600000) {
    const now = Date.now();
    const entry = store[key];
    if (!entry || now - (entry?.startTime ?? 0) > windowMs) {
        store[key] = { count: 1, startTime: now };
        return {
            key,
            count: 1,
            limit,
            windowMs,
            remaining: Math.max(0, limit - 1),
            resetMs: windowMs,
            limited: 1 > limit,
        };
    }
    entry.count += 1;
    const elapsed = now - entry.startTime;
    const resetMs = windowMs - elapsed;
    const remaining = Math.max(0, limit - entry.count);
    return {
        key,
        count: entry.count,
        limit,
        windowMs,
        remaining,
        resetMs,
        limited: entry.count > limit,
    };
}
const consumeRateLimit = (key, limit = 5, windowMs = 3600000) => {
    return consumeRateLimitInternal(key, limit, windowMs);
};
exports.consumeRateLimit = consumeRateLimit;
const isRateLimited = (key, limit = 5, windowMs = 3600000) => {
    const status = consumeRateLimitInternal(key, limit, windowMs);
    return status.limited;
};
exports.isRateLimited = isRateLimited;
const getRateLimitRemaining = (key, limit = 5, windowMs = 3600000) => {
    return getRateLimitStatus(key, limit, windowMs).remaining;
};
exports.getRateLimitRemaining = getRateLimitRemaining;
const getRateLimitStatusForKey = (key, limit = 5, windowMs = 3600000) => {
    return getRateLimitStatus(key, limit, windowMs);
};
exports.getRateLimitStatusForKey = getRateLimitStatusForKey;
