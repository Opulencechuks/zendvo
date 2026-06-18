"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPostgresBusyError = isPostgresBusyError;
function isPostgresBusyError(error) {
    if (!error || typeof error !== "object")
        return false;
    const err = error;
    if (err.code === "40001" ||
        err.code === "40P01" ||
        err.code === "53300" ||
        err.message?.includes("deadlock detected") ||
        err.message?.includes("could not serialize access")) {
        return true;
    }
    return false;
}
