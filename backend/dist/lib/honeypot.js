"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHoneypot = validateHoneypot;
function validateHoneypot(body) {
    const honeypotValue = body.website;
    return (honeypotValue === undefined ||
        honeypotValue === null ||
        honeypotValue === "");
}
