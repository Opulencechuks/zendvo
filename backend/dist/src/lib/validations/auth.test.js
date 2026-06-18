"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("./auth");
describe("phoneField", () => {
    it.each([
        "+14155552671",
        "+447911123456",
        "+2348012345678",
        "+33612345678",
        "+4916123456789",
    ])("accepts valid E.164: %s", (phone) => {
        expect(auth_1.phoneField.safeParse(phone).success).toBe(true);
    });
    it.each([
        "14155552671",
        "+0123456789",
        "+1",
        "+1234567890123456",
        "+1 415 555 2671",
        "+1-415-555-2671",
        "",
        "not-a-phone",
    ])("rejects invalid input: %s", (phone) => {
        expect(auth_1.phoneField.safeParse(phone).success).toBe(false);
    });
    it("rejects null and non-string types", () => {
        expect(auth_1.phoneField.safeParse(null).success).toBe(false);
        expect(auth_1.phoneField.safeParse(14155552671).success).toBe(false);
    });
    it("trims surrounding whitespace before validating", () => {
        expect(auth_1.phoneField.safeParse("  +14155552671  ").success).toBe(true);
    });
    it("returns a descriptive error message", () => {
        const result = auth_1.phoneField.safeParse("bad");
        expect(result.success).toBe(false);
        if (!result.success)
            expect(result.error.issues[0].message).toMatch(/E\.164/i);
    });
});
describe("phoneSchema", () => {
    it("parses a valid phone payload", () => {
        const result = auth_1.phoneSchema.safeParse({ phone: "+14155552671" });
        expect(result.success).toBe(true);
    });
    it("rejects an invalid phone value", () => {
        expect(auth_1.phoneSchema.safeParse({ phone: "14155552671" }).success).toBe(false);
    });
    it("rejects a missing phone field", () => {
        expect(auth_1.phoneSchema.safeParse({}).success).toBe(false);
    });
});
describe("signUpSchema", () => {
    const valid = {
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+14155552671",
        password: "s3cr3tpass",
    };
    it("accepts a fully valid payload", () => {
        expect(auth_1.signUpSchema.safeParse(valid).success).toBe(true);
    });
    it("rejects an invalid phone", () => {
        expect(auth_1.signUpSchema.safeParse({ ...valid, phone: "0800123456" }).success).toBe(false);
    });
    it("rejects a missing phone", () => {
        const { phone: _, ...rest } = valid;
        expect(auth_1.signUpSchema.safeParse(rest).success).toBe(false);
    });
    it("rejects a malformed email", () => {
        expect(auth_1.signUpSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    });
    it("rejects a password shorter than 8 characters", () => {
        expect(auth_1.signUpSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    });
});
describe("profileUpdateSchema", () => {
    it("accepts an update with a valid phone", () => {
        expect(auth_1.profileUpdateSchema.safeParse({ phone: "+447911123456" }).success).toBe(true);
    });
    it("accepts an update without a phone field", () => {
        expect(auth_1.profileUpdateSchema.safeParse({ fullName: "Grace Hopper" }).success).toBe(true);
    });
    it("rejects an invalid phone when provided", () => {
        expect(auth_1.profileUpdateSchema.safeParse({ phone: "07911123456" }).success).toBe(false);
    });
});
describe("isValidE164", () => {
    it("returns true for a valid E.164 string", () => {
        expect((0, auth_1.isValidE164)("+14155552671")).toBe(true);
    });
    it("returns false for an invalid string", () => {
        expect((0, auth_1.isValidE164)("14155552671")).toBe(false);
    });
    it("returns false for non-string values", () => {
        expect((0, auth_1.isValidE164)(null)).toBe(false);
        expect((0, auth_1.isValidE164)(42)).toBe(false);
    });
});
