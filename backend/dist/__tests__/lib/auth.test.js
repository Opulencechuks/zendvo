"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("@/lib/auth");
describe("auth role to account-type mapping", () => {
    it("maps Sender role to Sender account type", () => {
        expect((0, auth_1.getAccountTypeFromRole)("Sender")).toBe("Sender");
    });
    it("maps Recipient role to Recipient account type", () => {
        expect((0, auth_1.getAccountTypeFromRole)("Recipient")).toBe("Recipient");
    });
    it("maps lowercase role values", () => {
        expect((0, auth_1.getAccountTypeFromRole)("sender")).toBe("Sender");
        expect((0, auth_1.getAccountTypeFromRole)("recipient")).toBe("Recipient");
    });
    it("returns null for unsupported roles", () => {
        expect((0, auth_1.getAccountTypeFromRole)("Admin")).toBeNull();
        expect((0, auth_1.getAccountTypeFromRole)("user")).toBeNull();
    });
    it("returns null when role is empty", () => {
        expect((0, auth_1.getAccountTypeFromRole)(undefined)).toBeNull();
        expect((0, auth_1.getAccountTypeFromRole)(null)).toBeNull();
        expect((0, auth_1.getAccountTypeFromRole)("")).toBeNull();
    });
});
