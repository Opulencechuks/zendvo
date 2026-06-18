"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = exports.getAccountTypeFromRole = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 10;
const getAccountTypeFromRole = (role) => {
    if (!role) {
        return null;
    }
    const normalized = role.toLowerCase();
    if (normalized === "sender") {
        return "Sender";
    }
    if (normalized === "recipient") {
        return "Recipient";
    }
    return null;
};
exports.getAccountTypeFromRole = getAccountTypeFromRole;
const hashPassword = async (password) => {
    return bcryptjs_1.default.hash(password, SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
