"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fees_1 = require("@/lib/fees");
describe("calculateProcessingFee", () => {
    describe("percentage-based fees", () => {
        const config = {
            type: "percentage",
            value: 2.5,
            minFee: 50,
            maxFee: 5000,
        };
        it("should calculate percentage fee correctly", () => {
            expect((0, fees_1.calculateProcessingFee)(10000, config)).toBe(250);
            expect((0, fees_1.calculateProcessingFee)(20000, config)).toBe(500);
            expect((0, fees_1.calculateProcessingFee)(100000, config)).toBe(2500);
        });
        it("should apply minimum fee when calculated fee is below minimum", () => {
            expect((0, fees_1.calculateProcessingFee)(1000, config)).toBe(50);
            expect((0, fees_1.calculateProcessingFee)(500, config)).toBe(50);
        });
        it("should apply maximum fee when calculated fee exceeds maximum", () => {
            expect((0, fees_1.calculateProcessingFee)(300000, config)).toBe(5000);
            expect((0, fees_1.calculateProcessingFee)(500000, config)).toBe(5000);
        });
    });
    describe("flat fees", () => {
        const config = {
            type: "flat",
            value: 100,
        };
        it("should return flat fee regardless of amount", () => {
            expect((0, fees_1.calculateProcessingFee)(1000, config)).toBe(100);
            expect((0, fees_1.calculateProcessingFee)(10000, config)).toBe(100);
            expect((0, fees_1.calculateProcessingFee)(100000, config)).toBe(100);
        });
    });
    describe("default configuration", () => {
        it("should use default config when none provided", () => {
            expect((0, fees_1.calculateProcessingFee)(10000)).toBe(250);
            expect((0, fees_1.calculateProcessingFee)(1000)).toBe(50);
            expect((0, fees_1.calculateProcessingFee)(300000)).toBe(5000);
        });
    });
    describe("edge cases", () => {
        it("should handle zero amount", () => {
            expect((0, fees_1.calculateProcessingFee)(0)).toBe(50);
        });
        it("should round to 2 decimal places", () => {
            const config = {
                type: "percentage",
                value: 2.75,
            };
            expect((0, fees_1.calculateProcessingFee)(1000, config)).toBe(27.5);
        });
    });
});
describe("calculateFee", () => {
    describe("2% platform fee calculation", () => {
        it("should calculate 2% fee correctly for whole numbers", () => {
            expect((0, fees_1.calculateFee)(100)).toBe(2);
            expect((0, fees_1.calculateFee)(1000)).toBe(20);
            expect((0, fees_1.calculateFee)(10000)).toBe(200);
        });
        it("should calculate 2% fee correctly for decimal amounts", () => {
            expect((0, fees_1.calculateFee)(100.5)).toBe(2.01);
            expect((0, fees_1.calculateFee)(99.99)).toBe(2);
            expect((0, fees_1.calculateFee)(123.45)).toBe(2.47);
        });
        it("should handle zero amount", () => {
            expect((0, fees_1.calculateFee)(0)).toBe(0);
        });
        it("should handle very small amounts", () => {
            expect((0, fees_1.calculateFee)(0.01)).toBe(0);
            expect((0, fees_1.calculateFee)(0.5)).toBe(0.01);
            expect((0, fees_1.calculateFee)(1)).toBe(0.02);
        });
        it("should handle large amounts", () => {
            expect((0, fees_1.calculateFee)(100000)).toBe(2000);
            expect((0, fees_1.calculateFee)(1000000)).toBe(20000);
        });
        it("should round to 2 decimal places to avoid floating-point errors", () => {
            // Test cases that might cause floating-point precision issues
            expect((0, fees_1.calculateFee)(0.1 + 0.2)).toBe(0.01); // 0.3 * 0.02 = 0.006, rounds to 0.01
            expect((0, fees_1.calculateFee)(33.33)).toBe(0.67); // 33.33 * 0.02 = 0.6666, rounds to 0.67
            expect((0, fees_1.calculateFee)(66.66)).toBe(1.33); // 66.66 * 0.02 = 1.3332, rounds to 1.33
        });
        it("should maintain precision for common gift amounts", () => {
            expect((0, fees_1.calculateFee)(50)).toBe(1);
            expect((0, fees_1.calculateFee)(75)).toBe(1.5);
            expect((0, fees_1.calculateFee)(150)).toBe(3);
            expect((0, fees_1.calculateFee)(250)).toBe(5);
            expect((0, fees_1.calculateFee)(500)).toBe(10);
            expect((0, fees_1.calculateFee)(1000)).toBe(20);
        });
    });
});
