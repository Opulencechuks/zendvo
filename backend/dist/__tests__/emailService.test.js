"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailService_1 = require("../src/server/services/emailService");
const nodemailer_1 = __importDefault(require("nodemailer"));
jest.mock("nodemailer", () => {
    const sendMailMock = jest.fn();
    const createTransportMock = jest.fn().mockReturnValue({
        sendMail: sendMailMock,
    });
    return {
        createTransport: createTransportMock,
    };
});
describe("Email Service", () => {
    let sendMailMock;
    const originalEnv = process.env;
    beforeAll(() => {
        const createTransport = nodemailer_1.default.createTransport;
        const transportObj = createTransport.mock.results[0].value;
        sendMailMock = transportObj.sendMail;
    });
    beforeEach(() => {
        if (sendMailMock)
            sendMailMock.mockClear();
        process.env = { ...originalEnv, NODE_ENV: "production" };
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    it("should send an email successfully", async () => {
        const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        sendMailMock.mockResolvedValue({ messageId: "msg-123" });
        const result = await (0, emailService_1.sendVerificationEmail)("test@example.com", "123456", "TestUser");
        expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
            to: "test@example.com",
            subject: "Verify Your Email - Zendvo",
            html: expect.stringContaining("123456"),
        }));
        expect(result.success).toBe(true);
        logSpy.mockRestore();
    });
    it("should handle email sending failure", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        sendMailMock.mockRejectedValue(new Error("SMTP Error"));
        const result = await (0, emailService_1.sendVerificationEmail)("test@example.com", "123456");
        expect(result.detail).toBeDefined();
        expect(result.detail).toBe("SMTP Error");
        errorSpy.mockRestore();
    });
    it("should just log in development mode", async () => {
        process.env = { ...originalEnv, NODE_ENV: "development" };
        const consoleSpy = jest.spyOn(console, "log").mockImplementation();
        const result = await (0, emailService_1.sendVerificationEmail)("test@example.com", "123456");
        expect(sendMailMock).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.messageId).toBe("dev-mode");
        consoleSpy.mockRestore();
    });
});
