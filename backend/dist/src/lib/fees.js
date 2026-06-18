"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProcessingFee = calculateProcessingFee;
exports.calculateFee = calculateFee;
const DEFAULT_FEE_CONFIG = {
    type: "percentage",
    value: 2.5,
    minFee: 50,
    maxFee: 5000,
};
function calculateProcessingFee(amount, config = DEFAULT_FEE_CONFIG) {
    let fee;
    if (config.type === "flat") {
        fee = config.value;
    }
    else {
        fee = (amount * config.value) / 100;
    }
    if (config.minFee !== undefined && fee < config.minFee) {
        fee = config.minFee;
    }
    if (config.maxFee !== undefined && fee > config.maxFee) {
        fee = config.maxFee;
    }
    return Math.round(fee * 100) / 100;
}
function calculateFee(amount) {
    const fee = (amount * 2) / 100;
    return Math.round(fee * 100) / 100;
}
