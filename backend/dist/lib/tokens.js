"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyAccessTokenDetailed = verifyAccessTokenDetailed;
exports.verifyRefreshToken = verifyRefreshToken;
exports.generateShareLinkToken = generateShareLinkToken;
const jose = __importStar(require("jose"));
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "fallback_access_secret";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const encodedAccessTokenSecret = new TextEncoder().encode(ACCESS_TOKEN_SECRET);
const encodedRefreshTokenSecret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);
async function generateAccessToken(payload) {
    return await new jose.SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(encodedAccessTokenSecret);
}
async function generateRefreshToken(payload) {
    return await new jose.SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setJti(crypto.randomUUID())
        .setIssuedAt()
        .setExpirationTime(REFRESH_TOKEN_EXPIRY)
        .sign(encodedRefreshTokenSecret);
}
async function verifyAccessToken(token) {
    try {
        const { payload } = await jose.jwtVerify(token, encodedAccessTokenSecret);
        return payload;
    }
    catch (error) {
        return null;
    }
}
async function verifyAccessTokenDetailed(token) {
    try {
        const { payload } = await jose.jwtVerify(token, encodedAccessTokenSecret);
        return { valid: true, payload: payload };
    }
    catch (error) {
        const typedError = error;
        return {
            valid: false,
            expired: typedError.code === "ERR_JWT_EXPIRED",
        };
    }
}
async function verifyRefreshToken(token) {
    try {
        const { payload } = await jose.jwtVerify(token, encodedRefreshTokenSecret);
        return payload;
    }
    catch (error) {
        return null;
    }
}
function generateShareLinkToken() {
    return crypto.randomUUID();
}
