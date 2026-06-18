"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGiftQRCode = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const generateGiftQRCode = async (giftUrl) => {
    try {
        return await qrcode_1.default.toDataURL(giftUrl);
    }
    catch (err) {
        console.error("QR Code generation failed", err);
        return null;
    }
};
exports.generateGiftQRCode = generateGiftQRCode;
