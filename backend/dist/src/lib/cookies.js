"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TOKEN_MAX_AGE = exports.ACCESS_TOKEN_MAX_AGE = exports.COOKIE_OPTIONS = exports.REFRESH_TOKEN_COOKIE = exports.ACCESS_TOKEN_COOKIE = void 0;
exports.ACCESS_TOKEN_COOKIE = "access_token";
exports.REFRESH_TOKEN_COOKIE = "refresh_token";
exports.COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};
exports.ACCESS_TOKEN_MAX_AGE = 15 * 60;
exports.REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
