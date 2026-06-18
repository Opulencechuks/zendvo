"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthPayload = getAuthPayload;
const tokens_1 = require("@/lib/tokens");
async function getAuthPayload(request) {
    const header = request.headers.get("authorization") ||
        request.headers.get("Authorization");
    if (!header) {
        return null;
    }
    const [scheme, token] = header.split(" ");
    if (!token || scheme.toLowerCase() !== "bearer") {
        return null;
    }
    return await (0, tokens_1.verifyAccessToken)(token);
}
