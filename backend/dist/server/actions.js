"use strict";
"use server";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGift = createGift;
exports.claimGift = claimGift;
const cache_1 = require("next/cache");
async function createGift(formData) {
    console.log("Creating gift...");
    (0, cache_1.revalidatePath)("/dashboard");
    return { success: true };
}
async function claimGift(giftId) {
    console.log(`Claiming gift: ${giftId}`);
    (0, cache_1.revalidatePath)("/dashboard");
    return { success: true };
}
