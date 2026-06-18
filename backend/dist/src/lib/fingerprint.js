"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFingerprint = computeFingerprint;
async function computeFingerprint(userAgent, ip) {
    const input = userAgent ? `${userAgent}|${ip}` : ip;
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
