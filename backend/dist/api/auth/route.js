"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const api_utils_1 = require("@/lib/api-utils");
async function POST(request) {
    try {
        const body = await request.json();
        return server_1.NextResponse.json({ message: "Auth route placeholder", data: body });
    }
    catch (error) {
        return (0, api_utils_1.createProblemDetails)("about:blank", "Bad Request", 400, "Invalid request");
    }
}
