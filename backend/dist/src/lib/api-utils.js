"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginatedResponse = paginatedResponse;
exports.createProblemDetails = createProblemDetails;
const server_1 = require("next/server");
function paginatedResponse(data, total, page, limit) {
    return server_1.NextResponse.json({ data, total, page, limit });
}
function createProblemDetails(type, title, status, detail, instance, additionalData) {
    const payload = {
        type,
        title,
        status,
        detail,
        ...(instance ? { instance } : {}),
        ...additionalData,
    };
    return server_1.NextResponse.json(payload, {
        status,
        headers: { "Content-Type": "application/problem+json" },
    });
}
